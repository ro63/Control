import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useStore } from "../store";
import { Btn, CountUp, Empty, EQ_STATUS, I, Modal, Ring, Toggle } from "../components/ui";
import type { IconName } from "../components/ui";
import { currentShift, faNum, formatDateJ, J_WEEKDAYS, SHIFTS, timeAgo, todayISO } from "../utils";

/* ============================================================
   تنظیمات شخصی‌سازی داشبورد (به‌ازای هر کاربر)
   ============================================================ */
interface DashPrefs { order: string[]; hidden: string[] }

const WIDGETS: { id: string; title: string; desc: string; icon: IconName; span: string }[] = [
  { id: "kpis", title: "شاخص‌های کلیدی امروز", desc: "بازدید، NOK، هشدار و تجهیزات", icon: "gauge", span: "lg:col-span-2" },
  { id: "doneChart", title: "روند بازدیدهای انجام‌شده", desc: "تعداد کنترل روزانه در هر روز", icon: "clipboard", span: "lg:col-span-2" },
  { id: "nokChart", title: "روند آیتم‌های NOK", desc: "موارد معیوب ثبت‌شده در هر روز", icon: "alert", span: "" },
  { id: "statusDonut", title: "وضعیت تجهیزات", desc: "فعال، در تعمیر، خارج از سرویس", icon: "gear", span: "" },
  { id: "nokByItem", title: "NOK به تفکیک شرح کنترل", desc: "پرتکرارترین آیتم‌های معیوب", icon: "checklist", span: "" },
  { id: "shiftChart", title: "توزیع بازدیدها در شیفت‌ها", desc: "عملکرد سه شیفت کاری", icon: "clock", span: "" },
  { id: "techBars", title: "عملکرد تکنسین‌ها", desc: "بازدید و NOK هر تکنسین", icon: "users", span: "" },
  { id: "pending", title: "انجام‌نشده‌های امروز", desc: "تجهیزاتی که هنوز کنترل نشده‌اند", icon: "flag", span: "" },
  { id: "nokAlerts", title: "آخرین هشدارهای NOK", desc: "شرح خرابی‌های اخیر", icon: "bell", span: "" },
];
const DEFAULT_ORDER = WIDGETS.map((w) => w.id);

function loadPrefs(userId: string): DashPrefs {
  try {
    const raw = localStorage.getItem(`nipco-dash-v2-${userId}`);
    if (raw) {
      const p = JSON.parse(raw) as DashPrefs;
      const known = new Set(DEFAULT_ORDER);
      const order = [...p.order.filter((id) => known.has(id)), ...DEFAULT_ORDER.filter((id) => !p.order.includes(id))];
      return { order, hidden: (p.hidden ?? []).filter((id) => known.has(id)) };
    }
  } catch { /* ignore */ }
  return { order: [...DEFAULT_ORDER], hidden: [] };
}

/* ============================================================
   نمودارها (SVG/DIV دست‌ساز با انیمیشن)
   ============================================================ */
