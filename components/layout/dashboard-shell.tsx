"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SessionUser } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";
import { Bell, LogOut, Radar, Shield, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  user: SessionUser;
  notifications?: { id: string; title: string; body: string; read: boolean; createdAt: string }[];
  title: string;
  subtitle?: string;
};

export function DashboardHeader({ user, notifications = [], title, subtitle }: Props) {
  const router = useRouter();
  const unread = notifications.filter((n) => !n.read).length;

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const roleIcon = {
    USER: User,
    ADMIN: Shield,
    SECURITY: Radar,
  }[user.role];

  const RoleIcon = roleIcon;

  return (
    <header className="glass border-b border-surface-700/50 px-6 py-4 sticky top-0 z-40">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 smooth-transition">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center glow-primary shadow-lg">
              <Radar className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg gradient-primary hidden sm:block">FindIt</span>
          </Link>
          <div className="border-l border-surface-700 pl-4">
            <h1 className="text-lg font-semibold text-surface-50">{title}</h1>
            {subtitle && <p className="text-xs text-surface-400">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Button variant="ghost" size="icon">
              <Bell className="w-5 h-5" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {unread}
                </span>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-800 border border-surface-700 glass">
            <RoleIcon className="w-4 h-4 text-primary-400" />
            <span className="text-sm text-surface-300 hidden sm:block">{user.name}</span>
            <span className="text-xs text-primary-400/80 uppercase font-semibold tracking-wider">{user.role}</span>
          </div>

          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {notifications.length > 0 && (
        <div className="max-w-7xl mx-auto mt-3 flex gap-2 overflow-x-auto pb-1">
          {notifications.slice(0, 3).map((n) => (
            <div
              key={n.id}
              className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap smooth-transition ${
                n.read ? "bg-surface-800 text-surface-400" : "bg-primary-500/20 text-primary-300 border border-primary-500/30"
              }`}
            >
              {n.title} · {formatRelativeTime(n.createdAt)}
            </div>
          ))}
        </div>
      )}
    </header>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "primary",
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "primary" | "accent" | "red" | "emerald" | "blue";
}) {
  const colors = {
    primary: "text-primary-400 bg-primary-500/10 border-primary-500/30",
    accent: "text-accent-400 bg-accent-500/10 border-accent-500/30",
    red: "text-red-400 bg-red-500/10 border-red-500/30",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  };

  return (
    <div className="card rounded-xl p-5 border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-surface-400 uppercase tracking-wider font-semibold">{label}</p>
          <p className={`text-3xl font-bold mt-2 ${colors[accent].split(" ")[0]}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colors[accent]} backdrop-blur-sm`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

export function ChatPanel({
  messages,
  onSend,
}: {
  messages: { id: string; content: string; sender: { name: string }; createdAt: string }[];
  onSend: (content: string) => void;
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("message") as HTMLInputElement;
    if (input.value.trim()) {
      onSend(input.value.trim());
      input.value = "";
    }
  };

  return (
    <div className="card rounded-xl flex flex-col h-80 shadow-xl">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-surface-500 text-center py-8">No messages yet. Start the conversation!</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="glass rounded-lg px-3 py-2">
            <p className="text-xs text-primary-400 font-semibold">{m.sender.name}</p>
            <p className="text-sm text-surface-200 mt-0.5">{m.content}</p>
            <p className="text-xs text-surface-500 mt-1">{formatRelativeTime(m.createdAt)}</p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="p-3 border-t border-surface-700 flex gap-2">
        <Input name="message" placeholder="Type a message..." className="flex-1" />
        <Button type="submit" size="sm">Send</Button>
      </form>
    </div>
  );
}
