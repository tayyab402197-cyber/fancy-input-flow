import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { toast } from "sonner";

import { VoltScene } from "@/components/auth/chef-volt";
import { EMAIL_RE, useChefVolt } from "@/hooks/use-chef-volt";
import { ApiError, api } from "@/lib/api/client";
import { AUTH } from "@/lib/api/endpoints";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Your Password — Kennedy Moon Grill" },
      {
        name: "description",
        content:
          "Forgot your Kennedy Moon Grill password? Enter your email and we'll send you a secure reset link.",
      },
      { property: "og:title", content: "Reset Your Password — Kennedy Moon Grill" },
      {
        property: "og:description",
        content: "Send yourself a secure password reset link for your Kennedy Moon Grill account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const volt = useChefVolt("Locked out? Happens to the best chefs.");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting || sent) return;
    if (!EMAIL_RE.test(email.trim())) {
      volt.complain("That email isn't a real delivery address.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post(AUTH.passwordReset, { email: email.trim().toLowerCase() });
      setSent(true);
      volt.celebrate("Reset link sent. Check your inbox!");
      toast.success("Reset link sent", { description: "Check your email for the reset link." });
    } catch (err: unknown) {
      // Never reveal whether an account exists — treat 404 as success.
      if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
        setSent(true);
        volt.celebrate("If that email is registered, the reset link is on its way.");
      } else {
        const msg =
          err instanceof ApiError ? err.message : (err as Error)?.message || "Could not send reset link";
        volt.complain(msg);
        toast.error(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <VoltScene
      volt={volt}
      eyebrow="Account recovery"
      title="Forgot password"
      subtitle="Enter the email on your account and we'll send a secure reset link."
      footer={
        <>
          Remembered it?{" "}
          <Link to="/login" className="font-extrabold text-flame hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="space-y-4">
          <p className="rounded-xl bg-flame/10 px-4 py-3 text-[13px] font-semibold text-charcoal/80">
            If <strong className="text-charcoal">{email.trim().toLowerCase()}</strong> is registered, a
            6-digit reset code is on its way. It expires in 10 minutes.
          </p>
          <Link
            to="/reset-password"
            search={{ email: email.trim().toLowerCase(), code: undefined }}
            className="auth-cta"
          >
            <span aria-hidden>🍕</span> Enter my code
          </Link>
          <Link to="/login" className="block text-center font-body text-[13px] font-semibold text-charcoal/60 hover:text-flame">
            Back to sign in
          </Link>
        </div>

      ) : (
        <form onSubmit={submit} className="space-y-5">
          <label className="auth-field-wrap block">
            <Mail className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
            <input
              type="email"
              value={email}
              placeholder="Email on your account"
              className="auth-field"
              autoComplete="email"
              onChange={(e) => {
                setEmail(e.target.value);
                volt.follow(e.target.value);
              }}
            />
          </label>

          <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting} className="auth-cta">
            {isSubmitting ? <span className="btn-spinner" aria-hidden /> : <span aria-hidden>🍕</span>}
            {isSubmitting ? <span className="btn-dots">Sending your link</span> : "Send reset link"}
          </button>
        </form>
      )}
    </VoltScene>
  );
}
