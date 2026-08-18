import { getSession } from "@/lib/auth";
import { hashAnswer } from "@/lib/claims";
import { prisma } from "@/lib/prisma";
import { emitItemsRefresh, emitNotification } from "@/lib/socket-server";
import { NextResponse } from "next/server";

export async function GET() {
  const items = await prisma.item.findMany({
    include: {
      location: true,
      reportedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const item = await prisma.item.create({
    data: {
      title: body.title,
      description: body.description,
      category: body.category,
      type: body.type,
      verificationQ: body.verificationQ,
      verificationA: body.verificationA ? hashAnswer(body.verificationA) : null,
      reportedById: session.id,
      location: {
        create: {
          latitude: body.latitude,
          longitude: body.longitude,
          address: body.address,
        },
      },
    },
    include: { location: true, reportedBy: { select: { id: true, name: true } } },
  });

  emitItemsRefresh();
  return NextResponse.json({ item }, { status: 201 });
}
