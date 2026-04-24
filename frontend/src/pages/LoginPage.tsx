import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Invalid email or password";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-[360px] animate-fade-up m-auto">

        {/* Brand */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-primary mb-4 shadow-lg shadow-primary/30">
            <svg viewBox="0 0 24 30" fill="none" className="h-6 w-5">
              <path d="M12 1 A9 9 0 0 1 21 10 C21 17 13 25 12 27 C11 25 3 17 3 10 A9 9 0 0 1 12 1 Z" fill="white" fillOpacity="0.92"/>
              <path d="M8.5 13 L12 10 L15.5 7" stroke="hsl(var(--primary))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="8.5" cy="13" r="1.8" fill="hsl(var(--primary))"/>
              <circle cx="12"  cy="10" r="1.8" fill="hsl(var(--primary))"/>
              <circle cx="15.5" cy="7"  r="1.8" fill="hsl(var(--primary))"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground">TrackmyLead</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <form onSubmit={submit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
            />
            <div>
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <div className="text-right mt-1">
                <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  Forgot password?
                </Link>
              </div>
            </div>

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
              Sign in
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-5">
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary font-medium hover:underline">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