function Bars({ data, labels, color = "var(--color-acc)", unit = "" }: { data: number[]; labels: string[]; color?: string; unit?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 60); return () => clearTimeout(t); }, [data]);
  const max = Math.max(...data, 1);
  return (
    <div>
      <div className="flex items-end gap-1 h-36">
        {data.map((v, i) => (
          <div key={i} className="group relative flex-1 h-full flex items-end min-w-0">
            <div className="w-full rounded-t-[5px] transition-all duration-700 ease-out group-hover:opacity-80"
              style={{ height: on ? `${Math.max((v / max) * 100, v > 0 ? 5 : 2)}%` : "2%", background: v > 0 ? color : "var(--color-line)" }} />
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-navy text-white text-[10px] font-bold rounded-md px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              {labels[i]}: {faNum(v)}{unit}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1.5">
        {labels.map((l, i) => (
          <div key={i} className="flex-1 text-center text-[9.5px] font-bold text-mist truncate min-w-0">{data.length <= 14 || i % 2 === 0 ? l : ""}</div>
        ))}
      </div>
    </div>
  );
}

function Area({ data, labels, color = "var(--color-nok)" }: { data: number[]; labels: string[]; color?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 60); return () => clearTimeout(t); }, [data]);
  const W = 560, H = 175, P = 10;
  const max = Math.max(...data, 1);
  const n = data.length;
  const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(n - 1, 1);
  const y = (v: number) => H - P - 14 - (v / max) * (H - 2 * P - 24);
  const line = data.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${H - P} L${x(0).toFixed(1)},${H - P} Z`;
  const gid = useMemo(() => `ag-${Math.random().toString(36).slice(2, 7)}`, []);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={P} x2={W - P} y1={H - P - 14 - f * (H - 2 * P - 24)} y2={H - P - 14 - f * (H - 2 * P - 24)} stroke="var(--color-line)" strokeDasharray="3 4" strokeWidth="1" />
        ))}
        <path d={area} fill={`url(#${gid})`} style={{ opacity: on ? 1 : 0, transition: "opacity 0.9s ease" }} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          pathLength={1} strokeDasharray={1} strokeDashoffset={on ? 0 : 1} style={{ transition: "stroke-dashoffset 1.1s ease" }} />
        {data.map((v, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(v)} r="3.4" fill="#fff" stroke={color} strokeWidth="2" style={{ opacity: on ? 1 : 0, transition: `opacity 0.3s ease ${0.05 * i}s` }}>
              <title>{`${labels[i]} — ${faNum(v)} مورد NOK`}</title>
            </circle>
          </g>
        ))}
        <text x={P} y={H - P - 14 - (H - 2 * P - 24)} fontSize="11" fill="var(--color-mist)" fontWeight="700">{faNum(max)}</text>
      </svg>
      <div className="flex gap-1 -mt-1">
        {labels.map((l, i) => (
          <div key={i} className="flex-1 text-center text-[9.5px] font-bold text-mist truncate min-w-0">{data.length <= 14 || i % 2 === 0 ? l : ""}</div>
        ))}
      </div>
    </div>
  );
}

function Donut({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 80); return () => clearTimeout(t); }, [segments]);
  const total = segments.reduce((a, s) => a + s.value, 0);
  const R = 52, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0">
        <svg width="132" height="132" viewBox="0 0 132 132">
          <circle cx="66" cy="66" r={R} fill="none" stroke="var(--color-paper)" strokeWidth="16" />
          {segments.map((s) => {
            const frac = total ? s.value / total : 0;
            const dash = on ? frac * C : 0;
            const off = -acc * C;
            acc += frac;
            return <circle key={s.label} cx="66" cy="66" r={R} fill="none" stroke={s.color} strokeWidth="16" strokeLinecap="butt"
              strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={off} transform="rotate(-90 66 66)"
              style={{ transition: "stroke-dasharray 0.9s ease, stroke-dashoffset 0.9s ease" }} />;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl text-ink leading-6">{faNum(total)}</span>
          <span className="text-[9.5px] font-bold text-mist">تجهیز</span>
        </div>
      </div>
      <div className="space-y-2 flex-1 min-w-0">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: s.color }} />
            <span className="text-[11.5px] font-bold text-steel flex-1 truncate">{s.label}</span>
            <span className="text-[11.5px] font-bold text-ink num-ltr">{faNum(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HBars({ rows }: { rows: { label: string; value: number; color: string; extra?: ReactNode }[] }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 60); return () => clearTimeout(t); }, [rows]);
  const max = Math.max(...rows.map((r) => r.value), 1);
  if (!rows.length) return <Empty icon="chart" title="داده‌ای نیست" sub="با فیلترهای فعلی موردی ثبت نشده." />;
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11.5px] font-bold text-steel truncate flex-1 min-w-0 ml-2">{r.label}</span>
            <span className="flex items-center gap-1.5 shrink-0">
              {r.extra}
              <span className="font-display text-sm text-ink">{faNum(r.value)}</span>
            </span>
          </div>
          <div className="h-2.5 bg-paper rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: on ? `${(r.value / max) * 100}%` : "0%", background: r.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   قاب ویجت
   ============================================================ */
