import type { ReactNode } from "react";
import {
  BadgeCheck,
  Bike,
  CheckCircle2,
  ChefHat,
  Hourglass,
  PackageCheck,
  Search,
  X as XIcon,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar as RBar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import {
  money,
  PAY_STATUS_LABEL,
  STATUS_LABEL,
  type OrderStatus,
  type PaymentStatus,
  type Priority,
} from "@/lib/admin-store";

/* ----------------------------------------------------------------- badges */

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "border-lux/45 bg-lux/12 text-lux",
  confirmed: "border-azure/45 bg-azure/12 text-azure",
  kitchen: "border-amber-lux/45 bg-amber-lux/12 text-amber-lux",
  packed: "border-violet-lux/45 bg-violet-lux/12 text-violet-lux",
  onway: "border-azure/55 bg-azure/15 text-azure",
  delivered: "border-jade/45 bg-jade/12 text-jade",
  cancelled: "border-ruby/45 bg-ruby/12 text-ruby",
};

const STATUS_ICONS: Record<OrderStatus, LucideIcon> = {
  pending: Hourglass,
  confirmed: CheckCircle2,
  kitchen: ChefHat,
  packed: PackageCheck,
  onway: Bike,
  delivered: BadgeCheck,
  cancelled: XCircle,
};

/** Statuses that are still "in motion" get a live pulse. */
const LIVE_STATUSES: OrderStatus[] = ["pending", "confirmed", "kitchen", "packed", "onway"];

const PAY_STYLES: Record<PaymentStatus, string> = {
  pending: "border-lux/45 bg-lux/12 text-lux",
  verified: "border-jade/45 bg-jade/12 text-jade",
  failed: "border-ruby/45 bg-ruby/12 text-ruby",
  refunded: "border-line bg-frost/5 text-mist",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const Icon = STATUS_ICONS[status];
  const live = LIVE_STATUSES.includes(status);
  return (
    <span
      className={cn(
        "status-chip inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
        STATUS_STYLES[status],
        live && "status-chip-live",
      )}
    >
      <span className="relative flex h-1.5 w-1.5 items-center justify-center">
        {live ? (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-70" />
        ) : null}
        <span className="relative h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      <Icon className={cn("h-3 w-3", status === "onway" && "status-chip-ride")} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.14em]",
        PAY_STYLES[status],
      )}
    >
      {PAY_STATUS_LABEL[status]}
    </span>
  );
}

export function PriorityTag({ priority }: { priority: Priority }) {
  if (priority === "normal") return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.2em]",
        priority === "vip"
          ? "border-lux bg-lux/18 text-lux"
          : "border-ruby/60 bg-ruby/14 text-ruby",
      )}
    >
      {priority}
    </span>
  );
}

/* ------------------------------------------------------------- containers */

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("panel-lux panel-lift lux-rise overflow-hidden", className)}>
      {title || action ? (
        <header className="panel-hairline flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            {title ? (
              <h2 className="text-[11px] font-black uppercase tracking-[0.22em] text-frost">
                {title}
              </h2>
            ) : null}
            {subtitle ? <p className="mt-1 text-xs text-slate-dim">{subtitle}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="lux-rise flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="num-lux mt-1 text-3xl text-frost sm:text-4xl">{title}</h1>
        <div className="gold-bar mt-2 w-24 rounded-full" />
        {subtitle ? <p className="mt-2 max-w-2xl text-sm text-slate-dim">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

const TONES = {
  plain: { ring: "border-line/70", text: "text-frost", glow: "oklch(0.858 0.132 88 / 0.1)" },
  gold: { ring: "border-lux/35", text: "text-lux", glow: "oklch(0.858 0.132 88 / 0.16)" },
  flame: { ring: "border-amber-lux/35", text: "text-amber-lux", glow: "oklch(0.828 0.168 66 / 0.16)" },
  good: { ring: "border-jade/35", text: "text-jade", glow: "oklch(0.786 0.142 162 / 0.16)" },
  bad: { ring: "border-ruby/35", text: "text-ruby", glow: "oklch(0.652 0.222 27.5 / 0.16)" },
  info: { ring: "border-azure/35", text: "text-azure", glow: "oklch(0.752 0.158 48 / 0.16)" },
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "plain",
  trend,
  series,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: keyof typeof TONES;
  trend?: number;
  series?: number[];
}) {
  const t = TONES[tone];
  return (
    <div
      className={cn(
        "panel-lux lux-rise card-3d relative overflow-hidden p-4 sm:p-5",
        t.ring,
      )}
      style={{ backgroundImage: `radial-gradient(420px 140px at 100% 0%, ${t.glow}, transparent 70%)` }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-dim sm:tracking-[0.22em]">{label}</p>
        {icon ? <span className={cn("icon-3d shrink-0", t.text)}>{icon}</span> : null}
      </div>
      <p className={cn("num-lux mt-2 text-2xl sm:mt-3 sm:text-3xl", t.text)}>{value}</p>
      <div className="mt-1 flex items-center gap-2">
        {hint ? <p className="text-[11px] text-slate-dim">{hint}</p> : null}
        {typeof trend === "number" ? (
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-black",
              trend >= 0 ? "bg-jade/12 text-jade" : "bg-ruby/12 text-ruby",
            )}
          >
            {trend >= 0 ? "▲" : "▼"} {Math.abs(Math.round(trend))}%
          </span>
        ) : null}
      </div>
      {series && series.length > 1 ? (
        <div className="mt-3 h-10">
          <Sparkline data={series} tone={tone} />
        </div>
      ) : null}
    </div>
  );
}

