import { FormEvent, useEffect, useRef, useState } from "react";
import api, { refreshCsrf } from "./services/api";
import PasswordField from "./PasswordField";

export default function PasswordRecovery({
  onLogin,
  onClose,
}: {
  onLogin: () => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"request" | "reset" | "done">("request");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [cooldown, setCooldown] = useState(0);
  const root = useRef<HTMLDivElement>(null),
    emailInput = useRef<HTMLInputElement>(null),
    codeInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    root.current?.querySelector<HTMLInputElement>("input")?.focus();
    const key = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = root.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input:not(:disabled),a",
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, []);
  useEffect(() => {
    if (step === "reset") codeInput.current?.focus();
  }, [step]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(
      () => setCooldown((c) => Math.max(0, c - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  function explain(e: unknown) {
    const r = (
      e as { response?: { data?: { message?: string }; status: number } }
    ).response;
    return (
      r?.data?.message ||
      (r?.status === 500
        ? "Password recovery could not complete. Contact the site administrator."
        : "Unable to send your request. Check your connection and try again.")
    );
  }
  async function sendCode() {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await refreshCsrf();
      const normalized = email.trim().toLowerCase();
      const response = await api.post("/auth/forgot-password", {
        email: normalized,
      });
      setEmail(normalized);
      setStep("reset");
      setMessage(response.data.message);
      setCooldown(60);
      if (codeInput.current) codeInput.current.value = "";
    } catch (e) {
      setError(explain(e));
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    if (step === "request") {
      await sendCode();
      return;
    }
    const fields = new FormData(e.currentTarget);
    if (fields.get("password") !== fields.get("confirmPassword")) {
      setError("Your passwords don’t match. Please try again.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await refreshCsrf();
      await api.post("/auth/reset-password", {
        email,
        code: fields.get("code"),
        password: fields.get("password"),
      });
      await refreshCsrf();
      setStep("done");
      setMessage(
        "Your password has been updated. Sign in with your new password.",
      );
    } catch (e) {
      setError(explain(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-title"
      ref={root}
    >
      <div className="auth-card recovery-card">
        <button
          type="button"
          className="x"
          aria-label="Close password recovery"
          onClick={onClose}
        >
          ×
        </button>
        <p className="eyebrow">
          {step === "done"
            ? "You’re all set"
            : step === "reset"
              ? "Check your inbox"
              : "Account recovery"}
        </p>
        <h2 id="recovery-title">
          {step === "done"
            ? "Back to the loop."
            : step === "reset"
              ? "Enter your reset code."
              : "Forgot your password?"}
        </h2>
        <p className="sub">
          {step === "reset"
            ? "Enter the six-digit code from your email, then choose a new password. Stay on this page—there’s no link to open."
            : step === "request"
              ? "Enter your Savora account email. We’ll send a six-digit code you can enter here."
              : "Your account is ready to use again."}
        </p>
        {step !== "done" && (
          <form className="form" onSubmit={submit}>
            {step === "request" ? (
              <label>
                Email address
                <input
                  ref={emailInput}
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={254}
                  placeholder="you@example.com"
                />
              </label>
            ) : (
              <>
                <div className="recovery-email">
                  <span>{email}</span>
                  <button
                    type="button"
                    className="link"
                    disabled={busy}
                    onClick={() => {
                      setStep("request");
                      setError("");
                      setMessage("");
                    }}
                  >
                    Change email
                  </button>
                </div>
                <label>
                  6-digit reset code
                  <input
                    ref={codeInput}
                    className="passcode-input"
                    name="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    minLength={6}
                    required
                    placeholder="000000"
                    aria-describedby="code-help"
                    onInput={(e) => {
                      e.currentTarget.value = e.currentTarget.value
                        .replace(/[^0-9]/g, "")
                        .slice(0, 6);
                    }}
                  />
                </label>
                <p id="code-help" className="sub">
                  Codes expire after 10 minutes. Use your latest code. You can
                  try up to five times.
                </p>
                <PasswordField
                  label="New password"
                  minLength={12}
                  autoComplete="new-password"
                />
                <PasswordField
                  label="Confirm new password"
                  name="confirmPassword"
                  minLength={12}
                  autoComplete="new-password"
                />
                <p className="sub">
                  Use at least 12 characters for your new password.
                </p>
              </>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="notice success" role="status">
                {message}
              </p>
            )}
            <button className="btn lime wide" disabled={busy}>
              {busy
                ? "Please wait…"
                : step === "reset"
                  ? "Reset password"
                  : "Send reset code"}
            </button>
            {step === "request" ? (
              <button
                type="button"
                className="link"
                disabled={busy}
                onClick={() => {
                  if (emailInput.current?.reportValidity()) {
                    setEmail(email.trim().toLowerCase());
                    setStep("reset");
                    setError("");
                    setMessage("");
                  }
                }}
              >
                I already have a code
              </button>
            ) : (
              <button
                type="button"
                className="link resend-code"
                disabled={busy || cooldown > 0}
                onClick={sendCode}
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </button>
            )}
          </form>
        )}
        {step === "done" && (
          <p className="notice success" role="status">
            {message}
          </p>
        )}
        <button className="link recovery-back" type="button" onClick={onLogin}>
          {step === "done" ? "Sign in" : "← Back to sign in"}
        </button>
      </div>
    </div>
  );
}
