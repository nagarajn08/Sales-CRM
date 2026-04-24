import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

// ── tiny helpers ──────────────────────────────────────────────────────────────
function cn(...c: (string | false | undefined)[]) { return c.filter(Boolean).join(" "); }

// ── icons ────────────────────────────────────────────────────────────────────
const Icon = {
  leads: (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6"><circle cx="9" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.6"/><path d="M2 21c0-4.14 3.13-7.5 7-7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><circle cx="17" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6"/><path d="M12.5 21c0-4.14 2.91-7.5 6.5-7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
  ),
  pipeline: (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6"><path d="M3 17l4-8 4 5 3-3 4 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  email: (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6"><rect x="2" y="4" width="20" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.6"/><path d="M2 8l10 7 10-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6"><rect x="3" y="12" width="4" height="9" rx="1" stroke="currentColor" strokeWidth="1.6"/><rect x="10" y="7" width="4" height="14" rx="1" stroke="currentColor" strokeWidth="1.6"/><rect x="17" y="3" width="4" height="18" rx="1" stroke="currentColor" strokeWidth="1.6"/></svg>
  ),
  whatsapp: (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.6"/><path d="M8 12c0 2.21 1.79 4 4 4 .78 0 1.5-.22 2.11-.61L17 16l-.61-2.89A4 4 0 108 12z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
  ),
  custom: (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6"><rect x="3" y="3" width="18" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="3" y="10" width="18" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="3" y="17" width="11" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><path d="M19 19h3M20.5 17.5v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
  ),
  score: (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
  ),
  team: (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6"/><path d="M5 21c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
  ),
  check: (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 shrink-0"><path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  arrow: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
};

const FEATURES = [
  {
    icon: Icon.leads,
    title: "Smart Lead Management",
    desc: "Capture, organise and track every lead from multiple sources — manual entry, CSV import, or Facebook / Instagram / LinkedIn webhooks.",
    color: "from-blue-500/10 to-blue-500/5 border-blue-500/20",
    iconColor: "text-blue-500",
  },
  {
    icon: Icon.score,
    title: "Auto Lead Scoring",
    desc: "Every lead is scored 0–100 automatically based on status, activity, deal value, follow-up timing and recency. Focus on what matters.",
    color: "from-amber-500/10 to-amber-500/5 border-amber-500/20",
    iconColor: "text-amber-500",
  },
  {
    icon: Icon.pipeline,
    title: "Pipeline & Deal Tracking",
    desc: "Kanban view, deal values, pipeline totals in ₹K/L/Cr. See exactly where your revenue is sitting at any moment.",
    color: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
    iconColor: "text-emerald-500",
  },
  {
    icon: Icon.email,
    title: "Email & WhatsApp",
    desc: "Send emails directly from a lead's profile using your SMTP. One-tap WhatsApp chat. Log every call with outcome and duration.",
    color: "from-violet-500/10 to-violet-500/5 border-violet-500/20",
    iconColor: "text-violet-500",
  },
  {
    icon: Icon.bell,
    title: "Follow-up Reminders",
    desc: "Never miss a follow-up. Get in-app notifications and WhatsApp/SMS reminders via Twilio when a scheduled call is due.",
    color: "from-rose-500/10 to-rose-500/5 border-rose-500/20",
    iconColor: "text-rose-500",
  },
  {
    icon: Icon.chart,
    title: "Reports & Analytics",
    desc: "Trend charts, status breakdowns, source analysis, team performance tables and top-lead rankings — all printable to PDF.",
    color: "from-cyan-500/10 to-cyan-500/5 border-cyan-500/20",
    iconColor: "text-cyan-500",
  },
  {
    icon: Icon.team,
    title: "Team Management",
    desc: "Multi-user with role-based access. Assign leads, track agent performance, bulk reassign and audit every activity.",
    color: "from-indigo-500/10 to-indigo-500/5 border-indigo-500/20",
    iconColor: "text-indigo-500",
  },
];

const STEPS = [
  { num: "01", title: "Sign up in 30 seconds", desc: "Create your account — individual or corporate. No credit card needed to start." },
  { num: "02", title: "Import or add leads", desc: "Upload a CSV, connect your Facebook/Instagram lead ads, or add manually. Leads land in your pipeline instantly." },
  { num: "03", title: "Follow up & close", desc: "Set reminders, send emails, log calls, track scores. Watch the conversion rate climb in your reports." },
];

const PRO_FEATURES = [
  "Unlimited users & leads",
  "Full lead management & pipeline",
  "Email sending via SMTP",
  "WhatsApp click-to-chat",
  "Bulk actions & CSV export",
  "Call log & activity timeline",
  "Reports with trend charts",
  "Lead scoring (auto 0–100)",
  "Follow-up reminders (WhatsApp/SMS)",
  "Social media lead capture",
  "Team management & roles",
];

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let start = 0;
      const step = Math.ceil(to / 40);
      const t = setInterval(() => {
        start = Math.min(start + step, to);
        setVal(start);
        if (start >= to) clearInterval(t);
      }, 30);
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to]);
  return <span ref={ref}>{val.toLocaleString("en-IN")}{suffix}</span>;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans overflow-x-hidden">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-white">
                <path d="M8 2C4.68 2 2 4.68 2 8s2.68 6 6 6 6-2.68 6-6-2.68-6-6-6z" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M5 8h6M8 5l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-white">TrackmyLead</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-7 text-sm text-white/60">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/login")}
              className="hidden sm:block text-sm font-medium text-white/70 hover:text-white transition-colors px-3 py-1.5"
            >
              Log in
            </button>
            <button
              onClick={() => navigate("/signup")}
              className="text-sm font-semibold bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white px-4 py-2 rounded-xl shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:-translate-y-0.5"
            >
              Get started free
            </button>
            {/* Mobile menu toggle */}
            <button className="md:hidden p-1.5 text-white/60 hover:text-white" onClick={() => setMenuOpen(o => !o)}>
              <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
                <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/5 bg-[#0a0a0f] px-4 py-4 space-y-3 text-sm">
            <a href="#features" className="block text-white/70 hover:text-white py-1" onClick={() => setMenuOpen(false)}>Features</a>
            <a href="#how-it-works" className="block text-white/70 hover:text-white py-1" onClick={() => setMenuOpen(false)}>How it works</a>
            <a href="#pricing" className="block text-white/70 hover:text-white py-1" onClick={() => setMenuOpen(false)}>Pricing</a>
            <button onClick={() => navigate("/login")} className="block text-white/70 hover:text-white py-1 w-full text-left">Log in</button>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-20 pb-32 px-4 sm:px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px]" />
          <div className="absolute top-20 left-1/4 w-[300px] h-[300px] bg-violet-600/10 rounded-full blur-[80px]" />
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(white 1px,transparent 1px),linear-gradient(90deg,white 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold mb-8 tracking-wide uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Now with lead scoring & WhatsApp reminders
          </div>

          {/* Headline */}
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
            Never miss a
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              follow-up again.
            </span>
          </h1>

          {/* Sub */}
          <p className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            TrackmyLead is the all-in-one lead management platform built for Indian sales teams.
            Track leads, send emails, log calls, score prospects — and close every deal.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-14">
            <button
              onClick={() => navigate("/signup")}
              className="group flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-semibold px-7 py-3.5 rounded-2xl shadow-2xl shadow-indigo-500/30 transition-all hover:-translate-y-0.5 hover:shadow-indigo-500/50 text-base"
            >
              Start for free
              <span className="group-hover:translate-x-0.5 transition-transform">{Icon.arrow}</span>
            </button>
            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-2 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold px-7 py-3.5 rounded-2xl transition-all text-base"
            >
              Log in to your account
            </button>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 text-xs text-white/40 font-medium">
            {["No credit card required", "Free plan forever", "Setup in 2 minutes", "Made for India"].map(t => (
              <span key={t} className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/8 bg-white/4">
                <span className="h-1 w-1 rounded-full bg-emerald-400" />{t}
              </span>
            ))}
          </div>
        </div>

        {/* Hero app mockup */}
        <div className="relative max-w-5xl mx-auto mt-16">
          <div className="rounded-2xl border border-white/10 shadow-2xl shadow-black/70 overflow-hidden" style={{ background: "#0f0f16" }}>

            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.07]" style={{ background: "#0f0f16" }}>
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/50" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/50" />
              </div>
              <div className="flex-1 mx-4 rounded-md h-5 flex items-center px-3 border border-white/[0.07]" style={{ background: "#ffffff08" }}>
                <span className="text-[9px] text-white/25 font-mono">app.trackmylead.in/dashboard</span>
              </div>
            </div>

            {/* App shell: sidebar + main */}
            <div className="flex" style={{ minHeight: 340 }}>

              {/* Sidebar */}
              <div className="w-[160px] shrink-0 flex flex-col border-r border-white/[0.07]" style={{ background: "#12121a" }}>
                {/* Brand */}
                <div className="flex items-center gap-2 px-3 py-3 border-b border-white/[0.06]">
                  <div className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                    <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 text-white">
                      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4"/>
                      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M8 2.5V1M8 15v-1.5M2.5 8H1M15 8h-1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white/80 leading-none">Acme Corp</p>
                    <p className="text-[8px] text-white/30 mt-0.5">TrackmyLead</p>
                  </div>
                </div>
                {/* Nav */}
                <nav className="flex-1 px-2 py-2 space-y-0.5">
                  {[
                    { label: "Dashboard", active: true, icon: <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3"><rect x="1" y="1" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8" y="1" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="8" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8" y="8" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg> },
                    { label: "Leads", active: false, icon: <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3"><circle cx="5.5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M1 13c0-2.5 2-4.5 4.5-4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="10" cy="5" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M7.5 13c0-2.5 1.5-4.5 3.5-4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
                    { label: "Reports", active: false, icon: <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3"><path d="M2 11V4M5 11V6.5M8 11V5M11 11V2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M1 12.5h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
                    { label: "Email Templates", active: false, icon: <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3"><rect x="1" y="2.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1 5.5l6 4 6-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
                  ].map(item => (
                    <div key={item.label} className="relative flex items-center gap-2 px-2 py-1.5 rounded-md" style={{ background: item.active ? "rgba(99,102,241,0.12)" : "transparent" }}>
                      {item.active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3.5 rounded-full" style={{ background: "#6366f1" }} />}
                      <span style={{ color: item.active ? "#818cf8" : "rgba(255,255,255,0.3)" }}>{item.icon}</span>
                      <span className="text-[9.5px] font-medium truncate" style={{ color: item.active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)" }}>{item.label}</span>
                      {item.active && <span className="ml-auto h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "#6366f1" }} />}
                    </div>
                  ))}
                </nav>
                {/* User footer */}
                <div className="px-2 pb-2 pt-1.5 border-t border-white/[0.06]">
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-white/[0.06]" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <div className="h-5 w-5 rounded-md flex items-center justify-center text-[8px] font-bold text-white shrink-0" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>NA</div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-semibold text-white/70 truncate">Krish</p>
                      <p className="text-[8px] text-white/30">Admin</p>
                    </div>
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                  </div>
                </div>
              </div>

              {/* Main content */}
              <div className="flex-1 flex flex-col min-w-0">

                {/* Topbar */}
                <div className="flex items-center gap-3 px-4 h-10 border-b border-white/[0.07] shrink-0" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: "rgba(99,102,241,0.15)" }}>
                    <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3" style={{ color: "#818cf8" }}><rect x="1" y="1" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8" y="1" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="8" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8" y="8" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white/80 leading-none">Dashboard</p>
                    <p className="text-[8px] text-white/30">Your pipeline at a glance</p>
                  </div>
                  <div className="flex-1" />
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ color: "rgba(255,255,255,0.3)" }}>
                      <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3"><path d="M7 1.5v.8M7 11.7v.8M1.5 7h.8M11.7 7h.8M3 3l.6.6M10.4 10.4l.6.6M3 11l.6-.6M10.4 3.6l.6-.6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/><circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.1"/></svg>
                    </div>
                    <div className="h-5 w-5 rounded-md flex items-center justify-center bg-indigo-500/20 text-[8px] font-bold text-indigo-300">KR</div>
                  </div>
                </div>

                {/* Dashboard body */}
                <div className="flex-1 p-3 space-y-3 overflow-hidden">

                  {/* KPI cards */}
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { label: "TOTAL LEADS", val: "1,284", sub: "↑ 12 this week", bar: "#6366f1", icon: "👥" },
                      { label: "CONVERTED TODAY", val: "7", sub: "↑ 3 vs yesterday", bar: "#10b981", icon: "✅" },
                      { label: "OVERDUE", val: "3", sub: "Follow-ups due", bar: "#f59e0b", icon: "⏰" },
                      { label: "FOLLOWUPS DUE", val: "11", sub: "Scheduled today", bar: "#8b5cf6", icon: "📅" },
                      { label: "FOLLOWUPS DONE", val: "8", sub: "Completed today", bar: "#06b6d4", icon: "📞" },
                    ].map(k => (
                      <div key={k.label} className="rounded-lg overflow-hidden border border-white/[0.07]" style={{ background: "#1a1a26" }}>
                        <div className="h-0.5 w-full" style={{ background: k.bar }} />
                        <div className="px-2.5 py-2 flex items-center gap-2">
                          <div className="h-6 w-6 rounded-md flex items-center justify-center text-sm shrink-0" style={{ background: `${k.bar}22` }}>{k.icon}</div>
                          <div className="min-w-0">
                            <p className="text-[7.5px] font-bold text-white/30 uppercase tracking-wide leading-none truncate">{k.label}</p>
                            <p className="text-sm font-bold text-white mt-0.5 leading-none tabular-nums">{k.val}</p>
                            <p className="text-[7px] text-white/30 mt-0.5">{k.sub}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bottom row: leads table + bar chart */}
                  <div className="grid grid-cols-5 gap-2">

                    {/* Recent leads table */}
                    <div className="col-span-3 rounded-lg border border-white/[0.07] overflow-hidden" style={{ background: "#1a1a26" }}>
                      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]" style={{ background: "rgba(255,255,255,0.02)" }}>
                        <span className="text-[9px] font-bold text-white/60">Recent Leads</span>
                        <span className="text-[8px] text-indigo-400">View all →</span>
                      </div>
                      {[
                        { name: "Rahul Sharma", co: "Infosys Ltd", status: "Interested", statusColor: "#14b8a6", av: "RS", avColor: "#6366f1" },
                        { name: "Priya Nair", co: "TCS", status: "Call Back", statusColor: "#f59e0b", av: "PN", avColor: "#10b981" },
                        { name: "Amit Patel", co: "Wipro", status: "New", statusColor: "#6366f1", av: "AP", avColor: "#f97316" },
                        { name: "Sunita Rao", co: "HCL Tech", status: "Converted", statusColor: "#10b981", av: "SR", avColor: "#ec4899" },
                      ].map((l, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.04] last:border-0">
                          <div className="h-5 w-5 rounded-md flex items-center justify-center text-[7px] font-bold text-white shrink-0" style={{ background: l.avColor }}>{l.av}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-semibold text-white/80 truncate">{l.name}</p>
                            <p className="text-[7.5px] text-white/30 truncate">{l.co}</p>
                          </div>
                          <span className="text-[7.5px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: `${l.statusColor}22`, color: l.statusColor }}>{l.status}</span>
                        </div>
                      ))}
                    </div>

                    {/* Source bar chart */}
                    <div className="col-span-2 rounded-lg border border-white/[0.07] overflow-hidden" style={{ background: "#1a1a26" }}>
                      <div className="px-3 py-2 border-b border-white/[0.06]" style={{ background: "rgba(255,255,255,0.02)" }}>
                        <span className="text-[9px] font-bold text-white/60">Leads by Source</span>
                      </div>
                      <div className="px-3 py-2.5 space-y-2.5">
                        {[
                          { label: "Facebook", pct: 78, color: "#6366f1" },
                          { label: "Website", pct: 55, color: "#8b5cf6" },
                          { label: "Reference", pct: 42, color: "#14b8a6" },
                          { label: "Cold Call", pct: 28, color: "#f97316" },
                        ].map(b => (
                          <div key={b.label}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full" style={{ background: b.color }} />
                                <span className="text-[8px] text-white/50">{b.label}</span>
                              </div>
                              <span className="text-[8px] font-semibold text-white/50">{b.pct}%</span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                              <div className="h-full rounded-full" style={{ width: `${b.pct}%`, background: b.color, opacity: 0.85 }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Glow under mockup */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-white/6 bg-white/[0.02] py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { display: null, val: 10000, suffix: "+", label: "Leads tracked every day" },
            { display: "99.9%", val: 0, suffix: "", label: "Uptime SLA" },
            { display: null, val: 500, suffix: "+", label: "Active sales teams" },
            { display: null, val: 2, suffix: " min", label: "Setup time" },
          ].map(s => (
            <div key={s.label}>
              <p className="font-display text-4xl font-bold text-white mb-1">
                {s.display ? s.display : <Counter to={s.val} suffix={s.suffix} />}
              </p>
              <p className="text-sm text-white/40">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Why TrackmyLead ── */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-rose-400 mb-3">The problem with doing it the old way</p>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-5 leading-tight">
              Most sales don't fail on the call.<br />
              <span className="bg-gradient-to-r from-rose-400 via-orange-400 to-amber-400 bg-clip-text text-transparent">
                They fail in the follow-up.
              </span>
            </h2>
            <p className="text-white/40 text-lg max-w-2xl mx-auto leading-relaxed">
              Spreadsheets get messy. WhatsApp chats get buried. Leads go cold because nobody remembered to call back.
              TrackmyLead fixes that — completely.
            </p>
          </div>

          {/* Before / After */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-20 max-w-4xl mx-auto">
            {/* Without */}
            <div className="rounded-2xl border border-red-500/20 bg-gradient-to-b from-red-500/8 to-red-500/3 p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="h-7 w-7 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-red-400"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
                <p className="font-display font-bold text-red-300 text-sm uppercase tracking-wide">Without a CRM</p>
              </div>
              <ul className="space-y-3">
                {[
                  "Leads scattered across WhatsApp, Excel, sticky notes",
                  "You forget who to call and when",
                  "No idea which source is actually bringing business",
                  "Manager can't see what the team is doing",
                  "Deals slip through because of missed follow-ups",
                  "No data to improve — just gut feel",
                ].map(t => (
                  <li key={t} className="flex items-start gap-2.5 text-sm text-white/40">
                    <span className="text-red-500/60 mt-0.5 shrink-0">
                      <svg viewBox="0 0 14 14" fill="none" className="h-3.5 w-3.5"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* With */}
            <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-emerald-500/8 to-emerald-500/3 p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="h-7 w-7 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-emerald-400"><path d="M2.5 8.5l3.5 3.5 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <p className="font-display font-bold text-emerald-300 text-sm uppercase tracking-wide">With TrackmyLead</p>
              </div>
              <ul className="space-y-3">
                {[
                  "Every lead in one place — always organised, never lost",
                  "Reminders tell you exactly who to call and when",
                  "See which source drives the most conversions",
                  "Real-time team dashboard for managers",
                  "Automated follow-up alerts so nothing slips",
                  "Reports show what's working — double down on it",
                ].map(t => (
                  <li key={t} className="flex items-start gap-2.5 text-sm text-white/60">
                    <span className="text-emerald-400 mt-0.5 shrink-0">
                      <svg viewBox="0 0 14 14" fill="none" className="h-3.5 w-3.5"><path d="M2 7.5l3.5 3.5 6.5-6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 4 value pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ),
                color: "from-violet-500/10 to-violet-500/4 border-violet-500/20",
                iconColor: "text-violet-400",
                tag: "Save time",
                title: "Stop wasting hours on admin",
                body: "Log a call in 10 seconds. Import 500 leads in one click. Send a follow-up email without leaving the app. TrackmyLead cuts the busywork so your team spends time selling, not managing spreadsheets.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6"><path d="M3 17l4-8 4 5 3-3 4 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 21h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                ),
                color: "from-indigo-500/10 to-indigo-500/4 border-indigo-500/20",
                iconColor: "text-indigo-400",
                tag: "Clear picture",
                title: "See your pipeline at a glance",
                body: "Dashboard shows total leads, active pipeline value in ₹, conversions today, overdue follow-ups and team performance — all on one screen. No digging. No guesswork. Just clarity.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                ),
                color: "from-amber-500/10 to-amber-500/4 border-amber-500/20",
                iconColor: "text-amber-400",
                tag: "Never miss",
                title: "Follow up before it's too late",
                body: "Scheduled follow-ups with WhatsApp and SMS reminders via Twilio. Overdue leads are highlighted in red. Hot leads get auto-scored so you always know who to call first — not last.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6"><path d="M3 17l4-8 4 5 3-3 4 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.6"/></svg>
                ),
                color: "from-emerald-500/10 to-emerald-500/4 border-emerald-500/20",
                iconColor: "text-emerald-400",
                tag: "Grow faster",
                title: "Data that actually drives decisions",
                body: "See which sources convert best, which agents close the most, and where leads are dropping off. Reports with trend charts, source breakdowns and team rankings make your next move obvious.",
              },
            ].map(p => (
              <div key={p.title} className={`rounded-2xl border bg-gradient-to-b p-5 flex flex-col gap-3 ${p.color}`}>
                <div className={`h-10 w-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center ${p.iconColor}`}>
                  {p.icon}
                </div>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${p.iconColor}`}>{p.tag}</p>
                <h3 className="font-display font-bold text-white text-sm leading-snug">{p.title}</h3>
                <p className="text-white/40 text-xs leading-relaxed flex-1">{p.body}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">Everything you need</p>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4">Built for serious sales teams</h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto">
            Every feature you need to run a high-performance sales operation — no bloat, no fluff.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className={cn(
              "group relative rounded-2xl border bg-gradient-to-b p-5 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-black/30",
              f.color
            )}>
              <div className={cn("mb-4 w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center", f.iconColor)}>
                {f.icon}
              </div>
              <h3 className="font-display font-bold text-white text-sm mb-2">{f.title}</h3>
              <p className="text-white/45 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 bg-white/[0.015] border-y border-white/6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-3">Simple by design</p>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4">Up and running in minutes</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-10 left-[calc(16.6%+1rem)] right-[calc(16.6%+1rem)] h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

            {STEPS.map((s) => (
              <div key={s.num} className="relative text-center p-6">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 mb-5 mx-auto">
                  <span className="font-display text-2xl font-bold bg-gradient-to-br from-indigo-400 to-violet-400 bg-clip-text text-transparent">{s.num}</span>
                </div>
                <h3 className="font-display font-bold text-white text-base mb-2">{s.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3">Transparent pricing</p>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4">Simple. No surprises.</h2>
            <p className="text-white/40 text-lg">Start free, upgrade when you're ready.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free */}
            <div className="rounded-2xl border border-white/10 bg-white/4 p-7 flex flex-col">
              <div className="mb-6">
                <h3 className="font-display text-xl font-bold text-white mb-1">Free</h3>
                <p className="text-4xl font-bold text-white font-display mt-3">₹0</p>
                <p className="text-white/40 text-sm mt-1">Forever free · No card needed</p>
              </div>
              <ul className="space-y-2.5 flex-1 mb-7">
                {["1 user", "25 leads", "Basic lead management", "Dashboard overview", "Email templates (view)"].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-white/50">
                    <span className="text-white/50">{Icon.check}</span>{f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate("/signup")}
                className="w-full py-3 rounded-xl border border-white/10 text-white/70 hover:text-white hover:border-white/20 hover:bg-white/5 font-semibold text-sm transition-all"
              >
                Get started free
              </button>
            </div>

            {/* Pro */}
            <div className="relative rounded-2xl border border-indigo-500/50 bg-gradient-to-b from-indigo-500/10 to-violet-500/5 p-7 flex flex-col shadow-2xl shadow-indigo-500/10">
              <div className="mb-6">
                <h3 className="font-display text-xl font-bold text-white mb-1">Pro</h3>
                <div className="flex items-baseline gap-2 mt-3">
                  <p className="text-4xl font-bold text-white font-display">₹3,999</p>
                  <span className="text-white/40 text-sm">/mo</span>
                </div>
                <p className="text-sm mt-1 text-white/35">Billed monthly · Cancel anytime</p>
              </div>

              <ul className="space-y-2.5 flex-1 mb-7">
                {PRO_FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-white/70">
                    <span className="text-indigo-400">{Icon.check}</span>{f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => navigate("/signup")}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5"
              >
                Start with Pro →
              </button>
            </div>
          </div>

          <p className="text-center text-white/30 text-sm mt-8">
            Cancel anytime. No hidden fees. Your data is always yours.
          </p>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/15 rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-5 leading-tight">
            Your pipeline is waiting.<br />
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Start today.</span>
          </h2>
          <p className="text-white/40 text-lg mb-10">No credit card. No setup fees. Just leads, follow-ups and closed deals.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate("/signup")}
              className="group flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-semibold px-8 py-4 rounded-2xl shadow-2xl shadow-indigo-500/30 transition-all hover:-translate-y-0.5 hover:shadow-indigo-500/50 text-base"
            >
              Create free account
              <span className="group-hover:translate-x-0.5 transition-transform">{Icon.arrow}</span>
            </button>
            <button
              onClick={() => navigate("/login")}
              className="flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold px-8 py-4 rounded-2xl transition-all text-base"
            >
              Sign in
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/6 bg-white/[0.015]">
        {/* Main footer grid */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand col */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
                <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-white">
                  <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4"/>
                  <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M8 2.5V1M8 15v-1.5M2.5 8H1M15 8h-1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="font-display font-bold text-base text-white tracking-tight">TrackmyLead</span>
            </div>
            <p className="text-sm text-white/35 leading-relaxed">
              The all-in-one sales CRM built for Indian teams. Manage leads, track follow-ups, and close more deals — faster.
            </p>
            {/* Contact */}
            <a
              href="mailto:support@trackmylead.in"
              className="flex items-center gap-2 text-xs text-white/30 hover:text-indigo-400 transition-colors group w-fit"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 shrink-0">
                <rect x="1.5" y="3" width="13" height="10" rx="1.8" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M1.5 6l6.5 4 6.5-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              support@trackmylead.in
            </a>
          </div>

          {/* Product */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/50 mb-4">Product</p>
            <ul className="space-y-2.5">
              {[
                { label: "Features", href: "#features" },
                { label: "How it works", href: "#how-it-works" },
                { label: "Pricing", href: "#pricing" },
                { label: "Lead Scoring", href: "#features" },
                { label: "Reports & Analytics", href: "#features" },
              ].map(l => (
                <li key={l.label}>
                  <a href={l.href} className="text-sm text-white/40 hover:text-white transition-colors">{l.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/50 mb-4">Account</p>
            <ul className="space-y-2.5">
              {[
                { label: "Log in", action: () => navigate("/login") },
                { label: "Sign up free", action: () => navigate("/signup") },
              ].map(l => (
                <li key={l.label}>
                  <button onClick={l.action} className="text-sm text-white/40 hover:text-white transition-colors">{l.label}</button>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA mini */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/50 mb-4">Get started</p>
            <p className="text-sm text-white/35 leading-relaxed mb-4">
              Free forever plan. No credit card. Up and running in 2 minutes.
            </p>
            <button
              onClick={() => navigate("/signup")}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5"
            >
              Create free account
            </button>
            <div className="flex items-center justify-center gap-1.5 mt-3">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-white/50">Live · Trusted by sales teams across India</span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 px-4 sm:px-6 py-5">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-white/40">
              © {new Date().getFullYear()} TrackmyLead · Built for Indian sales teams
            </p>
            <div className="flex items-center gap-5">
              {["Privacy Policy", "Terms of Use"].map(t => (
                <span key={t} className="text-xs text-white/40 hover:text-white/60 transition-colors cursor-pointer">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
