import { useMemo, useState } from "react";
import type { InspectionRecord } from "../types";
import { useStore } from "../store";
import { Btn, CountUp, Empty, EQ_STATUS, I, JalaliDateInput, ResultChip } from "../components/ui";
import { exportCSV, faNum, formatDateJ, isoToJalali, J_MONTHS, monthStartISO, printNow, SHIFTS, timeAgo, todayISO, toJalaali, weekStartISO } from "../utils";

type RepType = "daily" | "weekly" | "monthly" | "failures" | "pm" | "critical";

const TYPES: { id: RepType; label: string; icon: "clipboard" | "calendar" | "chart" | "alert" | "wrench" | "zap"; d: string }[] = [
  { id: "daily", label: "گزارش روزانه", icon: "clipboard", d: "به تفکیک دستگاه یا تکنسین" },
  { id: "weekly", label: "گزارش هفتگی", icon: "calendar", d: "روند روزهای هفته جاری" },
  { id: "monthly", label: "گزارش ماهانه", icon: "chart", d: "خلاصه عملکرد ماه" },
  { id: "failures", label: "گزارش خرابی‌ها", icon: "alert", d: "فهرست موارد NOK با شرح" },
  { id: "pm", label: "گزارش PM", icon: "wrench", d: "تکرار خرابی و اولویت تعمیرات" },
  { id: "critical", label: "تجهیزات بحرانی", icon: "zap", d: "وضعیت لحظه‌ای تجهیزات حیاتی" },
];

