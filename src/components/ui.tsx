import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { EquipmentStatus, Role } from "../types";
import { isoToJalali, jalaliToISO, J_MONTHS, faNum } from "../utils";
import { useStore } from "../store";

/* ============================ Icons ============================ */
const P: Record<string, ReactNode> = {
  gauge: <><path d="M12 15l3.5-5.5" /><path d="M20.5 15.5a9 9 0 1 0-17 0" /><path d="M4 19h16" /></>,
  qr: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 14h1M14 20h1M18 18h3v3h-3z" /></>,
  clipboard: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4a2 2 0 0 1 6 0" /><path d="M9 11h6M9 15h4" /></>,
  wrench: <path d="M14.7 6.3a4.5 4.5 0 0 0-6 5.6L3 17.6V21h3.4l5.7-5.7a4.5 4.5 0 0 0 5.6-6L14.6 12l-2.6-2.6 2.7-3.1z" />,
  checklist: <><path d="M4 6l1.5 1.5L8 5" /><path d="M4 12l1.5 1.5L8 11" /><path d="M4 18l1.5 1.5L8 17" /><path d="M11 6.5h9M11 12.5h9M11 18.5h9" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M17.5 14.2a6.5 6.5 0 0 1 4 5.8" /></>,
  chart: <><path d="M4 4v16h16" /><path d="M8 16v-5M12 16V8M16 16v-8M20 16V6" /></>,
  bell: <><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 20a2.2 2.2 0 0 0 4 0" /></>,
  list: <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></>,
  archive: <><rect x="3" y="4" width="18" height="5" rx="1" /><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" /><path d="M10 13h4" /></>,
  logout: <><path d="M14 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8" /><path d="M17 8l4 4-4 4M21 12H10" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  pencil: <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
  trash: <><path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></>,
  x: <path d="M18 6L6 18M6 6l12 12" />,
  check: <path d="M4 12.5l5 5L20 6.5" />,
  alert: <><path d="M12 3L1.8 20.2h20.4L12 3z" /><path d="M12 10v4.5" /><circle cx="12" cy="17.5" r="0.4" /></>,
  camera: <><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.5" /></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
  video: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10.5l5-3v9l-5-3" /></>,
  printer: <><path d="M7 8V3h10v5" /><rect x="3" y="8" width="18" height="9" rx="1" /><path d="M7 14h10v7H7z" /></>,
  download: <><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M4 21h16" /></>,
  upload: <><path d="M12 15V3" /><path d="M7 8l5-5 5 5" /><path d="M4 21h16" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.5-4.5" /></>,
  chevron: <path d="M6 9l6 6 6-6" />,
  eye: <><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" /><circle cx="12" cy="12" r="2.8" /></>,
  eyeOff: <><path d="M4 4l16 16" /><path d="M9.9 5.2A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9M6.1 6.6A16.5 16.5 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 4-.8" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  phone: <path d="M5 3h4l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z" />,
  filter: <path d="M3 5h18l-7 8v5l-4 3v-8L3 5z" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
  zap: <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />,
  shield: <><path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3z" /><path d="M9 12l2 2 4-4.5" /></>,
  box: <><path d="M3 7l9-4 9 4v10l-9 4-9-4V7z" /><path d="M3 7l9 4 9-4M12 11v10" /></>,
  refresh: <><path d="M20 11a8 8 0 1 0-2.3 6.3" /><path d="M20 4v7h-7" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  pin: <><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.6" /><path d="M21 15l-5-5-9 10" /></>,
  power: <><path d="M12 3v8" /><path d="M6.3 6.5a8 8 0 1 0 11.4 0" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" /></>,
  send: <><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  sms: <><path d="M21 12a8 8 0 0 1-8 8H4l2-3.2A8 8 0 1 1 21 12z" /><path d="M8.5 12h.01M12 12h.01M15.5 12h.01" /></>,
  keyboard: <><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6" /></>,
  flag: <><path d="M5 21V4" /><path d="M5 4h13l-2.5 4L18 12H5" /></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 8v4l3 2" /></>,
  key: <><circle cx="8" cy="15" r="4.5" /><path d="M11.5 11.5L20 3M16 7l3 3M13.5 9.5l2 2" /></>,
};
export type IconName = keyof typeof P;
export function I({ name, size = 18, className = "" }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden>
      {P[name]}
    </svg>
  );
}

