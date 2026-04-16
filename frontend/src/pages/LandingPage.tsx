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
  {
    icon: Icon.custom,
    title: "Custom Fields",
    desc: "Add your own fields to every lead — text, number, date, dropdown, yes/no. Tailor the CRM to your exact business process.",
    color: "from-orange-500/10 to-orange-500/5 border-orange-500/20",
    iconColor: "text-orange-500",
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
  "Custom fields per org",
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
            <span className="font-display font-bold text-lg tracking-tight text-white">SalesCRM</span>
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
            Now with lead scoring & custom fields
          </div>

          {/* Headline */}
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
            Close more deals
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              with less effort
            </span>
          </h1>

          {/* Sub */}
          <p className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            SalesCRM is the all-in-one lead management platform built for Indian sales teams.
            Track leads, send emails, log calls, score prospects and never miss a follow-up.
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
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/8 to-white/3 backdrop-blur-sm shadow-2xl shadow-black/60 overflow-hidden">
            {/* Fake browser bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-white/4">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/60" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                <div className="h-3 w-3 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 mx-4 bg-white/5 border border-white/8 rounded-md h-6 flex items-center px-3">
                <span className="text-[10px] text-white/30 font-mono">app.salescrm.in/dashboard</span>
              </div>
            </div>

            {/* Fake dashboard UI */}
            <div className="p-5 space-y-4">
              {/* Stats row */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Total Leads", val: "1,284", color: "text-white" },
                  { label: "Active Pipeline", val: "₹24.8L", color: "text-indigo-300" },
                  { label: "Converted Today", val: "7", color: "text-emerald-400" },
                  { label: "Overdue", val: "3", color: "text-amber-400" },
                ].map(s => (
                  <div key={s.label} className="bg-white/5 border border-white/8 rounded-xl p-3">
                    <p className="text-[10px] text-white/40 mb-1">{s.label}</p>
                    <p className={cn("text-lg font-bold font-display", s.color)}>{s.val}</p>
                  </div>
                ))}
              </div>

              {/* Lead rows */}
              <div className="bg-white/4 border border-white/8 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-white/8 flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/60">Recent Leads</span>
                  <span className="text-[10px] text-indigo-400 font-medium">View all →</span>
                </div>
                {[
                  { name: "Rahul Sharma", co: "Infosys Ltd", status: "Interested", score: 87, badge: "bg-red-500/20 text-red-300" },
                  { name: "Priya Nair", co: "TCS", status: "Call Back", score: 65, badge: "bg-amber-500/20 text-amber-300" },
                  { name: "Amit Patel", co: "Wipro", status: "New", score: 42, badge: "bg-blue-500/20 text-blue-300" },
                ].map((l, i) => (
                  <div key={i} className={cn("flex items-center gap-3 px-4 py-3 text-xs", i < 2 && "border-b border-white/5")}>
                    <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500/30 to-violet-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-300 shrink-0">{l.name[0]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white/90 truncate">{l.name}</p>
                      <p className="text-white/40 truncate">{l.co}</p>
                    </div>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", l.badge)}>{l.status}</span>
                    <span className="text-[10px] font-bold text-white/30 tabular-nums">{l.score}</span>
                  </div>
                ))}
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
            { val: 10000, suffix: "+", label: "Leads tracked" },
            { val: 98, suffix: "%", label: "Uptime SLA" },
            { val: 60, suffix: "%", label: "Launch discount" },
            { val: 2, suffix: " min", label: "Setup time" },
          ].map(s => (
            <div key={s.label}>
              <p className="font-display text-4xl font-bold text-white mb-1">
                <Counter to={s.val} suffix={s.suffix} />
              </p>
              <p className="text-sm text-white/40">{s.label}</p>
            </div>
          ))}
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
                    <span className="text-white/25">{Icon.check}</span>{f}
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
              {/* Badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-[11px] font-bold px-4 py-1 rounded-full uppercase tracking-wide whitespace-nowrap shadow-lg shadow-indigo-500/30">
                60% OFF — Limited time
              </div>

              <div className="mb-6">
                <h3 className="font-display text-xl font-bold text-white mb-1">Pro</h3>
                <div className="flex items-baseline gap-2 mt-3">
                  <p className="text-4xl font-bold text-white font-display">₹3,999</p>
                  <span className="text-white/40 text-sm">/mo</span>
                </div>
                <p className="text-sm mt-1">
                  <span className="line-through text-white/30">₹9,999/mo</span>
                  <span className="ml-2 text-emerald-400 font-semibold">Save ₹6,000/mo</span>
                </p>
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
            Cancel anytime. Lock in the launch price — stays discounted as long as you're subscribed.
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
      <footer className="border-t border-white/6 py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 text-white">
                <path d="M8 2C4.68 2 2 4.68 2 8s2.68 6 6 6 6-2.68 6-6-2.68-6-6-6z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M5 8h6M8 5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-display font-bold text-sm text-white/70">SalesCRM</span>
          </div>
          <p className="text-sm text-white/25">Built for Indian sales teams · {new Date().getFullYear()}</p>
          <div className="flex gap-5 text-sm text-white/30">
            <button onClick={() => navigate("/login")} className="hover:text-white/60 transition-colors">Login</button>
            <button onClick={() => navigate("/signup")} className="hover:text-white/60 transition-colors">Sign up</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
