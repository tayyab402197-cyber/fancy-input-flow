import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { KeyRound, Lock, Mail } from "lucide-react";
import { toast } from "sonner";

import { VoltScene } from "@/components/auth/chef-volt";
import { EMAIL_RE, useChefVolt } from "@/hooks/use-chef-volt";
import { ApiError, api } from "@/lib/api/client";
import { AUTH } from "@/lib/api/endpoints";
import { passwordProblem } from "@/lib/auth";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search["email"] === "string" ? (search["email"] as string) : undefined,
    code: typeof search["code"] === "string" ? (search["code"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Set a New Password — Kennedy Moon Grill" },
      {
        name: "description",
        content:
          "Enter the code we emailed you and choose a new password for your Kennedy Moon Grill account.",
      },
      { property: "og:title", content: "Set a New Password — Kennedy Moon Grill" },
      {
        property: "og:description",
        content: "Use your emailed reset code to set a new Kennedy Moon Grill password.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const volt = useChefVolt("Pick a password worth guarding.");
  const [email, setEmail] = useState(search.email ?? "");
  const [code, setCode] = useState(search.code ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    if (!EMAIL_RE.test(email.trim())) return volt.complain("That email isn't a real address.");
    if (code.trim().length < 4) return volt.complain("Enter the code from your email.");
    const problem = passwordProblem(password);
    if (problem) return volt.complain(problem);
    if (password !== confirm) return volt.complain("Both passwords must match.");

    setIsSubmitting(true);
    try {
      await api.post(AUTH.passwordResetConfirm, {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        new_password: password,
      });
      volt.celebrate("Password updated. Sign in with the new one!");
      toast.success("Password updated", { description: "You can sign in now." });
      void navigate({ to: "/login" });
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.status === 400
            ? err.message || "That code is invalid or expired."
            : err.message
          : (err as Error)?.message || "Could not reset your password";
      volt.complain(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <VoltScene
      volt={volt}
      eyebrow="Account recovery"
      title="New password"
      subtitle="Enter the code we emailed you, then choose a new password."
      footer={
        <>
          Didn't get a code?{" "}
          <Link to="/forgot-password" className="font-extrabold text-flame hover:underline">
            Send it again
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        <label className="auth-field-wrap block">
          <Mail className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
          <input
            type="email"
            value={email}
            placeholder="Email on your account"
            className="auth-field"
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="auth-field-wrap block">
          <KeyRound className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
          <input
            type="text"
            inputMode="numeric"
            value={code}
            placeholder="6-digit code"
            className="auth-field tracking-[0.35em]"
            autoComplete="one-time-code"
            maxLength={6}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
        </label>

        <label className="auth-field-wrap block">
          <Lock className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
          <input
            type="password"
            value={password}
            placeholder="New password (8+, letters & numbers)"
            className="auth-field"
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <label className="auth-field-wrap block">
          <Lock className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
          <input
            type="password"
            value={confirm}
            placeholder="Confirm new password"
            className="auth-field"
            autoComplete="new-password"
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>

        <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting} className="auth-cta">
          {isSubmitting ? <span className="btn-spinner" aria-hidden /> : <span aria-hidden>🍕</span>}
          {isSubmitting ? <span className="btn-dots">Updating</span> : "Update password"}
        </button>
      </form>
    </VoltScene>
  );
}
