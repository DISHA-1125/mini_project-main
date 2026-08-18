"use client";

import { DashboardHeader, StatCard } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotifications } from "@/hooks/use-realtime";
import type { ItemWithLocation, SessionUser } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";
import { CheckCircle, KeyRound, Package, QrCode, Shield } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Handover = {
  id: string;
  otpCode: string;
  qrToken: string;
  verified: boolean;
  notes: string | null;
  createdAt: string;
  collectedAt: string | null;
  item: { title: string; id: string };
  security: { name: string };
  collector: { name: string } | null;
};

type Props = {
  user: SessionUser;
  items: ItemWithLocation[];
  handovers: Handover[];
};

export function SecurityDashboard({ user, items, handovers: initialHandovers }: Props) {
  const { notifications } = useNotifications(user.id);
  const [handovers, setHandovers] = useState(initialHandovers);
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [lastHandover, setLastHandover] = useState<{ otp: string; qr: string; qrDataUrl: string } | null>(null);
  const [verifyOtp, setVerifyOtp] = useState("");
  const [verifyQr, setVerifyQr] = useState("");

  const createHandover = async () => {
    if (!selectedItem) return toast.error("Select an item first");
    const res = await fetch("/api/handovers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: selectedItem, notes }),
    });
    if (res.ok) {
      const data = await res.json();
      const qrDataUrl = await QRCode.toDataURL(data.qrToken, { width: 200, margin: 2, color: { dark: "#f59e0b", light: "#0f172a" } });
      setLastHandover({ otp: data.otpCode, qr: data.qrToken, qrDataUrl });
      setHandovers((prev) => [data.handover, ...prev]);
      toast.success("Handover created! Share OTP or QR with collector.");
      setNotes("");
    }
  };

  const verifyCollection = async (handoverId: string, otpCode?: string, qrToken?: string) => {
    const res = await fetch("/api/handovers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handoverId, otpCode, qrToken }),
    });
    if (res.ok) {
      toast.success("Collection verified!");
      setHandovers((prev) =>
        prev.map((h) => (h.id === handoverId ? { ...h, verified: true, collectedAt: new Date().toISOString() } : h))
      );
      setVerifyOtp("");
      setVerifyQr("");
    } else {
      toast.error("Invalid OTP or QR code");
    }
  };

  const pendingCount = handovers.filter((h) => !h.verified).length;
  const verifiedToday = handovers.filter((h) => h.verified && h.collectedAt).length;

  return (
    <div className="min-h-screen bg-radar-950">
      <DashboardHeader
        user={user}
        notifications={notifications}
        title="Security Dashboard"
        subtitle="Log handovers and verify item collection via OTP & QR codes"
      />

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard label="Ready for Handover" value={items.length} icon={Package} accent="primary" />
          <StatCard label="Pending Verification" value={pendingCount} icon={KeyRound} accent="blue" />
          <StatCard label="Verified Collections" value={verifiedToday} icon={CheckCircle} accent="emerald" />
        </div>

        <Tabs defaultValue="create">
          <TabsList>
            <TabsTrigger value="create">Create Handover</TabsTrigger>
            <TabsTrigger value="verify">Verify Collection</TabsTrigger>
            <TabsTrigger value="history">Handover Log</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="glass-panel rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-beacon-400 flex items-center gap-2">
                  <Shield className="w-5 h-5" /> Log New Handover
                </h3>
                <div className="space-y-2">
                  <Label>Select Item</Label>
                  <select
                    className="w-full h-10 rounded-lg border border-slate-600 bg-radar-800 px-3 text-sm text-slate-100"
                    value={selectedItem}
                    onChange={(e) => setSelectedItem(e.target.value)}
                  >
                    <option value="">Choose matched/claimed item...</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title} ({item.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Desk location, locker number..." />
                </div>
                <Button onClick={createHandover} className="w-full">
                  Generate OTP &amp; QR Code
                </Button>
              </div>

              {lastHandover && (
                <div className="glass-panel rounded-xl p-6 text-center space-y-4 beacon-glow border-beacon-500/30">
                  <h3 className="text-lg font-semibold text-beacon-400">Handover Credentials</h3>
                  <div className="bg-radar-800 rounded-xl p-6">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">One-Time Password</p>
                    <p className="text-4xl font-mono font-bold text-beacon-400 tracking-widest mt-2">{lastHandover.otp}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-3 flex items-center justify-center gap-1">
                      <QrCode className="w-4 h-4" /> Scan QR Code
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={lastHandover.qrDataUrl} alt="QR Code" className="mx-auto rounded-lg" />
                    <p className="text-xs text-slate-500 mt-2 font-mono break-all">{lastHandover.qr}</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="verify">
            <div className="glass-panel rounded-xl p-6 max-w-md mx-auto space-y-4">
              <h3 className="text-lg font-semibold text-beacon-400">Verify Item Collection</h3>
              <div className="space-y-2">
                <Label>Enter OTP Code</Label>
                <Input
                  value={verifyOtp}
                  onChange={(e) => setVerifyOtp(e.target.value)}
                  placeholder="6-digit OTP"
                  className="font-mono text-center text-lg tracking-widest"
                />
              </div>
              <div className="text-center text-slate-500 text-sm">— or —</div>
              <div className="space-y-2">
                <Label>Scan / Enter QR Token</Label>
                <Input
                  value={verifyQr}
                  onChange={(e) => setVerifyQr(e.target.value)}
                  placeholder="QR token"
                  className="font-mono"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  const handover = handovers.find(
                    (h) => h.otpCode === verifyOtp || h.qrToken === verifyQr
                  );
                  if (handover) verifyCollection(handover.id, verifyOtp || undefined, verifyQr || undefined);
                  else toast.error("No matching handover found");
                }}
              >
                Verify Collection
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="space-y-3">
              {handovers.length === 0 ? (
                <p className="text-slate-500 text-center py-12">No handovers logged yet</p>
              ) : (
                handovers.map((h) => (
                  <div key={h.id} className="glass-panel rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-200">{h.item.title}</p>
                      <p className="text-sm text-slate-400">
                        Officer: {h.security.name}
                        {h.collector && ` · Collected by: ${h.collector.name}`}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{formatRelativeTime(h.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-beacon-400">{h.otpCode}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        h.verified ? "bg-emerald-500/20 text-emerald-400" : "bg-beacon-500/20 text-beacon-400"
                      }`}>
                        {h.verified ? "VERIFIED" : "PENDING"}
                      </span>
                    </div>
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