/** Gold-trimmed animated search field used across the console. */
export function LuxSearch({
  value,
  onChange,
  placeholder = "Search",
  className,
  ariaLabel = "Search",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={cn("lux-search group", className)}>
      <Search className="lux-search-icon h-4 w-4" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="lux-search-input"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="lux-search-clear"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}


export function Money({ value, className }: { value: number; className?: string }) {
  return <span className={cn("font-bold tabular-nums", className)}>{money(value)}</span>;
}

/* ----------------------------------------------------------------- inputs */

export const fieldClass = "field-lux";
export const labelClass = "text-[10px] font-black uppercase tracking-[0.2em] text-slate-dim";

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className={labelClass}>{label}</span>
      {children}
      {hint ? <span className="block text-[11px] text-slate-dim">{hint}</span> : null}
    </label>
  );
}

type BtnProps = {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
};

export function GoldButton({ children, onClick, disabled, className, type = "button" }: BtnProps) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cn("btn-lux", className)}>
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, disabled, className, type = "button" }: BtnProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn("btn-ghost-lux", className)}
    >
      {children}
    </button>
  );
}

export function DangerButton({ children, onClick, disabled, className, type = "button" }: BtnProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn("btn-danger-lux", className)}
    >
      {children}
    </button>
  );
}