/* ============================ Buttons ============================ */
export function Btn({ children, onClick, variant = "primary", size = "md", className = "", disabled, type = "button", title }: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "dark" | "ghost" | "danger" | "ok" | "outline";
  size?: "sm" | "md" | "lg"; className?: string; disabled?: boolean; type?: "button" | "submit"; title?: string;
}) {
  const base = "inline-flex items-center justify-center gap-1.5 font-semibold rounded-lg transition-all duration-150 active:scale-[0.97] disabled:opacity-45 disabled:pointer-events-none whitespace-nowrap";
  const sizes = { sm: "text-xs px-2.5 py-1.5", md: "text-sm px-3.5 py-2", lg: "text-base px-5 py-2.5" };
  const variants = {
    primary: "bg-acc text-white hover:bg-accd shadow-sm shadow-acc/30",
    dark: "bg-navy text-white hover:bg-navy3",
    ghost: "bg-transparent text-steel hover:bg-navy/5",
    outline: "border-[1.5px] border-line bg-card text-ink hover:border-acc hover:text-acc",
    danger: "bg-nok text-white hover:brightness-110",
    ok: "bg-ok text-white hover:brightness-110",
  };
  return <button title={title} type={type} disabled={disabled} onClick={onClick} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>{children}</button>;
}

/* ============================ Badges ============================ */
export const EQ_STATUS: Record<EquipmentStatus, { label: string; cls: string; dot: string }> = {
  active: { label: "فعال", cls: "bg-okbg text-ok border-ok/25", dot: "bg-ok" },
  inactive: { label: "غیرفعال", cls: "bg-paper text-mist border-line", dot: "bg-mist" },
  repair: { label: "در تعمیر", cls: "bg-warnbg text-warn border-warn/25", dot: "bg-warn" },
  out: { label: "خارج از سرویس", cls: "bg-nokbg text-nok border-nok/25", dot: "bg-nok" },
};
export const ROLES: Record<Role, string> = { admin: "مدیر سیستم", supervisor: "سرپرست نت", technician: "تکنسین نت", viewer: "مشاهده‌کننده" };
const ROLE_CLS: Record<Role, string> = {
  admin: "bg-acc/12 text-accd border-acc/30",
  supervisor: "bg-infobg text-info border-info/30",
  technician: "bg-okbg text-ok border-ok/25",
  viewer: "bg-paper text-mist border-line",
};
export function RoleBadge({ role }: { role: Role }) {
  return <span className={`inline-flex items-center gap-1 text-[11px] font-bold border rounded-md px-1.5 py-0.5 ${ROLE_CLS[role]}`}><I name="shield" size={11} />{ROLES[role]}</span>;
}
export function ResultChip({ r, small }: { r: "ok" | "nok"; small?: boolean }) {
  return r === "ok"
    ? <span className={`inline-flex items-center gap-1 font-bold ${small ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"} rounded-md bg-ok text-white`}><I name="check" size={small ? 10 : 12} />سالم</span>
    : <span className={`inline-flex items-center gap-1 font-bold ${small ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"} rounded-md bg-nok text-white`}><I name="x" size={small ? 10 : 12} />معیوب</span>;
}

/* ============================ Segmented OK/NOK ============================ */
export function OkNokSeg({ value, onChange, compact }: { value: "ok" | "nok" | null; onChange: (v: "ok" | "nok") => void; compact?: boolean }) {
  return (
    <div className={`inline-flex rounded-lg border border-line bg-paper p-0.5 gap-0.5 ${compact ? "" : "w-full max-w-[210px]"}`}>
      {(["ok", "nok"] as const).map((v) => (
        <button key={v} type="button" onClick={() => onChange(v)}
          className={`flex-1 min-w-[64px] inline-flex items-center justify-center gap-1 rounded-md font-bold text-xs transition-all duration-150 active:scale-95 ${compact ? "px-2 py-1" : "px-3 py-1.5"} ${
            value === v ? (v === "ok" ? "bg-ok text-white shadow-sm" : "bg-nok text-white shadow-sm") : "text-mist hover:bg-card hover:text-ink"}`}>
          <I name={v === "ok" ? "check" : "x"} size={13} />{v === "ok" ? "OK" : "NOK"}
        </button>
      ))}
    </div>
  );
}

/* ============================ Toggle ============================ */
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="inline-flex items-center gap-2 group">
      <span className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 ${on ? "bg-ok" : "bg-mist/40"}`}>
        <span className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${on ? "right-[21px]" : "right-[3px]"}`} />
      </span>
      {label && <span className={`text-xs font-semibold ${on ? "text-ok" : "text-mist"}`}>{label}</span>}
    </button>
  );
}

/* ============================ Field ============================ */
export function Field({ label, error, children, req, className = "" }: { label: string; error?: string; children: ReactNode; req?: boolean; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[12px] font-bold text-steel mb-1">{label}{req && <span className="text-nok"> *</span>}</span>
      {children}
      {error && <span className="block text-[11px] text-nok font-semibold mt-1 anim-fade-up">{error}</span>}
    </label>
  );
}

