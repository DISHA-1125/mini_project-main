import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { ArrowRight, MapPin, MessageSquare, Radar, Shield, Zap } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    const paths = { USER: "/dashboard/user", ADMIN: "/dashboard/admin", SECURITY: "/dashboard/security" };
    redirect(paths[session.role]);
  }

  return (
    <div className="min-h-screen bg-radar-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-beacon-500/10 via-transparent to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-beacon-500/10 radar-pulse pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-beacon-500/20 pointer-events-none" />

      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-beacon-500 flex items-center justify-center beacon-glow">
            <Radar className="w-6 h-6 text-radar-950" />
          </div>
          <span className="text-xl font-bold text-beacon-400">FindIt</span>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Get Started</Link>
          </Button>
        </div>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-24">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-beacon-500/10 border border-beacon-500/30 text-beacon-400 text-sm mb-6">
            <Zap className="w-4 h-4" />
            Real-time location tracking powered by Socket.io
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-slate-100 leading-tight">
            Never lose hope.
            <span className="text-beacon-400 block mt-2">Find it live.</span>
          </h1>
          <p className="text-lg text-slate-400 mt-6 max-w-2xl mx-auto">
            A modern lost &amp; found platform with live maps, instant chat matching,
            secure claim verification, and campus security handover via OTP &amp; QR codes.
          </p>
          <div className="flex gap-4 justify-center mt-10">
            <Button size="lg" asChild>
              <Link href="/register">
                Start Reporting <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">View Demo</Link>
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-24">
          {[
            {
              icon: MapPin,
              title: "Live Map Tracking",
              desc: "See lost and found items on an interactive map with real-time coordinate updates.",
            },
            {
              icon: MessageSquare,
              title: "Instant Chat Matching",
              desc: "Connect with finders or owners instantly when a potential match is found.",
            },
            {
              icon: Shield,
              title: "Secure Handovers",
              desc: "Campus security verifies collection with OTP codes and QR scanning.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass-panel rounded-2xl p-6 hover:border-beacon-500/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-beacon-500/10 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-beacon-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
              <p className="text-sm text-slate-400 mt-2">{desc}</p>
            </div>
          ))}
        </div>

        <div className="glass-panel rounded-2xl p-8 mt-16 text-center">
          <h2 className="text-2xl font-bold text-beacon-400 mb-4">Three Secure Dashboards</h2>
          <div className="grid sm:grid-cols-3 gap-4 text-left">
            {[
              { role: "User / Finder", desc: "Report items, view live map, chat with matches" },
              { role: "Admin / Authority", desc: "Monitor listings, verify claims, view analytics" },
              { role: "Campus Security", desc: "Log handovers, verify collection via OTP/QR" },
            ].map(({ role, desc }) => (
              <div key={role} className="bg-radar-800 rounded-xl p-4 border border-slate-700">
                <p className="font-semibold text-slate-200">{role}</p>
                <p className="text-sm text-slate-400 mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
