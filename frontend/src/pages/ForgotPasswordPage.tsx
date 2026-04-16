import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

type Step = "email" | "otp";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email);
      setDevOtp(res.dev_otp ?? null);
      setStep("otp");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ email, otp, new_password: newPassword });
      setSuccess("Password reset successfully! Redirecting to login…");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Invalid or expired OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[360px] animate-fade-up">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-primary mb-4">
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 text-white">
              <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.8"/>
              <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M10 3V1.5M10 18.5V17M3 10H1.5M18.5 10H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground">Reset Password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {step === "email" ? "Enter your email to receive a reset code" : "Enter the code sent to your email"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">

          {/* Step 1 — Email */}
          {step === "email" && (
            <form onSubmit={sendOtp} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
              {error && <ErrorBox message={error} />}
              <Button type="submit" className="w-full" loading={loading}>
                Send Reset Code
              </Button>
            </form>
          )}

          {/* Step 2 — OTP + New Password */}
          {step === "otp" && (
            <form onSubmit={resetPassword} className="space-y-4">
              {devOtp && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-sm text-amber-800">
                  <span className="font-semibold">Dev mode — OTP: </span>
                  <span className="font-data font-bold tracking-widest">{devOtp}</span>
                </div>
              )}
              <Input
                label="Reset Code"
                placeholder="6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                autoFocus
                maxLength={6}
              />
              <Input
                label="New Password"
                type="password"
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <Input
                label="Confirm Password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {error && <ErrorBox message={error} />}
              {success && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                  <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 shrink-0">
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {success}
                </div>
              )}
              <Button type="submit" className="w-full" loading={loading}>
                Reset Password
              </Button>
              <button
                type="button"
                onClick={() => { setStep("email"); setError(""); setOtp(""); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Use a different email
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-5">
          Remember your password?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 text-sm text-destructive bg-destructive/8 border border-destructive/15 rounded-lg px-3 py-2.5">
      <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 mt-0.5 shrink-0">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
      {message}
    </div>
  );
}
