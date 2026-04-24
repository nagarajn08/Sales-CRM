import { useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { authApi } from "../api";
import { tokenStore } from "../api/axiosInstance";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { isValidEmail, isValidMobile, isValidPassword, digitsOnly, capitalizeName } from "../lib/validators";

type AccountType = "individual" | "corporate";
type Step = "form" | "otp";

function extractError(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: string | { msg: string }[] } } })?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map(d => d.msg).join(", ");
  return (detail as string) || "Something went wrong. Please try again.";
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2.5 text-sm text-destructive bg-destructive/8 border border-destructive/15 rounded-lg px-3 py-2.5">
      <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 mt-0.5 shrink-0">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
      {msg}
    </div>
  );
}

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handleChange = (i: number, ch: string) => {
    const digit = ch.replace(/\D/g, "").slice(-1);
    const arr = (value.padEnd(6, " ")).split("").slice(0, 6);
    arr[i] = digit || " ";
    const newVal = arr.join("").trimEnd();
    onChange(newVal);
    if (digit && i < 5) inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text) { onChange(text); inputs.current[Math.min(text.length, 5)]?.focus(); }
    e.preventDefault();
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {[0,1,2,3,4,5].map(i => (
        <input
          key={i}
          ref={el => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] && value[i] !== " " ? value[i] : ""}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          className={cn(
            "w-10 h-12 text-center text-lg font-bold rounded-lg border",
            "bg-input border-border text-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
            "transition-all"
          )}
        />
      ))}
    </div>
  );
}