/* ============================ Modal ============================ */
export function Modal({ open, onClose, title, children, w = "max-w-lg", icon }: { open: boolean; onClose: () => void; title: string; children: ReactNode; w?: string; icon?: IconName }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-navy/65" onMouseDown={onClose} />
      <div className={`relative w-full ${w} bg-card border border-line rounded-t-2xl sm:rounded-xl shadow-2xl anim-pop max-h-[92vh] flex flex-col`}>
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-line shrink-0">
          <span className="w-2 h-6 bg-acc rounded-sm" />
          {icon && <I name={icon} size={17} className="text-acc" />}
          <h3 className="font-display text-lg text-ink leading-6 flex-1">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-paper text-mist hover:text-nok transition-colors"><I name="x" size={16} /></button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function Confirm({ open, onClose, onYes, title, body, yesLabel = "بله، حذف شود" }: { open: boolean; onClose: () => void; onYes: () => void; title: string; body: string; yesLabel?: string }) {
  return (
    <Modal open={open} onClose={onClose} title={title} w="max-w-sm" icon="alert">
      <p className="text-sm text-steel leading-6">{body}</p>
      <div className="flex gap-2 justify-end mt-5">
        <Btn variant="ghost" onClick={onClose}>انصراف</Btn>
        <Btn variant="danger" onClick={() => { onYes(); onClose(); }}>{yesLabel}</Btn>
      </div>
    </Modal>
  );
}

/* ============================ Reveal / CountUp / Ring ============================ */
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add("is-in"); ob.disconnect(); } }, { threshold: 0.08 });
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  return <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` } as CSSProperties}>{children}</div>;
}

export function CountUp({ to, duration = 900, className = "" }: { to: number; duration?: number; className?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <span className={className}>{faNum(v)}</span>;
}

export function Ring({ value, size = 92, stroke = 9, color = "var(--color-acc)", label }: { value: number; size?: number; stroke?: number; color?: string; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [p, setP] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setP(Math.max(0, Math.min(1, value))), 60);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-line)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} style={{ transition: "stroke-dashoffset 1s cubic-bezier(.22,.9,.35,1)" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xl leading-6 text-ink">{faNum(Math.round(value * 100))}٪</span>
        {label && <span className="text-[10px] text-mist font-semibold">{label}</span>}
      </div>
    </div>
  );
}

/* ============================ Jalali date input ============================ */
export function JalaliDateInput({ value, onChange, clearable }: { value: string; onChange: (iso: string) => void; clearable?: boolean }) {
  const j = value ? isoToJalali(value) : null;
  const nowJ = isoToJalali(new Date().toISOString().slice(0, 10));
  const years = Array.from({ length: 7 }, (_, i) => nowJ.jy - 4 + i);
  const sel = "field !py-1.5 !px-2 !text-[13px] font-semibold";
  return (
    <div className="flex gap-1.5 items-center">
      <select className={sel} value={j?.jy ?? ""} onChange={(e) => e.target.value && onChange(jalaliToISO(+e.target.value, j?.jm ?? 1, j?.jd ?? 1))}>
        <option value="">سال</option>{years.map((y) => <option key={y} value={y}>{faNum(y)}</option>)}
      </select>
      <select className={sel} value={j?.jm ?? ""} onChange={(e) => e.target.value && j && onChange(jalaliToISO(j.jy, +e.target.value, j.jd))}>
        <option value="">ماه</option>{J_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
      </select>
      <select className={sel} value={j?.jd ?? ""} onChange={(e) => e.target.value && j && onChange(jalaliToISO(j.jy, j.jm, +e.target.value))}>
        <option value="">روز</option>{Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{faNum(i + 1)}</option>)}
      </select>
      {clearable && value && (
        <button type="button" onClick={() => onChange("")} className="text-mist hover:text-nok p-1"><I name="x" size={13} /></button>
      )}
    </div>
  );
}

/* ============================ Empty state ============================ */
export function Empty({ icon = "box", title, sub, action }: { icon?: IconName; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center anim-fade-up">
      <div className="w-14 h-14 rounded-xl bg-paper border border-line flex items-center justify-center text-mist mb-3"><I name={icon} size={26} /></div>
      <p className="font-display text-lg text-ink">{title}</p>
      {sub && <p className="text-sm text-mist mt-1 max-w-xs leading-6">{sub}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ============================ Toasts ============================ */
export function Toasts() {
  const { toasts, dismissToast } = useStore();
  const cls = { success: "border-ok/30 text-ok", error: "border-nok/30 text-nok", info: "border-info/30 text-info" };
  const icons: Record<string, IconName> = { success: "check", error: "alert", info: "bell" };
  return (
    <div className="fixed bottom-20 md:bottom-5 left-4 z-[70] flex flex-col gap-2 w-[min(92vw,340px)]">
      {toasts.map((t) => (
        <div key={t.id} className={`bg-card border ${cls[t.type]} rounded-lg shadow-lg px-3.5 py-2.5 flex items-center gap-2.5 anim-fade-up`}>
          <I name={icons[t.type]} size={17} />
          <p className="text-[13px] font-bold text-ink flex-1 leading-5">{t.msg}</p>
          <button onClick={() => dismissToast(t.id)} className="text-mist hover:text-nok"><I name="x" size={13} /></button>
        </div>
      ))}
    </div>
  );
}
