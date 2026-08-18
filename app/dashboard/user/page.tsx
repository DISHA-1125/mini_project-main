import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserDashboard } from "./user-dashboard";

export default async function UserDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "USER") redirect(`/dashboard/${session.role.toLowerCase()}`);

  const items = await prisma.item.findMany({
    include: {
      location: true,
      reportedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const myItems = items.filter((i) => i.reportedById === session.id);
  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { id: session.id } } },
    include: {
      item: true,
      participants: { select: { id: true, name: true } },
    },
  });

  return (
    <UserDashboard
      user={session}
      initialItems={JSON.parse(JSON.stringify(items))}
      myItems={JSON.parse(JSON.stringify(myItems))}
      conversations={JSON.parse(JSON.stringify(conversations))}
    />
  );
}
