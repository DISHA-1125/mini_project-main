import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalItems, activeItems, matchedItems, flaggedItems, pendingClaims, handoversToday] =
    await Promise.all([
      prisma.item.count(),
      prisma.item.count({ where: { status: "ACTIVE" } }),
      prisma.item.count({ where: { status: "MATCHED" } }),
      prisma.item.count({ where: { status: { in: ["FLAGGED", "DISPUTED"] } } }),
      prisma.claimAudit.count({ where: { status: "PENDING" } }),
      prisma.handover.count({ where: { createdAt: { gte: today } } }),
    ]);

  return NextResponse.json({
    stats: { totalItems, activeItems, matchedItems, flaggedItems, pendingClaims, handoversToday },
  });
}