export default function SignupPage() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [type, setType] = useState<AccountType>("individual");
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form fields
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // OTP step
  const [emailOtp, setEmailOtp] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");
  const [devEmailOtp, setDevEmailOtp] = useState<string | null>(null);
  const [devMobileOtp, setDevMobileOtp] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // ── Step 1: Submit form → request OTPs ──────────────────────────────────
  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isValidEmail(email)) { setError("Enter a valid email address"); return; }
    if (!isValidMobile(mobile)) { setError("Mobile must be a 10-digit number"); return; }
    if (!isValidPassword(password)) { setError("Password must be min 8 chars, include 1 uppercase and 1 number"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const res = await authApi.otpRequest({ email, mobile });
      setEmailSent(res.email_sent);
      setDevEmailOtp(res.dev_email_otp);
      setDevMobileOtp(res.dev_mobile_otp);
      setStep("otp");
      startCooldown();
    } catch (err: unknown) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTPs ──────────────────────────────────────────────────
  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (emailOtp.replace(/\s/g, "").length < 6) { setError("Enter complete 6-digit email OTP"); return; }
    if (mobileOtp.replace(/\s/g, "").length < 6) { setError("Enter complete 6-digit mobile OTP"); return; }
    setLoading(true);
    try {
      const res = await authApi.otpVerify({ email, mobile, email_otp: emailOtp, mobile_otp: mobileOtp });
      await completeSignup(res.verification_token);
    } catch (err: unknown) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const completeSignup = async (token: string) => {
    let data: { access_token: string };
    if (type === "individual") {
      data = await authApi.signupIndividual({ name, email, password, mobile, verification_token: token });
    } else {
      data = await authApi.signupCorporate({ company_name: companyName, admin_name: adminName, email, password, mobile, verification_token: token });
    }
    tokenStore.set(data.access_token);
    await refreshUser();
    navigate("/dashboard", { replace: true });
  };

  const resend = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setLoading(true);
    try {
      const res = await authApi.otpRequest({ email, mobile });
      setEmailSent(res.email_sent);
      setDevEmailOtp(res.dev_email_otp);
      setDevMobileOtp(res.dev_mobile_otp);
      setEmailOtp(""); setMobileOtp("");
      startCooldown();
    } catch (err: unknown) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const startCooldown = () => {
    setResendCooldown(60);
    const t = setInterval(() => setResendCooldown(p => { if (p <= 1) { clearInterval(t); return 0; } return p - 1; }), 1000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-[420px] animate-fade-up m-auto">

        {/* Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-primary mb-4 shadow-lg shadow-primary/30">
            <svg viewBox="0 0 24 30" fill="none" className="h-6 w-5">
              <path d="M12 1 A9 9 0 0 1 21 10 C21 17 13 25 12 27 C11 25 3 17 3 10 A9 9 0 0 1 12 1 Z" fill="white" fillOpacity="0.92"/>
              <path d="M8.5 13 L12 10 L15.5 7" stroke="hsl(var(--primary))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="8.5" cy="13" r="1.8" fill="hsl(var(--primary))"/>
              <circle cx="12"  cy="10" r="1.8" fill="hsl(var(--primary))"/>
              <circle cx="15.5" cy="7"  r="1.8" fill="hsl(var(--primary))"/>
            </svg>
          </div>
          {step === "form" ? (
            <>
              <h1 className="text-xl font-bold text-foreground">Create your workspace</h1>
              <p className="text-sm text-muted-foreground mt-1">Start managing your leads today</p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-foreground">Verify your identity</h1>
              <p className="text-sm text-muted-foreground mt-1">We sent codes to your email and mobile</p>
            </>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-5">
          {["form", "otp"].map((s, i) => (
            <div key={s} className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              step === s ? "w-8 bg-primary" : (["form","otp"].indexOf(step) > i ? "w-3 bg-primary/40" : "w-3 bg-border")
            )} />
          ))}
        </div>

        {/* ── STEP 1: Form ── */}
        {step === "form" && (
          <>
            {/* Account type toggle */}
            <div className="flex gap-1 p-1 bg-secondary rounded-lg mb-4">
              {(["individual", "corporate"] as AccountType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setType(t); setError(""); }}
                  className={cn(
                    "flex-1 py-2 text-sm font-medium rounded-md transition-all capitalize",
                    type === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <form onSubmit={submitForm} className="space-y-4">
                {type === "individual" ? (
                  <Input label="Full Name" placeholder="John Doe" value={name} onChange={e => setName(capitalizeName(e.target.value))} required autoFocus />
                ) : (
                  <>
                    <Input label="Company Name" placeholder="Acme Corporation" value={companyName} onChange={e => setCompanyName(capitalizeName(e.target.value))} required autoFocus />
                    <Input label="Your Name" placeholder="John Doe" value={adminName} onChange={e => setAdminName(capitalizeName(e.target.value))} required />
                  </>
                )}
                <Input label="Work Email" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                <Input
                  label="Mobile Number"
                  type="tel"
                  inputMode="numeric"
                  placeholder="9876543210"
                  value={mobile}
                  onChange={e => setMobile(digitsOnly(e.target.value))}
                  required
                />
                <Input label="Password" type="password" placeholder="Min 8 chars, 1 uppercase, 1 number" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" />
                <Input label="Confirm Password" type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} required autoComplete="new-password" />

                {error && <ErrorBox msg={error} />}

                <Button type="submit" className="w-full" loading={loading}>
                  Send Verification Codes
                </Button>
              </form>
            </div>
          </>
        )}

        {/* ── STEP 2: OTP entry ── */}
        {step === "otp" && (
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">

            {/* Info banner */}
            <div className="text-sm text-muted-foreground space-y-1.5">
              <p>
                <span className="font-medium text-foreground">Email:</span>{" "}
                {emailSent
                  ? <>OTP sent to <span className="font-medium text-foreground">{email}</span></>
                  : <span className="text-amber-600 font-medium">SMTP not configured — see dev code below</span>}
              </p>
              <p>
                <span className="font-medium text-foreground">Mobile:</span>{" "}
                <span>Code shown below (SMS not configured)</span>
              </p>
            </div>

            {/* Dev mode OTP display */}
            {import.meta.env.DEV && (devEmailOtp || devMobileOtp) && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs space-y-1">
                <p className="font-semibold text-amber-800 dark:text-amber-400">Dev mode — OTP codes</p>
                {devEmailOtp && (
                  <p className="text-amber-700 dark:text-amber-300">
                    Email OTP: <span className="font-mono font-bold text-sm">{devEmailOtp}</span>
                  </p>
                )}
                {devMobileOtp && (
                  <p className="text-amber-700 dark:text-amber-300">
                    Mobile OTP: <span className="font-mono font-bold text-sm">{devMobileOtp}</span>
                  </p>
                )}
              </div>
            )}

            <form onSubmit={submitOtp} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground block text-center">Email OTP</label>
                <OtpInput value={emailOtp} onChange={setEmailOtp} />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground block text-center">Mobile OTP</label>
                <OtpInput value={mobileOtp} onChange={setMobileOtp} />
              </div>

              {error && <ErrorBox msg={error} />}

              <Button type="submit" className="w-full" loading={loading}>
                Verify & Create Account
              </Button>
            </form>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => { setStep("form"); setError(""); setEmailOtp(""); setMobileOtp(""); }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Change details
              </button>
              <button
                type="button"
                onClick={resend}
                disabled={resendCooldown > 0 || loading}
                className={cn(
                  "transition-colors",
                  resendCooldown > 0 || loading
                    ? "text-muted-foreground cursor-not-allowed"
                    : "text-primary hover:underline"
                )}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend codes"}
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground mt-5">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
