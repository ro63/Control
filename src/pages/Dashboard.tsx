import { useEffect, useMemo, useState } from "react";
import { useStore } from "../store";
import { Btn, CountUp, EQ_STATUS, I, Reveal, Ring, ResultChip } from "../components/ui";
import { faNum, formatDateJ, timeAgo, todayISO } from "../utils";

export function Dashboard({ goScan }: { goScan: (code: string) => void }) {
  const { state, user, can, activeRecords } = useStore();
  const today = todayISO();
  const [barsIn, setBarsIn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setBarsIn(true), 150); return () => clearTimeout(t); }, []);

  const d = useMemo(() => {
    const recToday = activeRecords.filter((r) => r.date === today);
    const activeEq = state.equipment.filter((e) => e.status === "active");
    const doneIds = new Set(recToday.map((r) => r.equipmentId));
    const pending = activeEq.filter((e) => !doneIds.has(e.id));
    const nok = recToday.reduce((a, r) => a + r.items.filter((i) => i.result === "nok").length, 0);
    const warn = recToday.reduce((a, r) => a + r.items.filter((i) => i.result === "ok" && i.note.trim()).length, 0);
    const days = Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(); dt.setDate(dt.getDate() - (6 - i));
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    });
    const counts = days.map((day) => activeRecords.filter((r) => r.date === day).length);
    const noks = activeRecords
      .filter((r) => r.items.some((i) => i.result === "nok"))
      .flatMap((r) => r.items.filter((i) => i.result === "nok").map((i) => ({ r, i })))
      .sort((a, b) => b.r.createdAt.localeCompare(a.r.createdAt))
      .slice(0, 6);
    return { recToday, activeEq, pending, nok, warn, counts, days, noks, progress: activeEq.length ? (activeEq.length - pending.length) / activeEq.length : 0 };
  }, [state, today]);

  const statusCounts = (["active", "repair", "out", "inactive"] as const).map((s) => ({ s, n: state.equipment.filter((e) => e.status === s).length }));
  const max = Math.max(...d.counts, 1);
  const wd = (iso: string) => { const dt = new Date(iso + "T12:00:00"); return ["ی", "د", "س", "چ", "پ", "ج", "ش"][(dt.getDay() + 1) % 7]; };

  const kpis = [
    { l: "بازدیدهای امروز", v: d.recToday.length, icon: "clipboard" as const, cls: "text-info bg-infobg" },
    { l: "مورد معیوب (NOK)", v: d.nok, icon: "alert" as const, cls: "text-nok bg-nokbg" },
    { l: "هشدار / نیاز به بررسی", v: d.warn, icon: "flag" as const, cls: "text-warn bg-warnbg" },
    { l: "تجهیز فعال", v: d.activeEq.length, icon: "power" as const, cls: "text-ok bg-okbg" },
    { l: "بازدید معوق", v: d.pending.length, icon: "clock" as const, cls: "text-accd bg-accbg" },
  ];

  return (
    <div className="space-y-5">
      {/* ---------- control board ---------- */}
      <Reveal>
        <div className="bg-navy blueprint rounded-xl text-white overflow-hidden corner-frame">
          <div className="hazard h-1.5" />
          <div className="p-5 flex flex-col md:flex-row md:items-center gap-5">
            <div className="flex items-center gap-4 flex-1">
              <Ring value={d.progress} label="پیشرفت امروز" />
              <div>
                <h2 className="font-display text-2xl leading-7">تابلوی کنترل روزانه</h2>
                <p className="text-white/55 text-[13px] font-semibold mt-1">
                  {faNum(d.activeEq.length - d.pending.length)} از {faNum(d.activeEq.length)} تجهیز فعال، امروز کنترل شده‌اند
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {statusCounts.map(({ s, n }) => (
                    <span key={s} className="inline-flex items-center gap-1.5 bg-white/8 border border-white/10 rounded-md px-2.5 py-1 text-[11px] font-bold">
                      <span className={`w-2 h-2 rounded-full ${EQ_STATUS[s].dot}`} />
                      {EQ_STATUS[s].label}: {faNum(n)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex md:flex-col gap-2.5 shrink-0">
              <Btn variant="primary" size="lg" onClick={() => goScan("")}><I name="qr" size={17} />شروع اسکن و بازدید</Btn>
              <Btn variant="ghost" className="!text-white/70 hover:!bg-white/10 hover:!text-white border border-white/15" onClick={() => goScan(d.pending[0]?.code ?? "")}>
                <I name="clock" size={15} />اولویت بعدی: {d.pending[0]?.code ?? "تکمیل شده"}
              </Btn>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ---------- KPIs ---------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 stagger">
        {kpis.map((k) => (
          <div key={k.l} className="bg-card border border-line rounded-xl p-4 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-navy/5 transition-all duration-200">
            <span className={`w-9 h-9 rounded-lg ${k.cls} flex items-center justify-center`}><I name={k.icon} size={17} /></span>
            <div className="font-display text-3xl text-ink mt-2.5"><CountUp to={k.v} /></div>
            <div className="text-[11px] text-mist font-bold mt-0.5">{k.l}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* ---------- weekly chart ---------- */}
        <Reveal className="lg:col-span-2">
          <div className="bg-card border border-line rounded-xl p-4 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg text-ink">روند بازدید ۷ روز اخیر</h3>
              <span className="text-[11px] font-bold text-mist flex items-center gap-1"><I name="chart" size={13} />تعداد رکورد</span>
            </div>
            <div className="flex items-end gap-2 h-36">
              {d.counts.map((c, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <span className="text-[10px] font-bold text-mist opacity-0 group-hover:opacity-100 transition-opacity">{faNum(c)}</span>
                  <div className={`w-full rounded-t-md transition-all duration-700 ease-out ${i === 6 ? "bg-acc" : "bg-navy/80 group-hover:bg-navy"}`}
                    style={{ height: barsIn ? `${Math.max(6, (c / max) * 100)}%` : "4%", transitionDelay: `${i * 70}ms` }} />
                  <span className={`text-[10px] font-bold ${i === 6 ? "text-acc" : "text-mist"}`}>{wd(d.days[i])}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* ---------- pending ---------- */}
        <Reveal delay={80} className="lg:col-span-3">
          <div className="bg-card border border-line rounded-xl p-4 h-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg text-ink flex items-center gap-2">
                تجهیزات در انتظار بازدید
                {d.pending.length > 0 && <span className="bg-warnbg text-warn text-[11px] font-bold rounded-md px-2 py-0.5">{faNum(d.pending.length)} تجهیز</span>}
              </h3>
            </div>
            {d.pending.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <span className="w-12 h-12 rounded-full bg-okbg text-ok flex items-center justify-center mb-2"><I name="check" size={22} /></span>
                <p className="font-bold text-ok">همه تجهیزات فعال امروز کنترل شده‌اند</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pl-1">
                {d.pending.map((e) => (
                  <div key={e.id} className="flex items-center gap-2.5 border border-line rounded-lg p-2.5 hover:border-acc transition-colors group">
                    <span className={`w-2 h-8 rounded-full ${EQ_STATUS[e.status].dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-ink truncate">{e.name}</p>
                      <p className="text-[10.5px] text-mist font-semibold num-ltr text-left" dir="ltr">{e.code}</p>
                    </div>
                    {can("inspections.create") && (
                      <Btn size="sm" variant="outline" onClick={() => goScan(e.code)} className="group-hover:!border-acc group-hover:!text-acc">
                        <I name="qr" size={12} />ثبت
                      </Btn>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Reveal>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* ---------- equipment board ---------- */}
        <Reveal className="lg:col-span-3">
          <div className="bg-card border border-line rounded-xl p-4">
            <h3 className="font-display text-lg text-ink mb-3">وضعیت لحظه‌ای تجهیزات</h3>
            <div className="space-y-3.5">
              {state.groups.map((g) => {
                const list = state.equipment.filter((e) => e.typeId === g.id);
                return (
                  <div key={g.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[12px] font-bold text-steel">{g.name}</p>
                      <p className="text-[10.5px] text-mist font-semibold">{faNum(list.filter((e) => e.status === "active").length)} فعال از {faNum(list.length)}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {list.map((e) => (
                        <button key={e.id} onClick={() => can("inspections.create") && e.status === "active" && goScan(e.code)}
                          title={`${e.name} — ${EQ_STATUS[e.status].label}`}
                          className={`inline-flex items-center gap-1.5 border rounded-md px-2 py-1 text-[11px] font-bold num-ltr transition-all active:scale-95 ${EQ_STATUS[e.status].cls} ${can("inspections.create") && e.status === "active" ? "hover:-translate-y-0.5 hover:shadow cursor-pointer" : "cursor-default"}`}
                          dir="ltr">
                          <span className={`w-1.5 h-1.5 rounded-full ${EQ_STATUS[e.status].dot} ${e.status === "active" ? "live-dot" : ""}`} />
                          {e.code}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* ---------- latest NOKs ---------- */}
        <Reveal delay={80} className="lg:col-span-2">
          <div className="bg-card border border-line rounded-xl p-4 h-full">
            <h3 className="font-display text-lg text-ink mb-3 flex items-center gap-2"><span className="w-1.5 h-5 bg-nok rounded-full" />آخرین موارد معیوب</h3>
            {d.noks.length === 0 ? (
              <p className="text-sm text-mist font-semibold py-6 text-center">مورد NOK ثبت نشده است</p>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pl-1">
                {d.noks.map(({ r, i }, idx) => {
                  const eq = state.equipment.find((e) => e.id === r.equipmentId);
                  const item = state.items.find((x) => x.id === i.itemId);
                  const tech = state.users.find((x) => x.id === r.technicianId);
                  return (
                    <div key={idx} className="border border-nok/15 bg-nokbg/50 rounded-lg p-2.5 hover:border-nok/40 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12.5px] font-bold text-ink truncate">{eq?.name ?? "—"}</p>
                        <ResultChip r="nok" small />
                      </div>
                      <p className="text-[11.5px] text-steel font-semibold mt-0.5">{item?.title}</p>
                      <div className="flex items-center justify-between mt-1.5 text-[10.5px] text-mist font-semibold">
                        <span>{tech?.fullName}</span>
                        <span className="flex items-center gap-1"><I name="clock" size={10} />{timeAgo(r.createdAt)} • {formatDateJ(r.date)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Reveal>
      </div>

      <p className="text-center text-[11px] text-mist font-semibold pt-1">
        {user?.role === "technician" ? "فرم‌های در دسترس شما بر اساس سطح دسترسی تعیین شده‌اند" : "داده‌ها به‌صورت خودکار در مرورگر ذخیره و روزانه پشتیبان‌گیری می‌شوند"} • تحلیل و طراحی: محمد روشندل
      </p>
    </div>
  );
}
