import { getSession } from "@/lib/auth";
import { filterByRadius } from "@/lib/geo";
import { prisma } from "@/lib/prisma";
import { emitItemsRefresh, emitNotification } from "@/lib/socket-server";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const item = await prisma.item.update({
    where: { id },
    data: body,
  });

  if (body.latitude && body.longitude) {
    await prisma.location.upsert({
      where: { itemId: id },
      create: { itemId: id, latitude: body.latitude, longitude: body.longitude },
      update: { latitude: body.latitude, longitude: body.longitude },
    });
  }

  emitItemsRefresh();
  return NextResponse.json({ item });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      location: true,
      reportedBy: { select: { id: true, name: true, email: true } },
      claims: { include: { claimant: { select: { id: true, name: true } } } },
    },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item });
}