export function ReportsPage() {
  const { state, activeRecords, addLog, toast } = useStore();
  const [type, setType] = useState<RepType>("daily");
  const [sub, setSub] = useState<"device" | "tech">("device");
  const [from, setFrom] = useState(weekStartISO());
  const [to, setTo] = useState(todayISO());
  const [fGroup, setFGroup] = useState("");
  const [fEq, setFEq] = useState("");
  const [fTech, setFTech] = useState("");
  const [fShift, setFShift] = useState("");
  const [fResult, setFResult] = useState("");
  const [fItem, setFItem] = useState("");
  const [showFilter, setShowFilter] = useState(true);

  const eqInGroup = state.equipment.filter((e) => !fGroup || e.typeId === fGroup);

  const rows = useMemo(() => {
    let r = activeRecords.filter((x) => (!from || x.date >= from) && (!to || x.date <= to));
    if (fGroup) r = r.filter((x) => state.equipment.find((e) => e.id === x.equipmentId)?.typeId === fGroup);
    if (fEq) r = r.filter((x) => x.equipmentId === fEq);
    if (fTech) r = r.filter((x) => x.technicianId === fTech);
    if (fShift) r = r.filter((x) => x.shift === +fShift);
    if (fResult) r = r.filter((x) => (fResult === "nok" ? x.items.some((i) => i.result === "nok") : !x.items.some((i) => i.result === "nok")));
    if (fItem) r = r.filter((x) => x.items.some((i) => i.itemId === fItem));
    return r;
  }, [state, activeRecords, from, to, fGroup, fEq, fTech, fShift, fResult, fItem]);

  const totals = useMemo(() => {
    const items = rows.flatMap((r) => r.items);
    const nok = items.filter((i) => i.result === "nok").length;
    return { records: rows.length, items: items.length, nok, ok: items.length - nok, health: items.length ? Math.round(((items.length - nok) / items.length) * 100) : 100 };
  }, [rows]);

  const techName = (id: string) => state.users.find((u) => u.id === id)?.fullName ?? "—";
  const eqOf = (id: string) => state.equipment.find((e) => e.id === id);

  /* ---------- aggregations ---------- */
  const byDevice = useMemo(() => {
    const m = new Map<string, { n: number; nok: number; last: InspectionRecord | null; techs: Set<string> }>();
    rows.forEach((r) => {
      const cur = m.get(r.equipmentId) ?? { n: 0, nok: 0, last: null, techs: new Set<string>() };
      cur.n++; cur.nok += r.items.filter((i) => i.result === "nok").length;
      cur.techs.add(r.technicianId);
      if (!cur.last || r.createdAt > cur.last.createdAt) cur.last = r;
      m.set(r.equipmentId, cur);
    });
    return [...m.entries()];
  }, [rows]);

  const byTech = useMemo(() => {
    const m = new Map<string, { n: number; nok: number; items: number }>();
    rows.forEach((r) => {
      const cur = m.get(r.technicianId) ?? { n: 0, nok: 0, items: 0 };
      cur.n++; cur.nok += r.items.filter((i) => i.result === "nok").length; cur.items += r.items.length;
      m.set(r.technicianId, cur);
    });
    return [...m.entries()];
  }, [rows]);

  const byDay = useMemo(() => {
    const m = new Map<string, { n: number; nok: number; items: number }>();
    rows.forEach((r) => {
      const cur = m.get(r.date) ?? { n: 0, nok: 0, items: 0 };
      cur.n++; cur.nok += r.items.filter((i) => i.result === "nok").length; cur.items += r.items.length;
      m.set(r.date, cur);
    });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const failures = useMemo(
    () => rows.flatMap((r) => r.items.filter((i) => i.result === "nok").map((i) => ({ r, i }))).sort((a, b) => b.r.createdAt.localeCompare(a.r.createdAt)),
    [rows]
  );

  const pm = useMemo(() => {
    const m = new Map<string, { visits: number; nok: number; lastNok: string }>();
    rows.forEach((r) => {
      const cur = m.get(r.equipmentId) ?? { visits: 0, nok: 0, lastNok: "" };
      cur.visits++;
      const n = r.items.filter((i) => i.result === "nok").length;
      cur.nok += n;
      if (n > 0 && r.date > cur.lastNok) cur.lastNok = r.date;
      m.set(r.equipmentId, cur);
    });
    return [...m.entries()].filter(([, v]) => v.nok > 0).sort((a, b) => b[1].nok - a[1].nok);
  }, [rows]);

  const critical = state.equipment.filter((e) => e.critical);

  const periodLabel = from && to ? `${formatDateJ(from)} تا ${formatDateJ(to)}` : from ? `از ${formatDateJ(from)}` : to ? `تا ${formatDateJ(to)}` : "کل دوره";
  const jNow = toJalaali(new Date());

  /* ---------- export ---------- */
  const doExport = () => {
    const head = (extra: string[]): (string | number)[][] => [["گزارش NIPCO", TYPES.find((t) => t.id === type)?.label ?? "", periodLabel], ["تولید در", `${formatDateJ(todayISO())}`], [], extra];
    let out: (string | number)[][] = [];
    if (type === "daily" && sub === "device") out = head(["تجهیز", "کد", "گروه", "تعداد بازدید", "اقلام معیوب", "آخرین بازدید", "تکنسین‌ها"]).concat(byDevice.map(([id, v]) => [eqOf(id)?.name ?? id, eqOf(id)?.code ?? "", state.groups.find((g) => g.id === eqOf(id)?.typeId)?.name ?? "", v.n, v.nok, v.last ? `${formatDateJ(v.last.date)} ${v.last.time}` : "—", [...v.techs].map(techName).join("، ")]));
    else if (type === "daily") out = head(["تکنسین", "کد پرسنلی", "تعداد بازدید", "اقلام بررسی‌شده", "اقلام معیوب"]).concat(byTech.map(([id, v]) => { const u = state.users.find((x) => x.id === id); return [techName(id), u?.personnelCode ?? "", v.n, v.items, v.nok]; }));
    else if (type === "weekly" || type === "monthly") out = head(["تاریخ", "تعداد بازدید", "اقلام بررسی‌شده", "موارد NOK", "درصد سلامت"]).concat(byDay.map(([d, v]) => [formatDateJ(d), v.n, v.items, v.nok, v.items ? Math.round(((v.items - v.nok) / v.items) * 100) + "%" : "100%"]));
    else if (type === "failures") out = head(["تاریخ", "ساعت", "تجهیز", "آیتم", "مقدار", "شرح خرابی", "تکنسین", "شیفت"]).concat(failures.map(({ r, i }) => { const def = state.items.find((x) => x.id === i.itemId); return [formatDateJ(r.date), r.time, eqOf(r.equipmentId)?.name ?? "", def?.title ?? "", i.value ?? "", i.note, techName(r.technicianId), SHIFTS[r.shift].name]; }));
    else if (type === "pm") out = head(["تجهیز", "گروه", "تعداد بازدید", "موارد NOK", "آخرین خرابی", "بحرانی"]).concat(pm.map(([id, v]) => [eqOf(id)?.name ?? "", state.groups.find((g) => g.id === eqOf(id)?.typeId)?.name ?? "", v.visits, v.nok, v.lastNok ? formatDateJ(v.lastNok) : "—", eqOf(id)?.critical ? "بله" : "خیر"]));
    else out = head(["تجهیز", "کد", "وضعیت فعلی", "آخرین بازدید", "NOK در دوره"]).concat(critical.map((e) => { const recs = rows.filter((r) => r.equipmentId === e.id); const nok = recs.flatMap((r) => r.items).filter((i) => i.result === "nok").length; const last = [...recs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]; return [e.name, e.code, EQ_STATUS[e.status].label, last ? formatDateJ(last.date) : "—", nok]; }));
    exportCSV(`NIPCO-${type}-${from || "all"}-${to || "all"}`, out);
    addLog("خروجی گزارش", `Excel — ${TYPES.find((t) => t.id === type)?.label} (${periodLabel})`);
    toast("فایل Excel (CSV) دانلود شد");
  };

  const sel = "field !py-1.5 !text-[12.5px] !w-auto";
  const th = "text-right px-3.5 py-2.5 text-[11px] font-bold text-mist whitespace-nowrap";
  const td = "px-3.5 py-2.5 text-[12.5px] font-semibold text-steel";

  return (
    <div className="anim-fade-up">
      {/* type cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-4 stagger">
        {TYPES.map((t) => (
          <button key={t.id} onClick={() => setType(t.id)}
            className={`text-right rounded-xl border p-3 transition-all duration-150 active:scale-[0.97] ${type === t.id ? "bg-navy text-white border-navy shadow-lg shadow-navy/20" : "bg-card border-line hover:border-acc hover:-translate-y-0.5"}`}>
            <I name={t.icon} size={19} className={type === t.id ? "text-acc" : "text-acc"} />
            <p className={`text-[13px] font-bold mt-1.5 ${type === t.id ? "text-white" : "text-ink"}`}>{t.label}</p>
            <p className={`text-[10px] font-semibold mt-0.5 leading-4 ${type === t.id ? "text-white/55" : "text-mist"}`}>{t.d}</p>
          </button>
        ))}
      </div>

      {/* filters */}
      <div className="bg-card border border-line rounded-xl p-3.5 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowFilter(!showFilter)} className="inline-flex items-center gap-1.5 text-[12px] font-bold text-steel hover:text-acc transition-colors">
            <I name="filter" size={15} />فیلترها و بازه زمانی
            <I name="chevron" size={13} className={`transition-transform ${showFilter ? "rotate-180" : ""}`} />
          </button>
          <span className="text-[11px] font-bold text-mist bg-paper border border-line rounded-md px-2 py-1">{periodLabel}</span>
          <span className="mr-auto flex gap-1.5">
            <Btn size="sm" variant="ok" onClick={doExport}><I name="download" size={14} />Excel</Btn>
            <Btn size="sm" variant="dark" onClick={() => { addLog("چاپ گزارش", `${TYPES.find((t) => t.id === type)?.label} (${periodLabel})`); printNow(); }}><I name="printer" size={14} />PDF / چاپ</Btn>
          </span>
        </div>
        {showFilter && (
          <div className="mt-3 pt-3 border-t border-line anim-fade-up space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-mist w-14">از تاریخ:</span>
              <JalaliDateInput value={from} onChange={setFrom} clearable />
              <span className="text-[11px] font-bold text-mist w-14 mr-2">تا تاریخ:</span>
              <JalaliDateInput value={to} onChange={setTo} clearable />
              <div className="flex gap-1 mr-2">
                {[{ l: "امروز", f: todayISO(), t: todayISO() }, { l: "این هفته", f: weekStartISO(), t: todayISO() }, { l: "این ماه", f: monthStartISO(), t: todayISO() }, { l: "همه", f: "", t: "" }].map((q) => (
                  <button key={q.l} onClick={() => { setFrom(q.f); setTo(q.t); }}
                    className={`text-[10.5px] font-bold rounded-md px-2 py-1 border transition-all ${from === q.f && to === q.t ? "bg-acc text-white border-acc" : "border-line text-steel hover:border-acc hover:text-acc"}`}>{q.l}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <select className={sel} value={fGroup} onChange={(e) => { setFGroup(e.target.value); setFEq(""); }}>
                <option value="">همه گروه‌ها</option>{state.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <select className={sel} value={fEq} onChange={(e) => setFEq(e.target.value)}>
                <option value="">همه تجهیزات</option>{eqInGroup.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <select className={sel} value={fTech} onChange={(e) => setFTech(e.target.value)}>
                <option value="">همه تکنسین‌ها</option>{state.users.filter((u) => u.role !== "viewer").map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
              <select className={sel} value={fShift} onChange={(e) => setFShift(e.target.value)}>
                <option value="">همه شیفت‌ها</option>{([1, 2, 3] as const).map((s) => <option key={s} value={s}>{SHIFTS[s].name}</option>)}
              </select>
              <select className={sel} value={fResult} onChange={(e) => setFResult(e.target.value)}>
                <option value="">همه نتایج</option><option value="ok">فقط سالم</option><option value="nok">فقط دارای NOK</option>
              </select>
            </div>
            {/* فیلتر بر اساس عنوان آیتم */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-mist flex items-center gap-1"><I name="checklist" size={13} />فیلتر بر اساس عنوان آیتم:</span>
              <select className={`${sel} !min-w-[220px]`} value={fItem} onChange={(e) => setFItem(e.target.value)}>
                <option value="">همه آیتم‌های چک‌لیست</option>
                {state.sections.map((sec) => {
                  const secItems = state.items.filter((i) => i.sectionId === sec.id);
                  if (!secItems.length) return null;
                  return (
                    <optgroup key={sec.id} label={`— بخش ${sec.name} —`}>
                      {secItems.map((i) => <option key={i.id} value={i.id}>{i.title}{i.unit ? ` (${i.unit})` : ""}</option>)}
                    </optgroup>
                  );
                })}
              </select>
              {fItem && (
                <button onClick={() => setFItem("")} className="inline-flex items-center gap-1 text-[11px] font-bold text-nok hover:bg-nokbg rounded-md px-2 py-1 transition-colors">
                  <I name="x" size={11} />حذف فیلتر آیتم
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 mb-4">
        {[
          { l: "رکورد بازدید", v: totals.records, c: "text-info" },
          { l: "اقلام بررسی‌شده", v: totals.items, c: "text-ink" },
          { l: "موارد NOK", v: totals.nok, c: "text-nok" },
          { l: "موارد سالم", v: totals.ok, c: "text-ok" },
        ].map((s) => (
          <div key={s.l} className="bg-card border border-line rounded-xl px-3.5 py-2.5">
            <div className={`font-display text-2xl ${s.c}`}><CountUp to={s.v} /></div>
            <div className="text-[10.5px] text-mist font-bold">{s.l}</div>
          </div>
        ))}
        <div className="bg-navy blueprint rounded-xl px-3.5 py-2.5 text-white corner-frame">
          <div className="font-display text-2xl text-acc">{faNum(totals.health)}٪</div>
          <div className="text-[10.5px] text-white/55 font-bold">شاخص سلامت تجهیزات</div>
        </div>
      </div>

      {/* report body */}
      <div className="bg-card border border-line rounded-xl overflow-hidden">
        <div className="print-area">
          <div className="hidden print:block text-center mb-4">
            <h2 className="font-display text-2xl">NIPCO — {TYPES.find((t) => t.id === type)?.label}</h2>
            <p className="text-xs font-semibold text-mist">واحد نگهداری و تعمیرات • دوره: {periodLabel} • تولید: {formatDateJ(todayISO())} ({faNum(jNow.jy)}/{faNum(jNow.jm)}/{faNum(jNow.jd)})</p>
          </div>

          {type === "daily" && (
            <>
              <div className="flex items-center justify-between px-4 pt-3.5 no-print">
                <h3 className="font-display text-lg text-ink">گزارش روزانه — {sub === "device" ? "به تفکیک دستگاه" : "به تفکیک تکنسین"}</h3>
                <div className="inline-flex rounded-lg border border-line bg-paper p-0.5 gap-0.5">
                  {([["device", "دستگاه"], ["tech", "تکنسین"]] as const).map(([id, l]) => (
                    <button key={id} onClick={() => setSub(id)} className={`px-3 py-1 rounded-md text-[11.5px] font-bold transition-all ${sub === id ? "bg-navy text-white" : "text-mist hover:text-ink"}`}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto mt-2">
                {sub === "device" ? (
                  <table className="w-full">
                    <thead><tr className="bg-paper/80 border-b border-line"><th className={th}>تجهیز</th><th className={th}>کد</th><th className={`${th} hidden sm:table-cell`}>گروه</th><th className={th}>بازدیدها</th><th className={th}>NOK</th><th className={`${th} hidden md:table-cell`}>آخرین بازدید</th><th className={`${th} hidden lg:table-cell`}>تکنسین‌ها</th></tr></thead>
                    <tbody className="divide-y divide-line">
                      {byDevice.map(([id, v]) => (
                        <tr key={id} className="hover:bg-paper/50">
                          <td className={`${td} font-bold text-ink`}>{eqOf(id)?.name ?? "حذف‌شده"}</td>
                          <td className={`${td} num-ltr`} dir="ltr">{eqOf(id)?.code}</td>
                          <td className={`${td} hidden sm:table-cell`}>{state.groups.find((g) => g.id === eqOf(id)?.typeId)?.name}</td>
                          <td className={td}>{faNum(v.n)}</td>
                          <td className={td}>{v.nok ? <span className="text-nok font-bold">{faNum(v.nok)}</span> : <span className="text-ok">۰</span>}</td>
                          <td className={`${td} hidden md:table-cell`}>{v.last ? `${formatDateJ(v.last.date)} — ${faNum(v.last.time)}` : "—"}</td>
                          <td className={`${td} hidden lg:table-cell`}>{[...v.techs].map(techName).join("، ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full">
                    <thead><tr className="bg-paper/80 border-b border-line"><th className={th}>تکنسین</th><th className={th}>کد پرسنلی</th><th className={th}>بازدیدها</th><th className={th}>اقلام</th><th className={th}>NOK</th><th className={th}>نرخ سلامت</th></tr></thead>
                    <tbody className="divide-y divide-line">
                      {byTech.map(([id, v]) => { const u = state.users.find((x) => x.id === id); const h = v.items ? Math.round(((v.items - v.nok) / v.items) * 100) : 100; return (
                        <tr key={id} className="hover:bg-paper/50">
                          <td className={`${td} font-bold text-ink`}>{techName(id)}</td>
                          <td className={`${td} num-ltr`}>{u?.personnelCode}</td>
                          <td className={td}>{faNum(v.n)}</td>
                          <td className={td}>{faNum(v.items)}</td>
                          <td className={td}>{v.nok ? <span className="text-nok font-bold">{faNum(v.nok)}</span> : <span className="text-ok">۰</span>}</td>
                          <td className={td}>
                            <span className="inline-flex items-center gap-2"><span className="w-16 h-1.5 bg-paper rounded-full overflow-hidden"><span className={`block h-full rounded-full ${h >= 90 ? "bg-ok" : h >= 75 ? "bg-warn" : "bg-nok"}`} style={{ width: `${h}%` }} /></span>{faNum(h)}٪</span>
                          </td>
                        </tr>
                      ); })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {(type === "weekly" || type === "monthly") && (
            <div className="overflow-x-auto">
              <div className="px-4 pt-3.5"><h3 className="font-display text-lg text-ink">{type === "weekly" ? "گزارش هفتگی" : "گزارش ماهانه"} — روند روزانه</h3></div>
              <table className="w-full mt-2">
                <thead><tr className="bg-paper/80 border-b border-line"><th className={th}>تاریخ</th><th className={th}>روز</th><th className={th}>بازدیدها</th><th className={th}>اقلام</th><th className={th}>NOK</th><th className={th}>سلامت</th><th className={`${th} w-1/4 hidden sm:table-cell`}>نمودار</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {byDay.map(([d, v]) => {
                    const h = v.items ? Math.round(((v.items - v.nok) / v.items) * 100) : 100;
                    const dt = new Date(d + "T12:00:00");
                    const maxN = Math.max(...byDay.map(([, x]) => x.n), 1);
                    return (
                      <tr key={d} className="hover:bg-paper/50">
                        <td className={`${td} num-ltr`}>{formatDateJ(d)}</td>
                        <td className={td}>{["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"][(dt.getDay() + 1) % 7]}</td>
                        <td className={td}>{faNum(v.n)}</td>
                        <td className={td}>{faNum(v.items)}</td>
                        <td className={td}>{v.nok ? <span className="text-nok font-bold">{faNum(v.nok)}</span> : <span className="text-ok">۰</span>}</td>
                        <td className={td}>{faNum(h)}٪</td>
                        <td className={`${td} hidden sm:table-cell`}><span className="block h-2 rounded-full bg-acc/85" style={{ width: `${(v.n / maxN) * 100}%`, minWidth: 4 }} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {type === "failures" && (
            <div className="overflow-x-auto">
              <div className="px-4 pt-3.5 flex items-center gap-2"><h3 className="font-display text-lg text-ink">گزارش خرابی‌ها</h3><span className="text-[11px] font-bold bg-nokbg text-nok rounded-md px-2 py-0.5">{faNum(failures.length)} مورد</span></div>
              <table className="w-full mt-2">
                <thead><tr className="bg-paper/80 border-b border-line"><th className={th}>تاریخ</th><th className={th}>تجهیز</th><th className={th}>آیتم</th><th className={`${th} hidden md:table-cell`}>شرح</th><th className={`${th} hidden sm:table-cell`}>تکنسین</th><th className={`${th} hidden lg:table-cell`}>شیفت</th><th className={th}>نتیجه</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {failures.slice(0, 80).map(({ r, i }, idx) => { const def = state.items.find((x) => x.id === i.itemId); return (
                    <tr key={idx} className="hover:bg-paper/50">
                      <td className={`${td} whitespace-nowrap`}>{formatDateJ(r.date)} <span className="text-mist num-ltr">{faNum(r.time)}</span></td>
                      <td className={`${td} font-bold text-ink whitespace-nowrap`}>{eqOf(r.equipmentId)?.name}</td>
                      <td className={td}>{def?.title ?? "—"}{def?.type === "numeric" && i.value !== undefined && <b className="num-ltr" dir="ltr"> ({faNum(i.value)} {def.unit})</b>}</td>
                      <td className={`${td} hidden md:table-cell max-w-56 truncate`} title={i.note}>{i.note || "—"}</td>
                      <td className={`${td} hidden sm:table-cell`}>{techName(r.technicianId)}</td>
                      <td className={`${td} hidden lg:table-cell`}>{SHIFTS[r.shift].name}</td>
                      <td className={td}><ResultChip r="nok" small /></td>
                    </tr>
                  ); })}
                </tbody>
              </table>
            </div>
          )}

          {type === "pm" && (
            <div className="overflow-x-auto">
              <div className="px-4 pt-3.5"><h3 className="font-display text-lg text-ink">گزارش PM — اولویت تعمیرات پیشگیرانه</h3></div>
              <table className="w-full mt-2">
                <thead><tr className="bg-paper/80 border-b border-line"><th className={th}>اولویت</th><th className={th}>تجهیز</th><th className={th}>گروه</th><th className={th}>بازدیدها</th><th className={th}>NOK</th><th className={`${th} hidden sm:table-cell`}>آخرین خرابی</th><th className={th}>بحرانی</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {pm.map(([id, v], idx) => (
                    <tr key={id} className="hover:bg-paper/50">
                      <td className={td}><span className={`inline-flex w-6 h-6 rounded-md items-center justify-center text-[11px] font-bold ${idx < 3 ? "bg-nok text-white" : "bg-paper text-steel border border-line"}`}>{faNum(idx + 1)}</span></td>
                      <td className={`${td} font-bold text-ink`}>{eqOf(id)?.name}</td>
                      <td className={td}>{state.groups.find((g) => g.id === eqOf(id)?.typeId)?.name}</td>
                      <td className={td}>{faNum(v.visits)}</td>
                      <td className={td}><span className="text-nok font-bold">{faNum(v.nok)}</span></td>
                      <td className={`${td} hidden sm:table-cell`}>{v.lastNok ? formatDateJ(v.lastNok) : "—"}</td>
                      <td className={td}>{eqOf(id)?.critical ? <span className="text-[10.5px] font-bold bg-nokbg text-nok rounded-md px-1.5 py-0.5">بحرانی</span> : <span className="text-mist text-[11px]">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {type === "critical" && (
            <div className="overflow-x-auto">
              <div className="px-4 pt-3.5"><h3 className="font-display text-lg text-ink">تجهیزات بحرانی — پایش ویژه</h3></div>
              <table className="w-full mt-2">
                <thead><tr className="bg-paper/80 border-b border-line"><th className={th}>تجهیز</th><th className={th}>کد</th><th className={th}>وضعیت فعلی</th><th className={th}>آخرین بازدید</th><th className={th}>NOK در دوره</th><th className={`${th} hidden sm:table-cell`}>مسئول</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {critical.map((e) => {
                    const recs = rows.filter((r) => r.equipmentId === e.id);
                    const nok = recs.flatMap((r) => r.items).filter((i) => i.result === "nok").length;
                    const last = [...recs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
                    return (
                      <tr key={e.id} className="hover:bg-paper/50">
                        <td className={`${td} font-bold text-ink`}>{e.name}</td>
                        <td className={`${td} num-ltr`} dir="ltr">{e.code}</td>
                        <td className={td}><span className={`text-[10.5px] font-bold border rounded-md px-2 py-0.5 ${EQ_STATUS[e.status].cls}`}>{EQ_STATUS[e.status].label}</span></td>
                        <td className={td}>{last ? <span>{formatDateJ(last.date)} <span className="text-mist text-[11px]">({timeAgo(last.createdAt)})</span></span> : "—"}</td>
                        <td className={td}>{nok ? <span className="text-nok font-bold">{faNum(nok)}</span> : <span className="text-ok">۰</span>}</td>
                        <td className={`${td} hidden sm:table-cell`}>{state.users.filter((u) => u.formAccess.length === 0 || u.formAccess.includes(e.typeId)).filter((u) => u.role === "technician").map((u) => u.fullName).join("، ") || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {rows.length === 0 && type !== "critical" && <Empty icon="chart" title="داده‌ای در این بازه یافت نشد" sub="بازه زمانی یا فیلترها را تغییر دهید." />}

          <div className="hidden print:grid grid-cols-3 gap-6 mt-10 text-xs font-semibold px-2">
            <p>تهیه‌کننده: ____________________</p>
            <p>سرپرست نت: ____________________</p>
            <p>مدیر سیستم: ____________________</p>
          </div>
        </div>
        <div className="px-4 py-2.5 border-t border-line text-[10.5px] font-bold text-mist flex items-center justify-between no-print">
          <span>دوره گزارش: {periodLabel} — {faNum(jNow.jy)} {J_MONTHS[jNow.jm - 1]}</span>
          <span className="flex items-center gap-1"><I name="shield" size={11} />خروجی‌ها دارای سربرگ رسمی NIPCO هستند</span>
        </div>
      </div>
    </div>
  );
}