function Frame({ w, children, onHide }: { w: (typeof WIDGETS)[number]; children: ReactNode; onHide: () => void }) {
  return (
    <section className={`group bg-card border border-line rounded-xl overflow-hidden hover:shadow-lg hover:shadow-navy/6 hover:-translate-y-0.5 transition-all duration-200 ${w.span}`}>
      <header className="flex items-center gap-2 px-4 pt-3.5 pb-2.5 border-b border-line/70">
        <span className="w-1 h-5 rounded-full bg-acc" />
        <I name={w.icon} size={15} className="text-acc" />
        <h3 className="font-display text-[15px] text-ink leading-5">{w.title}</h3>
        <span className="text-[10px] text-mist font-semibold hidden xl:inline">— {w.desc}</span>
        <button onClick={onHide} title="پنهان کردن از داشبورد"
          className="mr-auto p-1 rounded-md text-mist opacity-0 group-hover:opacity-100 hover:text-nok hover:bg-nokbg transition-all">
          <I name="eyeOff" size={14} />
        </button>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

/* ============================================================
   داشبورد
   ============================================================ */
export function Dashboard({ goScan }: { goScan: (code: string) => void }) {
  const { state, user, can, activeRecords } = useStore();
  const today = todayISO();
  const [range, setRange] = useState<7 | 14 | 30>(7);
  const [fGroup, setFGroup] = useState("");
  const [fShift, setFShift] = useState("");
  const [fTech, setFTech] = useState("");
  const [settings, setSettings] = useState(false);
  const [prefs, setPrefs] = useState<DashPrefs>(() => loadPrefs(user?.id ?? "anon"));
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    if (user) localStorage.setItem(`nipco-dash-v2-${user.id}`, JSON.stringify(prefs));
  }, [prefs, user]);

  /* ---------- داده‌های محاسباتی ---------- */
  const d = useMemo(() => {
    const eqOf = (id: string) => state.equipment.find((e) => e.id === id);
    let recs = activeRecords;
    if (fGroup) recs = recs.filter((r) => eqOf(r.equipmentId)?.typeId === fGroup);
    if (fShift) recs = recs.filter((r) => r.shift === +fShift);
    if (fTech) recs = recs.filter((r) => r.technicianId === fTech);

    const dayList = Array.from({ length: range }, (_, i) => {
      const dt = new Date(); dt.setDate(dt.getDate() - (range - 1 - i));
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    });
    const inRange = recs.filter((r) => r.date >= dayList[0]);
    const wd = (iso: string) => J_WEEKDAYS[(new Date(iso + "T12:00:00").getDay() + 1) % 7].slice(0, 2);
    const labels = dayList.map((iso) => `${wd(iso)} ${faNum(isoToDay(iso))}`);

    const perDay = dayList.map((date) => {
      const rr = inRange.filter((r) => r.date === date);
      const items = rr.flatMap((r) => r.items);
      return { date, done: rr.length, nok: items.filter((i) => i.result === "nok").length, items: items.length };
    });

    const nokByItem = new Map<string, { n: number; note: string; at: string; eq: string }>();
    inRange.forEach((r) => r.items.filter((i) => i.result === "nok").forEach((i) => {
      const cur = nokByItem.get(i.itemId) ?? { n: 0, note: "", at: "", eq: "" };
      cur.n += 1;
      if (!cur.at || r.createdAt > cur.at) { cur.at = r.createdAt; cur.note = i.note; cur.eq = eqOf(r.equipmentId)?.name ?? ""; }
      nokByItem.set(i.itemId, cur);
    }));
    const topNok = [...nokByItem.entries()]
      .map(([itemId, v]) => ({ itemId, title: state.items.find((x) => x.id === itemId)?.title ?? "آیتم حذف‌شده", ...v }))
      .sort((a, b) => b.n - a.n).slice(0, 7);

    const techMap = new Map<string, { done: number; nok: number }>();
    inRange.forEach((r) => {
      const cur = techMap.get(r.technicianId) ?? { done: 0, nok: 0 };
      cur.done += 1; cur.nok += r.items.filter((i) => i.result === "nok").length;
      techMap.set(r.technicianId, cur);
    });
    const techs = [...techMap.entries()]
      .map(([id, v]) => ({ id, name: state.users.find((u) => u.id === id)?.fullName ?? "—", ...v }))
      .sort((a, b) => b.done - a.done);

    const shifts = [1, 2, 3].map((s) => {
      const rr = inRange.filter((r) => r.shift === s);
      return { s, done: rr.length, nok: rr.flatMap((r) => r.items).filter((i) => i.result === "nok").length };
    });

    /* امروز (برای KPI و لیست انجام‌نشده) — فقط فیلتر گروه و تکنسین */
    let todayRecs = activeRecords.filter((r) => r.date === today);
    if (fGroup) todayRecs = todayRecs.filter((r) => eqOf(r.equipmentId)?.typeId === fGroup);
    if (fTech) todayRecs = todayRecs.filter((r) => r.technicianId === fTech);
    const todayItems = todayRecs.flatMap((r) => r.items);
    const todayNok = todayItems.filter((i) => i.result === "nok").length;
    const todayWarn = todayItems.filter((i) => i.result === "ok" && i.note.trim()).length;

    const accessibleEq = state.equipment.filter((e) => e.status === "active" && (!fGroup || e.typeId === fGroup) && (!user?.formAccess.length || user.formAccess.includes(e.typeId)));
    const doneIds = new Set(todayRecs.map((r) => r.equipmentId));
    const pending = accessibleEq.filter((e) => !doneIds.has(e.id));
    const progress = accessibleEq.length ? (accessibleEq.length - pending.length) / accessibleEq.length : 0;
    const activeTotal = accessibleEq.length;

    const nokAlerts = inRange
      .filter((r) => r.items.some((i) => i.result === "nok"))
      .flatMap((r) => r.items.filter((i) => i.result === "nok").map((i) => ({ r, i })))
      .sort((a, b) => b.r.createdAt.localeCompare(a.r.createdAt)).slice(0, 6);

    const statusCounts = (["active", "repair", "out", "inactive"] as const).map((s) => ({
      s, n: state.equipment.filter((e) => e.status === s && (!fGroup || e.typeId === fGroup)).length,
    }));

    return { perDay, labels, topNok, techs, shifts, todayRecs, todayNok, todayWarn, pending, progress, activeTotal, nokAlerts, statusCounts };
  }, [state, activeRecords, range, fGroup, fShift, fTech, today, user]);

  const maxDone = Math.max(...d.perDay.map((p) => p.done), 1);
  const sh = currentShift();
  const filtered = !!(fGroup || fShift || fTech);

  const setOrder = (order: string[]) => setPrefs((p) => ({ ...p, order }));
  const setHidden = (hidden: string[]) => setPrefs((p) => ({ ...p, hidden }));
  const move = (id: string, dir: -1 | 1) => {
    const o = [...prefs.order];
    const i = o.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= o.length) return;
    [o[i], o[j]] = [o[j], o[i]];
    setOrder(o);
  };
  const onDrop = (target: string) => {
    if (!dragId || dragId === target) return;
    const o = prefs.order.filter((id) => id !== dragId);
    o.splice(o.indexOf(target) + (prefs.order.indexOf(dragId) < prefs.order.indexOf(target) ? 1 : 0), 0, dragId);
    setOrder(o);
    setDragId(null);
  };

  /* ---------- محتوای هر ویجت ---------- */
  const renderWidget = (id: string) => {
    switch (id) {
      case "kpis":
        return (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[
              { l: "بازدید امروز", v: d.todayRecs.length, icon: "clipboard" as IconName, cls: "text-info", bg: "bg-infobg" },
              { l: "مورد NOK امروز", v: d.todayNok, icon: "alert" as IconName, cls: "text-nok", bg: "bg-nokbg" },
              { l: "هشدار / بررسی", v: d.todayWarn, icon: "flag" as IconName, cls: "text-warn", bg: "bg-warnbg" },
              { l: "تجهیز فعال", v: d.statusCounts.find((x) => x.s === "active")?.n ?? 0, icon: "power" as IconName, cls: "text-ok", bg: "bg-okbg" },
              { l: "بازدید معوق", v: d.pending.length, icon: "clock" as IconName, cls: "text-accd", bg: "bg-accbg" },
            ].map((k) => (
              <div key={k.l} className="bg-card border border-line rounded-lg px-3 py-3 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                <div className={`w-8 h-8 rounded-lg ${k.bg} ${k.cls} flex items-center justify-center mb-2`}><I name={k.icon} size={16} /></div>
                <div className={`font-display text-2xl leading-6 ${k.cls}`}><CountUp to={k.v} /></div>
                <div className="text-[10.5px] text-mist font-bold mt-0.5">{k.l}</div>
              </div>
            ))}
          </div>
        );
      case "doneChart":
        return <Bars data={d.perDay.map((p) => p.done)} labels={d.labels} color="var(--color-acc)" />;
      case "nokChart":
        return <Area data={d.perDay.map((p) => p.nok)} labels={d.labels} />;
      case "statusDonut":
        return <Donut segments={d.statusCounts.map(({ s, n }) => ({ label: EQ_STATUS[s].label, value: n, color: s === "active" ? "#157f52" : s === "repair" ? "#a86f0c" : s === "out" ? "#d5382e" : "#94a3b8" }))} />;
      case "nokByItem":
        return <HBars rows={d.topNok.map((t) => ({ label: t.title, value: t.n, color: "var(--color-nok)", extra: <span className="text-[9.5px] font-bold text-mist truncate max-w-[90px] hidden sm:inline">{t.eq}</span> }))} />;
      case "techBars":
        return <HBars rows={d.techs.map((t) => ({ label: t.name, value: t.done, color: "var(--color-info)", extra: t.nok ? <span className="text-[9.5px] font-bold bg-nokbg text-nok rounded px-1 py-0.5">{faNum(t.nok)} NOK</span> : undefined }))} />;
      case "shiftChart":
        return (
          <div className="grid grid-cols-3 gap-2.5">
            {d.shifts.map(({ s, done, nok }) => (
              <div key={s} className={`rounded-lg border p-3 text-center transition-all duration-200 hover:-translate-y-0.5 ${s === sh ? "border-acc bg-accbg/40" : "border-line bg-paper/40"}`}>
                <div className="text-[10px] font-bold text-mist">{SHIFTS[s as 1 | 2 | 3].name}</div>
                <div className="text-[9px] text-mist font-semibold num-ltr" dir="ltr">{SHIFTS[s as 1 | 2 | 3].range}</div>
                <div className="font-display text-2xl text-ink mt-1.5">{faNum(done)}</div>
                <div className="text-[9.5px] font-bold mt-0.5">{nok ? <span className="text-nok">{faNum(nok)} NOK</span> : <span className="text-mist">بدون NOK</span>}</div>
                <div className="h-1.5 bg-line/60 rounded-full mt-2 overflow-hidden"><div className="h-full bg-acc rounded-full" style={{ width: `${(done / maxDone) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        );
      case "pending":
        return d.pending.length === 0 ? (
          <div className="text-center py-4">
            <span className="w-12 h-12 rounded-full bg-okbg text-ok flex items-center justify-center mx-auto mb-2"><I name="check" size={22} /></span>
            <p className="text-[13px] font-bold text-ok">همه تجهیزات فعال امروز کنترل شده‌اند</p>
            <p className="text-[11px] text-mist font-semibold mt-1">آفرین! بازدید معوقی باقی نمانده است.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pl-1">
            {d.pending.map((e) => (
              <div key={e.id} className="flex items-center gap-2.5 border-r-[3px] border-nok bg-nokbg/30 rounded-lg px-3 py-2 hover:bg-nokbg/50 transition-colors">
                <I name="flag" size={15} className="text-nok shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-bold text-ink truncate">{e.name}</p>
                  <p className="text-[10px] text-mist font-semibold num-ltr" dir="ltr">{e.code} • {state.groups.find((g) => g.id === e.typeId)?.name}</p>
                </div>
                {can("inspections.create") && <Btn size="sm" variant="outline" onClick={() => goScan(e.qr)}><I name="qr" size={12} />ثبت</Btn>}
              </div>
            ))}
          </div>
        );
      case "nokAlerts":
        return d.nokAlerts.length === 0 ? (
          <div className="text-center py-4">
            <span className="w-12 h-12 rounded-full bg-okbg text-ok flex items-center justify-center mx-auto mb-2"><I name="check" size={22} /></span>
            <p className="text-[13px] font-bold text-ok">هیچ مورد NOK در این بازه نیست</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pl-1">
            {d.nokAlerts.map(({ r, i }, idx) => {
              const def = state.items.find((x) => x.id === i.itemId);
              const eq = state.equipment.find((e) => e.id === r.equipmentId);
              const tech = state.users.find((u) => u.id === r.technicianId);
              return (
                <div key={idx} className="border-r-[3px] border-warn bg-warnbg/30 rounded-lg px-3 py-2 hover:bg-warnbg/50 transition-colors">
                  <div className="flex items-center gap-1.5">
                    <I name="alert" size={13} className="text-warn shrink-0" />
                    <p className="text-[12px] font-bold text-ink truncate flex-1">{def?.title ?? "—"} <span className="text-mist font-semibold">— {eq?.name}</span></p>
                  </div>
                  {i.note && <p className="text-[11px] text-steel font-semibold mt-1 leading-4">{i.note}</p>}
                  <p className="text-[9.5px] text-mist font-bold mt-1">{tech?.fullName} • {timeAgo(r.createdAt)} • {faNum(r.time)}</p>
                </div>
              );
            })}
          </div>
        );
      default:
        return null;
    }
  };

  const visible = prefs.order.filter((id) => !prefs.hidden.includes(id));

  return (
    <div className="space-y-4">
      {/* ---------- تابلوی فرمان ---------- */}
      <div className="bg-navy blueprint rounded-xl text-white overflow-hidden corner-frame">
        <div className="hazard h-1.5" />
        <div className="p-5 flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="flex items-center gap-4">
            <Ring value={d.progress} label="پیشرفت امروز" />
            <div>
              <h2 className="font-display text-2xl leading-7">تابلوی کنترل روزانه</h2>
              <p className="text-white/55 text-[12.5px] font-semibold mt-1">
                {faNum(d.activeTotal - d.pending.length)} از {faNum(d.activeTotal)} تجهیز فعال، امروز کنترل شده‌اند
                <span className="inline-flex items-center gap-1 mr-2 bg-white/8 border border-white/10 rounded px-1.5 py-0.5 text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-acc live-dot" />{SHIFTS[sh].name}</span>
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {d.statusCounts.map(({ s, n }) => (
                  <span key={s} className="inline-flex items-center gap-1.5 bg-white/8 border border-white/10 rounded-md px-2 py-1 text-[10.5px] font-bold">
                    <span className={`w-2 h-2 rounded-full ${EQ_STATUS[s].dot}`} />{EQ_STATUS[s].label}: {faNum(n)}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="lg:mr-auto flex items-center gap-2">
            {can("inspections.create") && (
              <Btn variant="primary" size="lg" onClick={() => goScan("")}><I name="qr" size={17} />شروع اسکن و بازدید</Btn>
            )}
            <button onClick={() => setSettings(true)} title="شخصی‌سازی داشبورد"
              className="inline-flex items-center gap-1.5 bg-white/8 border border-white/12 rounded-lg px-3 py-2.5 text-[12.5px] font-bold hover:bg-white/15 hover:border-acc transition-all active:scale-95">
              <I name="gear" size={16} className="text-acc" />چیدمان داشبورد
            </button>
          </div>
        </div>
      </div>

      {/* ---------- نوار فیلتر ---------- */}
      <div className="bg-card border border-line rounded-xl px-4 py-3 flex flex-wrap items-center gap-2 sticky top-[64px] z-30 shadow-sm">
        <span className="text-[11.5px] font-bold text-mist flex items-center gap-1"><I name="filter" size={13} />فیلتر نمودارها:</span>
        <div className="inline-flex rounded-lg border border-line bg-paper p-0.5 gap-0.5">
          {([7, 14, 30] as const).map((r) => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${range === r ? "bg-navy text-white" : "text-mist hover:text-ink"}`}>{faNum(r)} روز</button>
          ))}
        </div>
        <select className="field !py-1.5 !text-[12px] !w-auto" value={fGroup} onChange={(e) => setFGroup(e.target.value)}>
          <option value="">همه گروه‌ها</option>
          {state.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select className="field !py-1.5 !text-[12px] !w-auto" value={fShift} onChange={(e) => setFShift(e.target.value)}>
          <option value="">همه شیفت‌ها</option>
          {([1, 2, 3] as const).map((s) => <option key={s} value={s}>{SHIFTS[s].name}</option>)}
        </select>
        <select className="field !py-1.5 !text-[12px] !w-auto" value={fTech} onChange={(e) => setFTech(e.target.value)}>
          <option value="">همه تکنسین‌ها</option>
          {state.users.filter((u) => u.role !== "viewer").map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
        </select>
        {filtered && (
          <button onClick={() => { setFGroup(""); setFShift(""); setFTech(""); }}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-nok hover:bg-nokbg rounded-md px-2 py-1 transition-colors">
            <I name="x" size={11} />پاک کردن فیلترها
          </button>
        )}
        <span className="mr-auto text-[10.5px] font-bold text-mist hidden sm:inline">{faNum(visible.length)} ویجت فعال</span>
      </div>

      {/* ---------- شبکه ویجت‌ها ---------- */}
      {visible.length === 0 ? (
        <div className="bg-card border border-line rounded-xl">
          <Empty icon="gauge" title="همه ویجت‌ها پنهان شده‌اند" sub="از دکمه «چیدمان داشبورد» ویجت‌های موردنظرتان را فعال کنید."
            action={<Btn onClick={() => setSettings(true)}><I name="gear" size={15} />شخصی‌سازی داشبورد</Btn>} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visible.map((id, idx) => {
            const w = WIDGETS.find((x) => x.id === id)!;
            return (
              <div key={id} className={w.span} style={{ animation: `fadeUp 0.45s ease ${Math.min(idx * 0.05, 0.4)}s both` }}>
                <Frame w={w} onHide={() => setHidden([...prefs.hidden, id])}>{renderWidget(id)}</Frame>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------- مودال شخصی‌سازی ---------- */}
      <Modal open={settings} onClose={() => setSettings(false)} title="شخصی‌سازی داشبورد" icon="gear" w="max-w-lg">
        <p className="text-[12px] text-mist font-semibold leading-5 mb-3">
          ویجت‌ها را با کشیدن جابه‌جا کنید یا با کلید نمایش، مخفی کنید. چیدمان برای حساب شما ذخیره می‌شود.
        </p>
        <div className="space-y-1.5 max-h-96 overflow-y-auto pl-1">
          {prefs.order.map((id) => {
            const w = WIDGETS.find((x) => x.id === id)!;
            const hidden = prefs.hidden.includes(id);
            return (
              <div key={id} draggable onDragStart={() => setDragId(id)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(id)}
                className={`flex items-center gap-2.5 border rounded-lg px-3 py-2.5 transition-all cursor-grab active:cursor-grabbing ${dragId === id ? "border-acc bg-accbg/40 opacity-60" : "border-line bg-card hover:border-acc/40"} ${hidden ? "opacity-55" : ""}`}>
                <span className="text-mist"><I name="list" size={16} /></span>
                <I name={w.icon} size={15} className={hidden ? "text-mist" : "text-acc"} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-bold text-ink truncate">{w.title}</p>
                  <p className="text-[10px] text-mist font-semibold truncate">{w.desc}</p>
                </div>
                <button onClick={() => move(id, -1)} className="p-1 rounded text-mist hover:text-ink hover:bg-paper" title="بالا"><I name="chevron" size={14} className="rotate-180" /></button>
                <button onClick={() => move(id, 1)} className="p-1 rounded text-mist hover:text-ink hover:bg-paper" title="پایین"><I name="chevron" size={14} /></button>
                <Toggle on={!hidden} onChange={(v) => setHidden(v ? prefs.hidden.filter((h) => h !== id) : [...prefs.hidden, id])} />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between items-center mt-4">
          <Btn variant="ghost" size="sm" onClick={() => setPrefs({ order: [...DEFAULT_ORDER], hidden: [] })}><I name="refresh" size={13} />بازنشانی پیش‌فرض</Btn>
          <Btn variant="dark" onClick={() => setSettings(false)}>ذخیره و بستن</Btn>
        </div>
      </Modal>
    </div>
  );
}

function isoToDay(iso: string): number {
  return parseInt(iso.slice(8, 10), 10);
}
