"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dashboardPath } from "@/lib/routes";
import { Radar } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });

    setLoading(false);
    if (res.ok) {
      const { user } = await res.json();
      toast.success(`Welcome back, ${user.name}!`);
      router.push(dashboardPath(user.role));
    } else {
      toast.error("Invalid email or password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-radar-950 px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-beacon-500/5 via-transparent to-transparent" />
      <Card className="w-full max-w-md relative z-10">
        <CardHeader className="text-center">
          <div className="w-14 h-14 rounded-xl bg-beacon-500 flex items-center justify-center mx-auto mb-3 beacon-glow">
            <Radar className="w-8 h-8 text-radar-950" />
          </div>
          <CardTitle className="text-2xl">Sign in to FindIt</CardTitle>
          <p className="text-sm text-slate-400">Real-time lost &amp; found platform</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="user@findit.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 p-3 rounded-lg bg-radar-800 border border-slate-700 text-xs text-slate-400 space-y-1">
            <p className="font-medium text-slate-300 mb-2">Demo accounts (password: password123):</p>
            <p>User: user@findit.com</p>
            <p>Admin: admin@findit.com</p>
            <p>Security: security@findit.com</p>
          </div>

          <p className="text-center text-sm text-slate-400 mt-4">
            No account?{" "}
            <Link href="/register" className="text-beacon-400 hover:underline">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
