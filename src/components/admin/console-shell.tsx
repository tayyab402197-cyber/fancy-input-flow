import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type ConsoleNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

/**
 * Shared luxury console chrome for the owner + rider apps.
 * Desktop: fixed champagne rail. Mobile: sticky brass top bar with a slide-out
 * drawer plus a thumb-reachable bottom tab bar.
 */
export function ConsoleShell({
  brand,
  title,
  badge,
  nav,
  sidebar,
  footer,
  children,
}: {
  brand: string;
  title: string;
  badge: ReactNode;
  nav: readonly ConsoleNavItem[];
  sidebar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const rail = (
    <div className="flex h-full flex-col gap-6 px-5 py-6">
      <div>
        <p className="eyebrow">{brand}</p>
        <h1 className="num-lux mt-1 text-2xl leading-none text-frost">{title}</h1>
        <div className="mt-2">{badge}</div>
      </div>

      {sidebar}

      <nav className="flex flex-col gap-1.5">
        {nav.map(({ to, label, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: Boolean(exact) }}
            activeProps={{
              className:
                "bg-gradient-to-r from-lux/25 to-transparent text-lux border-lux/40 shadow-[inset_0_1px_0_oklch(1_0_0/0.08)]",
            }}
            className="inline-flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-mist/80 transition hover:border-lux/20 hover:bg-lux/5 hover:text-frost"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      {footer ? <div className="mt-auto space-y-2 pb-4">{footer}</div> : null}
    </div>
  );

  return (
    <div className="console-shell min-h-screen text-frost">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 lg:hidden">
        <div className="flex items-center gap-3 border-b border-lux/15 bg-ink-deep/85 px-4 py-3 backdrop-blur-xl">
        <button
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="icon-3d h-10 w-10 text-lux transition-transform duration-200 active:scale-90"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <p className="eyebrow leading-none">{brand}</p>
          <p className="num-lux truncate text-lg leading-tight text-frost">{title}</p>
        </div>
        <div className="ml-auto shrink-0">{badge}</div>
        </div>
        <div className="gold-bar" />
      </header>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink-deep/80 backdrop-blur-sm"
          />
          <aside className="console-shell lux-rise absolute inset-y-0 left-0 w-[86%] max-w-xs overflow-y-auto border-r border-lux/20 shadow-lux-lift">
            <button
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-lux/25 text-lux"
            >
              <X className="h-4 w-4" />
            </button>
            {rail}
          </aside>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-[1500px] flex-col lg:flex-row">
        <aside className="hidden border-lux/10 lg:sticky lg:top-0 lg:block lg:h-screen lg:w-64 lg:shrink-0 lg:overflow-y-auto lg:border-r">
          {rail}
        </aside>

        <main className="min-w-0 flex-1 px-3 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-10 lg:pt-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-lux/15 bg-ink-deep/90 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <ul className="flex items-stretch">
          {nav.map(({ to, label, icon: Icon, exact }) => (
            <li key={to} className="min-w-0 flex-1">
              <Link
                to={to}
                activeOptions={{ exact: Boolean(exact) }}
                activeProps={{ className: "tab-3d-active" }}
                className={cn(
                  "tab-3d group flex flex-col items-center gap-1 px-1 py-2.5 text-[9px] font-black uppercase tracking-[0.12em] text-slate-dim",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="w-full truncate text-center">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
