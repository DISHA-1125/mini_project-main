"use client";

import { DashboardHeader, StatCard } from "@/components/layout/dashboard-shell";
import { LiveMap } from "@/components/map/live-map";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useItemsRealtime, useNotifications } from "@/hooks/use-realtime";
import type { DashboardStats, ItemWithLocation, SessionUser } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";
import { AlertTriangle, BarChart3, CheckCircle, Flag, Package, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Claim = {
  id: string;
  status: string;
  answer: string | null;
  item: { title: string; id: string };
  claimant: { name: string; email: string };
  createdAt: string;
};

type Props = {
  user: SessionUser;
  items: ItemWithLocation[];
  claims: Claim[];
};

export function AdminDashboard({ user, items: initialItems, claims: initialClaims }: Props) {
  const { items } = useItemsRealtime(initialItems);
  const { notifications } = useNotifications(user.id);
  const [claims, setClaims] = useState(initialClaims);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => setStats(d.stats));
  }, [items, claims]);

  const updateItemStatus = async (id: string, status: string) => {
    await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    toast.success(`Item marked as ${status}`);
  };

  const reviewClaim = async (claimId: string, status: string) => {
    const res = await fetch("/api/claims", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimId, status }),
    });
    if (res.ok) {
      const { claim } = await res.json();
      setClaims((prev) => prev.map((c) => (c.id === claimId ? claim : c)));
      toast.success(`Claim ${status.toLowerCase()}`);
    }
  };

  const flagged = items.filter((i) => ["FLAGGED", "DISPUTED"].includes(i.status));

  return (
    <div className="min-h-screen bg-radar-950">
      <DashboardHeader
        user={user}
        notifications={notifications}
        title="Admin Dashboard"
        subtitle="Monitor listings, verify claims, and view platform analytics"
      />

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {stats && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard label="Total Items" value={stats.totalItems} icon={Package} />
            <StatCard label="Active" value={stats.activeItems} icon={BarChart3} accent="emerald" />
            <StatCard label="Matched" value={stats.matchedItems} icon={CheckCircle} accent="blue" />
            <StatCard label="Flagged" value={stats.flaggedItems} icon={Flag} accent="red" />
            <StatCard label="Pending Claims" value={stats.pendingClaims} icon={AlertTriangle} accent="primary" />
            <StatCard label="Handovers Today" value={stats.handoversToday} icon={Users} accent="emerald" />
          </div>
        )}

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview Map</TabsTrigger>
            <TabsTrigger value="listings">All Listings</TabsTrigger>
            <TabsTrigger value="claims">Claims ({claims.filter((c) => c.status === "PENDING").length})</TabsTrigger>
            <TabsTrigger value="flagged">Flagged ({flagged.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <LiveMap items={items} className="w-full h-[500px] rounded-xl border border-slate-700" />
          </TabsContent>

          <TabsContent value="listings">
            <div className="glass-panel rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="text-left p-4">Title</th>
                    <th className="text-left p-4">Type</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Reporter</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-800 hover:bg-radar-800/50">
                      <td className="p-4 text-slate-200">{item.title}</td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          item.type === "LOST" ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
                        }`}>{item.type}</span>
                      </td>
                      <td className="p-4 text-beacon-400">{item.status}</td>
                      <td className="p-4 text-slate-400">{item.reportedBy.name}</td>
                      <td className="p-4 flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => updateItemStatus(item.id, "RESOLVED")}>Resolve</Button>
                        <Button size="sm" variant="destructive" onClick={() => updateItemStatus(item.id, "FLAGGED")}>Flag</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="claims">
            <div className="space-y-3">
              {claims.map((claim) => (
                <div key={claim.id} className="glass-panel rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-200">{claim.item.title}</p>
                    <p className="text-sm text-slate-400">
                      Claimant: {claim.claimant.name} ({claim.claimant.email})
                    </p>
                    {claim.answer && <p className="text-xs text-slate-500 mt-1">Answer: {claim.answer}</p>}
                    <p className="text-xs text-slate-500">{formatRelativeTime(claim.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      claim.status === "PENDING" ? "bg-beacon-500/20 text-beacon-400" :
                      claim.status === "VERIFIED" ? "bg-emerald-500/20 text-emerald-400" :
                      "bg-red-500/20 text-red-400"
                    }`}>{claim.status}</span>
                    {claim.status === "PENDING" && (
                      <>
                        <Button size="sm" variant="success" onClick={() => reviewClaim(claim.id, "VERIFIED")}>Verify</Button>
                        <Button size="sm" variant="destructive" onClick={() => reviewClaim(claim.id, "REJECTED")}>Reject</Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="flagged">
            <div className="space-y-3">
              {flagged.length === 0 ? (
                <p className="text-slate-500 text-center py-12">No flagged items</p>
              ) : (
                flagged.map((item) => (
                  <div key={item.id} className="glass-panel rounded-xl p-4 border border-red-500/30 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-red-400">{item.title}</p>
                      <p className="text-sm text-slate-400">{item.description}</p>
                    </div>
                    <Button size="sm" onClick={() => updateItemStatus(item.id, "ACTIVE")}>Clear Flag</Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
