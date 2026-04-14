import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { authApi } from "../api";
import { tokenStore } from "../api/axiosInstance";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";

type AccountType = "individual" | "corporate";

export default function SignupPage() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [type, setType] = useState<AccountType>("individual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Individual fields
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");

  // Corporate fields
  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");

  // Shared
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      let data: { access_token: string };
      if (type === "individual") {
        data = await authApi.signupIndividual({ name, email, password, mobile: mobile || undefined });
      } else {
        data = await authApi.signupCorporate({ company_name: companyName, admin_name: adminName, email, password, mobile: mobile || undefined });
      }
      tokenStore.set(data.access_token);
      await refreshUser();
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string | { msg: string }[] } } })?.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map(d => d.msg).join(", "));
      } else {
        setError(detail as string || "Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] animate-fade-up">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-primary mb-4">
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 text-white">
              <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.8"/>
              <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M10 3V1.5M10 18.5V17M3 10H1.5M18.5 10H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground">Create your workspace</h1>
          <p className="text-sm text-muted-foreground mt-1">Start managing your leads today</p>
        </div>

        {/* Account type toggle */}
        <div className="flex gap-1 p-1 bg-secondary rounded-lg mb-6">
          <button
            type="button"
            onClick={() => setType("individual")}
            className={cn(
              "flex-1 py-2 text-sm font-medium rounded-md transition-all",
              type === "individual"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Individual
          </button>
          <button
            type="button"
            onClick={() => setType("corporate")}
            className={cn(
              "flex-1 py-2 text-sm font-medium rounded-md transition-all",
              type === "corporate"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Corporate
          </button>
        </div>

        {/* Form card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <form onSubmit={submit} className="space-y-4">

            {type === "individual" ? (
              <Input
                label="Full Name"
                placeholder="John Doe"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
              />
            ) : (
              <>
                <Input
                  label="Company Name"
                  placeholder="Acme Corporation"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  required
                  autoFocus
                />
                <Input
                  label="Your Name"
                  placeholder="John Doe"
                  value={adminName}
                  onChange={e => setAdminName(e.target.value)}
                  required
                />
              </>
            )}

            <Input
              label="Work Email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <Input
              label="Mobile (optional)"
              type="tel"
              placeholder="+1 234 567 8900"
              value={mobile}
              onChange={e => setMobile(e.target.value)}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />

            {error && (
              <div className="flex items-start gap-2.5 text-sm text-destructive bg-destructive/8 border border-destructive/15 rounded-lg px-3 py-2.5">
                <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 mt-0.5 shrink-0">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              {type === "individual" ? "Create Account" : "Create Workspace"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-5">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
