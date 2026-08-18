import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminDashboard } from "./admin-dashboard";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect(`/dashboard/${session.role.toLowerCase()}`);

  const [items, claims] = await Promise.all([
    prisma.item.findMany({
      include: {
        location: true,
        reportedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.claimAudit.findMany({
      include: {
        item: true,
        claimant: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <AdminDashboard
      user={session}
      items={JSON.parse(JSON.stringify(items))}
      claims={JSON.parse(JSON.stringify(claims))}
    />
  );
}
