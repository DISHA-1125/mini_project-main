import { getSession } from "@/lib/auth";
import { generateOTP, generateQRToken } from "@/lib/claims";
import { prisma } from "@/lib/prisma";
import { emitNotification } from "@/lib/socket-server";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  if (!session || !["SECURITY", "ADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const handovers = await prisma.handover.findMany({
    include: {
      item: { include: { location: true } },
      security: { select: { name: true } },
      collector: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ handovers });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "SECURITY") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { itemId, notes } = await req.json();
  const otpCode = generateOTP();
  const qrToken = generateQRToken();

  const handover = await prisma.handover.create({
    data: {
      itemId,
      securityId: session.id,
      otpCode,
      qrToken,
      notes,
    },
    include: { item: true },
  });

  await prisma.item.update({ where: { id: itemId }, data: { status: "CLAIMED" } });

  const owner = await prisma.item.findUnique({
    where: { id: itemId },
    select: { reportedById: true, title: true },
  });

  if (owner) {
    const notification = await prisma.notification.create({
      data: {
        userId: owner.reportedById,
        type: "HANDOVER",
        title: "Item ready for collection",
        body: `"${owner.title}" is ready. OTP: ${otpCode}`,
        metadata: JSON.stringify({ handoverId: handover.id, qrToken }),
      },
    });
    emitNotification(owner.reportedById, notification);
  }

  return NextResponse.json({ handover, otpCode, qrToken }, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { handoverId, otpCode, qrToken } = await req.json();

  const handover = await prisma.handover.findFirst({
    where: {
      id: handoverId,
      OR: [{ otpCode }, { qrToken }],
    },
    include: { item: true },
  });

  if (!handover) {
    return NextResponse.json({ error: "Invalid OTP or QR code" }, { status: 400 });
  }

  const updated = await prisma.handover.update({
    where: { id: handover.id },
    data: {
      verified: true,
      collectedAt: new Date(),
      collectorId: session.id,
    },
  });

  await prisma.item.update({
    where: { id: handover.itemId },
    data: { status: "RESOLVED" },
  });

  return NextResponse.json({ handover: updated });
}
