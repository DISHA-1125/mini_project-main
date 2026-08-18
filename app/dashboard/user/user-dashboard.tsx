"use client";

import { ReportItemModal } from "@/components/items/report-item-modal";
import { ChatWindow } from "@/components/ChatWindow";
import { DashboardHeader } from "@/components/layout/dashboard-shell";
import { LiveMap } from "@/components/map/live-map";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useItemsRealtime, useNotifications } from "@/hooks/use-realtime";
import type { ItemWithLocation, SessionUser } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";
import { Map, MessageSquare, Package } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  user: SessionUser;
  initialItems: ItemWithLocation[];
  myItems: ItemWithLocation[];
  conversations: {
    id: string;
    item: { id: string; title: string };
    participants: { id: string; name: string }[];
  }[];
};

export function UserDashboard({ user, initialItems, myItems, conversations }: Props) {
  const { items } = useItemsRealtime(initialItems);
  const { notifications } = useNotifications(user.id);
  const [selectedItem, setSelectedItem] = useState<ItemWithLocation | null>(null);
  const [activeConversation, setActiveConversation] = useState<string | null>(
    conversations[0]?.id ?? null
  );
  const [claimAnswer, setClaimAnswer] = useState("");

  // Derive peer name and item title for the active conversation
  const activeMeta = conversations.find((c) => c.id === activeConversation);
  const peerName =
    activeMeta?.participants.find((p) => p.id !== user.id)?.name ?? "Unknown";
  const itemTitle = activeMeta?.item.title ?? "";

  const handleClaim = async (itemId: string) => {
    const res = await fetch("/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, answer: claimAnswer }),
    });
    const data = await res.json();
    if (data.status === "VERIFIED") toast.success("Claim verified! You can now chat.");
    else if (data.status === "REJECTED") toast.error("Verification failed.");
    else toast.info("Claim submitted for review.");
    setClaimAnswer("");
  };

  const startChat = async (item: ItemWithLocation) => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id, participantId: item.reportedBy.id }),
    });
    const data = await res.json();
    setActiveConversation(data.conversation.id);
  };

  return (
    <div className="min-h-screen bg-radar-950">
      <DashboardHeader
        user={user}
        notifications={notifications}
        title="Finder Dashboard"
        subtitle="Report, track, and recover lost items in real time"
      />

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Tabs defaultValue="map" className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="map"><Map className="w-4 h-4 mr-1" /> Live Map</TabsTrigger>
                <TabsTrigger value="listings"><Package className="w-4 h-4 mr-1" /> All Listings</TabsTrigger>
                <TabsTrigger value="mine"><Package className="w-4 h-4 mr-1" /> My Items</TabsTrigger>
                <TabsTrigger value="chat">
                  <MessageSquare className="w-4 h-4 mr-1" /> Chat
                  {conversations.length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-500/20 text-primary-300 border border-primary-500/30">
                      {conversations.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
              <ReportItemModal />
            </div>

            {/* ── Live Map ── */}
            <TabsContent value="map">
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <LiveMap
                    items={items}
                    onItemClick={setSelectedItem}
                    className="w-full h-[500px] rounded-xl border border-slate-700"
                  />
                </div>
                <div className="space-y-4">
                  {selectedItem ? (
                    <div className="glass-panel rounded-xl p-5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        selectedItem.type === "LOST"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        {selectedItem.type}
                      </span>
                      <h3 className="text-lg font-semibold text-slate-100 mt-2">
                        {selectedItem.title}
                      </h3>
                      <p className="text-sm text-slate-400 mt-1">{selectedItem.description}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        By {selectedItem.reportedBy.name} ·{" "}
                        {formatRelativeTime(selectedItem.createdAt)}
                      </p>
                      {selectedItem.reportedBy.id !== user.id && (
                        <div className="mt-4 space-y-2">
                          <input
                            className="w-full h-9 rounded-lg border border-slate-600 bg-radar-800 px-3 text-sm"
                            placeholder="Verification answer (if required)"
                            value={claimAnswer}
                            onChange={(e) => setClaimAnswer(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleClaim(selectedItem.id)}>
                              Claim Item
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => startChat(selectedItem)}
                            >
                              Chat
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="glass-panel rounded-xl p-8 text-center text-slate-500">
                      <Map className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Click a marker to view item details</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ── All Listings ── */}
            <TabsContent value="listings">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="glass-panel rounded-xl p-4 hover:border-beacon-500/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        item.type === "LOST"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        {item.type}
                      </span>
                      <span className="text-xs text-slate-500">{item.category}</span>
                    </div>
                    <h3 className="font-semibold text-slate-100 mt-2">{item.title}</h3>
                    <p className="text-sm text-slate-400 mt-1 line-clamp-2">{item.description}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      {formatRelativeTime(item.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* ── My Items ── */}
            <TabsContent value="mine">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myItems.length === 0 ? (
                  <p className="text-slate-500 col-span-full text-center py-12">
                    No items reported yet. Click &quot;Report Item&quot; to get started.
                  </p>
                ) : (
                  myItems.map((item) => (
                    <div key={item.id} className="glass-panel rounded-xl p-4">
                      <h3 className="font-semibold text-slate-100">{item.title}</h3>
                      <p className="text-xs text-beacon-400 mt-1">{item.status}</p>
                      <p className="text-sm text-slate-400 mt-2">{item.description}</p>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* ── Chat ── */}
            <TabsContent value="chat">
              <div className="grid lg:grid-cols-3 gap-6 items-start">
                {/* Conversation list */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-surface-500 px-1 mb-3">
                    Conversations
                  </p>
                  {conversations.length === 0 ? (
                    <p className="text-sm text-slate-500 p-4">No conversations yet.</p>
                  ) : (
                    conversations.map((c) => {
                      const peer = c.participants.find((p) => p.id !== user.id);
                      const isActive = activeConversation === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => setActiveConversation(c.id)}
                          className={`w-full text-left rounded-xl p-3.5 border transition-all smooth-transition ${
                            isActive
                              ? "bg-primary-500/10 border-primary-500/40 shadow-lg shadow-primary-500/10"
                              : "glass-panel hover:border-surface-500/50 hover:bg-surface-800/40"
                          }`}
                        >
                          {/* Avatar + name row */}
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                              {peer?.name.charAt(0).toUpperCase() ?? "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-surface-100 truncate">
                                {peer?.name ?? "Unknown"}
                              </p>
                              <p className="text-xs text-surface-500 truncate">
                                {c.item.title}
                              </p>
                            </div>
                            {isActive && (
                              <span className="ml-auto w-2 h-2 rounded-full bg-primary-400 flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Chat window */}
                <div className="lg:col-span-2">
                  {activeConversation ? (
                    <ChatWindow
                      conversationId={activeConversation}
                      currentUser={user}
                      peerName={peerName}
                      itemTitle={itemTitle}
                      className="h-[600px]"
                    />
                  ) : (
                    <div className="glass-panel rounded-2xl p-12 text-center text-slate-500 flex flex-col items-center gap-3">
                      <MessageSquare className="w-10 h-10 opacity-30" />
                      <p className="text-sm font-medium">Select a conversation to start chatting</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
