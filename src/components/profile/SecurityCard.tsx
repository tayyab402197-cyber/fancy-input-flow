/**
 * Account security card — Django endpoints:
 *   POST /api/auth/send-otp/            -> emails a 6-digit code (10 min)
 *   POST /api/auth/verify-otp/  {code}  -> profile.is_email_verified = true
 *   POST /api/profile/change-password/  {current_password, new_password}
 */
import { useState } from "react";
import { BadgeCheck, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { ApiError, api } from "@/lib/api/client";
import { AUTH, PROFILE } from "@/lib/api/endpoints";
import { passwordProblem } from "@/lib/auth";

const msg = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.message || fallback : (err as Error)?.message || fallback;

export function SecurityCard({ verified }: { verified?: boolean }) {
  const [emailVerified, setEmailVerified] = useState(!!verified);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  async function sendOtp() {
    setOtpBusy(true);
    try {
      await api.post(AUTH.sendOtp, {});
      setOtpSent(true);
      toast.success("Code sent", { description: "Check your inbox — it expires in 10 minutes." });
    } catch (err) {
      toast.error(msg(err, "Could not send the code"));
    } finally {
      setOtpBusy(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.trim().length !== 6) {
      toast.error("Enter the 6-digit code.");
      return;
    }
    setOtpBusy(true);
    try {
      await api.post(AUTH.verifyOtp, { code: otp.trim() });
      setEmailVerified(true);
      setOtp("");
      toast.success("Email verified");
    } catch (err) {
      toast.error(msg(err, "That code is invalid or expired"));
    } finally {
      setOtpBusy(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const complaint =
      (!current && "Enter your current password.") ||
      passwordProblem(next) ||
      (next !== confirm && "Both new passwords must match.");
    if (complaint) {
      toast.error(complaint);
      return;
    }
    setPwBusy(true);
    try {
      await api.post(PROFILE.changePassword, { current_password: current, new_password: next });
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("Password updated");
    } catch (err) {
      toast.error(msg(err, "Could not change your password"));
    } finally {
      setPwBusy(false);
    }
  }

  const field =
    "w-full rounded-2xl border-2 border-charcoal/12 bg-white/80 px-4 py-3 font-body text-sm text-charcoal placeholder:text-charcoal/40 focus:border-flame focus:outline-none";
  const btn =
    "inline-flex items-center justify-center gap-2 rounded-full border-2 border-charcoal/12 bg-white/70 px-5 py-2.5 font-display text-[11px] font-extrabold uppercase tracking-[0.16em] text-charcoal/70 hover:border-flame hover:text-flame disabled:opacity-50";

  return (
    <section className="rounded-[1.75rem] border-2 border-charcoal/10 bg-white/60 p-4 sm:p-5">
      <h2 className="flex items-center gap-2 font-display text-sm font-extrabold uppercase tracking-[0.18em] text-charcoal">
        <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Security
      </h2>

      {/* email verification */}
      <div className="mt-3 rounded-2xl border-2 border-charcoal/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-display text-xs font-extrabold uppercase tracking-[0.14em] text-charcoal">
            <BadgeCheck
              className={`h-4 w-4 ${emailVerified ? "text-flame" : "text-charcoal/35"}`}
              aria-hidden="true"
            />
            Email {emailVerified ? "verified" : "not verified"}
          </p>
          {!emailVerified && (
            <button type="button" onClick={() => void sendOtp()} disabled={otpBusy} className={btn}>
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
              {otpSent ? "Resend code" : "Send code"}
            </button>
          )}
        </div>

        {!emailVerified && otpSent && (
          <form onSubmit={verifyOtp} className="mt-3 flex flex-wrap gap-3">
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit code"
              className={`${field} max-w-[12rem] tracking-[0.3em]`}
            />
            <button type="submit" disabled={otpBusy} className={btn}>
              Verify
            </button>
          </form>
        )}
      </div>

      {/* change password */}
      <form onSubmit={changePassword} className="mt-3 space-y-3 rounded-2xl border-2 border-charcoal/10 p-4">
        <p className="flex items-center gap-2 font-display text-xs font-extrabold uppercase tracking-[0.14em] text-charcoal">
          <Lock className="h-4 w-4" aria-hidden="true" /> Change password
        </p>
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Current password"
          autoComplete="current-password"
          className={field}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="New password (8+, letters & numbers)"
            autoComplete="new-password"
            className={field}
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            className={field}
          />
        </div>
        <button type="submit" disabled={pwBusy} className={btn}>
          {pwBusy ? "Updating…" : "Update password"}
        </button>
      </form>
    </section>
  );
}
