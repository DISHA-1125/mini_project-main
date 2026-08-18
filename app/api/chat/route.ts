import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId, participantId } = await req.json();

  const existing = await prisma.conversation.findFirst({
    where: {
      itemId,
      participants: { every: { id: { in: [session.id, participantId] } } },
    },
  });

  if (existing) return NextResponse.json({ conversation: existing });

  const conversation = await prisma.conversation.create({
    data: {
      itemId,
      participants: { connect: [{ id: session.id }, { id: participantId }] },
    },
  });

  return NextResponse.json({ conversation }, { status: 201 });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { id: session.id } } },
    include: {
      item: true,
      participants: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ conversations });
}