export function SegmentedTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: { id: T; label: string; count?: number }[];
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-2xl border border-line/70 bg-ink/60 p-1">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              "rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition",
              active
                ? "bg-gradient-to-br from-lux/30 to-lux/5 text-lux shadow-[inset_0_0_0_1px_oklch(0.845_0.126_88/0.35)]"
                : "text-slate-dim hover:text-frost",
            )}
          >
            {o.label}
            {typeof o.count === "number" ? (
              <span className={cn("ml-1.5 tabular-nums", active ? "text-lux/70" : "text-slate-dim/70")}>
                {o.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function Bar({ value, max, tone = "gold" }: { value: number; max: number; tone?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const fills: Record<string, string> = {
    gold: "from-lux to-lux-deep",
    jade: "from-jade to-azure",
    azure: "from-azure to-violet-lux",
    ruby: "from-ruby to-amber-lux",
  };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-frost/8">
      <div
        className={cn("h-full rounded-full bg-gradient-to-r", fills[tone] ?? fills.gold)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line/80 px-5 py-10 text-center text-sm text-slate-dim">
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ charts */

export const CHART = {
  lux: "oklch(0.858 0.132 88)",
  luxDeep: "oklch(0.702 0.138 72)",
  jade: "oklch(0.786 0.142 162)",
  azure: "oklch(0.752 0.158 48)",
  ruby: "oklch(0.652 0.222 27.5)",
  violet: "oklch(0.7 0.135 348)",
  amber: "oklch(0.828 0.168 66)",
  grid: "oklch(0.372 0.028 52 / 0.5)",
  axis: "oklch(0.668 0.027 70)",
};

export const CHART_PALETTE = [
  CHART.lux,
  CHART.azure,
  CHART.jade,
  CHART.violet,
  CHART.amber,
  CHART.ruby,
];

const axisProps = {
  stroke: CHART.axis,
  tick: { fill: CHART.axis, fontSize: 10, fontWeight: 700 },
  tickLine: false,
  axisLine: false,
} as const;

function LuxTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string }[];
  label?: string | number;
  formatter?: (value: number, name: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-lux/25 bg-ink-deep/95 px-3 py-2 shadow-lux backdrop-blur">
      {label != null ? (
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-lux/80">{label}</p>
      ) : null}
      <ul className="mt-1 space-y-0.5">
        {payload.map((p, i) => (
          <li key={i} className="flex items-center gap-2 text-xs text-frost">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-dim">{p.name}</span>
            <span className="ml-auto font-bold tabular-nums">
              {formatter ? formatter(Number(p.value), String(p.name)) : String(p.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Sparkline({ data, tone = "gold" }: { data: number[]; tone?: keyof typeof TONES }) {
  const color =
    tone === "good"
      ? CHART.jade
      : tone === "bad"
        ? CHART.ruby
        : tone === "info"
          ? CHART.azure
          : tone === "flame"
            ? CHART.amber
            : CHART.lux;
  const rows = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={rows} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`spark-${tone}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          fill={`url(#spark-${tone})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function LuxAreaChart<T extends Record<string, unknown>>({
  data,
  xKey,
  areas,
  height = 260,
  moneyFormat = true,
}: {
  data: T[];
  xKey: keyof T & string;
  areas: { key: keyof T & string; name: string; color: string }[];
  height?: number;
  moneyFormat?: boolean;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -12 }}>
          <defs>
            {areas.map((a) => (
              <linearGradient key={a.key} id={`lux-a-${a.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={a.color} stopOpacity={0.45} />
                <stop offset="100%" stopColor={a.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey={xKey} {...axisProps} />
          <YAxis {...axisProps} width={54} />
          <Tooltip
            content={
              <LuxTooltip
                formatter={(value) => (moneyFormat ? money(value) : String(value))}
              />
            }
            cursor={{ stroke: CHART.lux, strokeOpacity: 0.25 }}
          />
          {areas.map((a) => (
            <Area
              isAnimationActive={false}
              key={a.key}
              name={a.name}
              type="monotone"
              dataKey={a.key}
              stroke={a.color}
              strokeWidth={2.5}
              fill={`url(#lux-a-${a.key})`}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}


export function RevenueChart({
  data,
  height = 280,
}: {
  data: { day: string; revenue: number; orders: number; delivered?: number }[];
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.lux} stopOpacity={0.45} />
              <stop offset="100%" stopColor={CHART.lux} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="ordFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.azure} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CHART.azure} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey="day" {...axisProps} />
          <YAxis {...axisProps} width={54} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
          <Tooltip
            content={
              <LuxTooltip
                formatter={(value, name) => (name === "Revenue" ? money(value) : String(value))}
              />
            }
            cursor={{ stroke: CHART.lux, strokeOpacity: 0.25 }}
          />
          <Area
              isAnimationActive={false}
            name="Revenue"
            type="monotone"
            dataKey="revenue"
            stroke={CHART.lux}
            strokeWidth={2.5}
            fill="url(#revFill)"
          />
          <Area
              isAnimationActive={false}
            name="Orders"
            type="monotone"
            dataKey="orders"
            stroke={CHART.azure}
            strokeWidth={2}
            fill="url(#ordFill)"
            yAxisId={0}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ColumnChart({
  data,
  xKey,
  bars,
  height = 240,
  moneyFormat,
  stacked,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  bars: { key: string; name: string; color: string }[];
  height?: number;
  moneyFormat?: boolean;
  stacked?: boolean;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }} barGap={4}>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey={xKey} {...axisProps} />
          <YAxis {...axisProps} width={52} />
          <Tooltip
            content={
              <LuxTooltip formatter={(v) => (moneyFormat ? money(v) : String(v))} />
            }
            cursor={{ fill: "oklch(0.858 0.132 88 / 0.07)" }}
          />
          {bars.length > 1 ? (
            <Legend
              iconType="circle"
              wrapperStyle={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: CHART.axis }}
            />
          ) : null}
          {bars.map((b) => (
            <RBar
              key={b.key}
              dataKey={b.key}
              name={b.name}
              fill={b.color}
              radius={[6, 6, 0, 0]}
              stackId={stacked ? "a" : undefined}
              maxBarSize={34}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendLines({
  data,
  xKey,
  lines,
  height = 240,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  lines: { key: string; name: string; color: string }[];
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey={xKey} {...axisProps} />
          <YAxis {...axisProps} width={48} />
          <Tooltip content={<LuxTooltip />} cursor={{ stroke: CHART.lux, strokeOpacity: 0.2 }} />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: CHART.axis }}
          />
          {lines.map((l) => (
            <Line
              isAnimationActive={false}
              key={l.key}
              type="monotone"
              dataKey={l.key}
              name={l.name}
              stroke={l.color}
              strokeWidth={2.5}
              dot={{ r: 2.5, strokeWidth: 0, fill: l.color }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({
  data,
  height = 240,
  centerLabel,
  centerValue,
  moneyFormat,
}: {
  data: { name: string; value: number; color?: string }[];
  height?: number;
  centerLabel?: string;
  centerValue?: string;
  moneyFormat?: boolean;
}) {
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<LuxTooltip formatter={(v) => (moneyFormat ? money(v) : String(v))} />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="58%"
            outerRadius="88%"
            paddingAngle={2}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((d, i) => (
              <Cell key={d.name} fill={d.color ?? CHART_PALETTE[i % CHART_PALETTE.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {centerValue ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="num-lux text-2xl text-frost">{centerValue}</p>
          {centerLabel ? (
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-dim">
              {centerLabel}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function GaugeChart({
  value,
  max,
  label,
  color = CHART.lux,
  height = 180,
}: {
  value: number;
  max: number;
  label: string;
  color?: string;
  height?: number;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={[{ name: label, value: pct }]}
          innerRadius="72%"
          outerRadius="100%"
          startAngle={220}
          endAngle={-40}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={12} fill={color} background={{ fill: "oklch(0.372 0.028 52 / 0.45)" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="num-lux text-2xl text-frost">{pct}%</p>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-dim">{label}</p>
      </div>
    </div>
  );
}

export function Legendette({ items }: { items: { name: string; value: string; color: string }[] }) {
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.name} className="flex items-center gap-2 text-xs">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
          <span className="text-mist">{i.name}</span>
          <span className="ml-auto font-bold tabular-nums text-frost">{i.value}</span>
        </li>
      ))}
    </ul>
  );
}
