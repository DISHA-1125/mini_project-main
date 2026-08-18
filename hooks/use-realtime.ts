"use client";

import { getSocket } from "@/lib/socket-client";
import type { ItemWithLocation } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

export function useItemsRealtime(initialItems: ItemWithLocation[] = []) {
  const [items, setItems] = useState<ItemWithLocation[]>(initialItems);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/items");
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
    }
  }, []);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    const socket = getSocket();
    socket.on("items:refresh", refresh);
    socket.on("location:updated", refresh);
    return () => {
      socket.off("items:refresh", refresh);
      socket.off("location:updated", refresh);
    };
  }, [refresh]);

  return { items, refresh, setItems };
}

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<
    { id: string; title: string; body: string; read: boolean; createdAt: string }[]
  >([]);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications);
    }
  }, []);

  useEffect(() => {
    refresh();
    const socket = getSocket();
    socket.emit("join:user", userId);
    socket.on("notification:new", refresh);
    return () => {
      socket.off("notification:new", refresh);
    };
  }, [userId, refresh]);

  return { notifications, refresh };
}

// Canonical chat message shape — used by ChatWindow and the socket payload
export type ChatMessage = {
  id: string;
  content: string;
  sender: { id: string; name: string };
  createdAt: string;
};

export function useChat(conversationId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const refresh = useCallback(async () => {
    if (!conversationId) return;
    const res = await fetch(`/api/chat/${conversationId}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
    }
  }, [conversationId]);

  useEffect(() => {
    // Reset messages immediately when switching conversations
    setMessages([]);
    refresh();
    if (!conversationId) return;

    const socket = getSocket();
    socket.emit("join:conversation", conversationId);

    // Append the new message directly from the socket payload (no extra round-trip)
    const handleNewMessage = (msg: ChatMessage) => {
      setMessages((prev) => {
        // de-dupe: if the message is already present (sent by us optimistically), replace it
        const exists = prev.some((m) => m.id === msg.id);
        if (exists) return prev.map((m) => (m.id === msg.id ? msg : m));
        return [...prev, msg];
      });
    };

    socket.on("message:new", handleNewMessage);
    return () => {
      socket.off("message:new", handleNewMessage);
    };
  }, [conversationId, refresh]);

  /**
   * sendMessage — posts to the API and does an optimistic local append.
   * Returns the saved message so callers can discard the optimistic entry.
   */
  const sendMessage = useCallback(
    async (content: string, senderId: string, senderName: string): Promise<ChatMessage | null> => {
      if (!conversationId) return null;

      // Optimistic entry with a temp id
      const tempId = `optimistic-${Date.now()}`;
      const optimistic: ChatMessage = {
        id: tempId,
        content,
        sender: { id: senderId, name: senderName },
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);

      const res = await fetch(`/api/chat/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        const data = await res.json();
        const saved: ChatMessage = data.message;
        // Replace the optimistic entry with the real one
        setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
        return saved;
      }

      // On failure, remove the optimistic entry
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      return null;
    },
    [conversationId]
  );

  return { messages, sendMessage, refresh };
}
