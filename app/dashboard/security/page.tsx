import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SecurityDashboard } from "./security-dashboard";

export default async function SecurityDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "SECURITY") redirect(`/dashboard/${session.role.toLowerCase()}`);

  const [items, handovers] = await Promise.all([
    prisma.item.findMany({
      where: { status: { in: ["MATCHED", "CLAIMED"] } },
      include: {
        location: true,
        reportedBy: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.handover.findMany({
      include: {
        item: true,
        security: { select: { name: true } },
        collector: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <SecurityDashboard
      user={session}
      items={JSON.parse(JSON.stringify(items))}
      handovers={JSON.parse(JSON.stringify(handovers))}
    />
  );
}
