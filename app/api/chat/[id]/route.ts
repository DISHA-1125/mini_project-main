import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitNewMessage, emitNotification } from "@/lib/socket-server";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    include: { sender: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ messages });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // content can be a plain string or a JSON-encoded special message
  // Special message types are prefixed: __LOC__:{...}  __OTP__:{...}
  const content: string = body.content ?? "";
  if (!content.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: { content, senderId: session.id, conversationId: id },
    include: { sender: { select: { id: true, name: true } } },
  });

  // Emit the full message object (including sender.id) so the client can
  // de-duplicate the optimistic entry without a full re-fetch.
  emitNewMessage(id, message);

  // Push a notification to every other participant
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { participants: true, item: true },
  });

  if (conversation) {
    // Build a human-readable notification body depending on message type
    let notificationBody: string;
    if (content.startsWith("__LOC__:")) {
      notificationBody = `${session.name} shared a meetup location 📍`;
    } else if (content.startsWith("__OTP__:")) {
      notificationBody = `${session.name} shared a handover OTP 🔐`;
    } else {
      notificationBody = `${session.name}: ${content.slice(0, 60)}`;
    }

    for (const p of conversation.participants) {
      if (p.id !== session.id) {
        const notification = await prisma.notification.create({
          data: {
            userId: p.id,
            type: "MESSAGE",
            title: `New message — ${conversation.item.title}`,
            body: notificationBody,
          },
        });
        emitNotification(p.id, notification);
      }
    }
  }

  return NextResponse.json({ message }, { status: 201 });
}
