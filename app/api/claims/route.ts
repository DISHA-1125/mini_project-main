import { getSession } from "@/lib/auth";
import { hashAnswer } from "@/lib/claims";
import { prisma } from "@/lib/prisma";
import { emitNotification } from "@/lib/socket-server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId, answer } = await req.json();
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  let status: "PENDING" | "VERIFIED" | "REJECTED" = "PENDING";
  if (item.verificationA && answer) {
    status = hashAnswer(answer) === item.verificationA ? "VERIFIED" : "REJECTED";
  }

  const claim = await prisma.claimAudit.create({
    data: {
      itemId,
      claimantId: session.id,
      answer,
      status,
    },
  });

  if (status === "VERIFIED") {
    await prisma.item.update({ where: { id: itemId }, data: { status: "MATCHED" } });
    const notification = await prisma.notification.create({
      data: {
        userId: item.reportedById,
        type: "CLAIM",
        title: "Claim verified!",
        body: `${session.name} verified a claim on "${item.title}"`,
      },
    });
    emitNotification(item.reportedById, notification);
  }

  return NextResponse.json({ claim, status });
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const claims = await prisma.claimAudit.findMany({
    include: {
      item: true,
      claimant: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ claims });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { claimId, status, notes } = await req.json();
  const claim = await prisma.claimAudit.update({
    where: { id: claimId },
    data: { status, notes, verifiedBy: session.id },
    include: { item: true },
  });

  if (status === "VERIFIED") {
    await prisma.item.update({ where: { id: claim.itemId }, data: { status: "MATCHED" } });
  }

  return NextResponse.json({ claim });
}
