import { useMemo, useRef, useState } from "react";
import type { AppNotification, AppState, FiscalYear } from "../types";
import { useStore } from "../store";
import { Btn, Confirm, Empty, EQ_STATUS, I, ResultChip } from "../components/ui";
import { exportCSV, faNum, formatDateJ, formatDateJLong, SHIFTS, timeAgo, todayISO } from "../utils";

/* ============================ اعلان‌ها ============================ */
const NTF_META: Record<AppNotification["type"], { icon: "alert" | "flag" | "bell" | "check"; cls: string }> = {
  danger: { icon: "alert", cls: "bg-nokbg text-nok border-nok/25" },
  warning: { icon: "flag", cls: "bg-warnbg text-warn border-warn/25" },
  info: { icon: "bell", cls: "bg-infobg text-info border-info/25" },
  success: { icon: "check", cls: "bg-okbg text-ok border-ok/25" },
};
const CHANNEL = { app: { label: "داخل برنامه", icon: "bell" as const }, sms: { label: "پیامک", icon: "sms" as const }, email: { label: "ایمیل", icon: "mail" as const } };

export function NotificationsPage() {
  const { state, unread, markNotifRead, markAllRead } = useStore();
  const [fType, setFType] = useState("");
  const list = state.notifications.filter((n) => !fType || n.type === fType);
  return (
    <div className="anim-fade-up max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <select className="field !py-1.5 !text-[12.5px] !w-auto" value={fType} onChange={(e) => setFType(e.target.value)}>
          <option value="">همه اعلان‌ها</option>
          <option value="danger">خرابی (NOK)</option>
          <option value="warning">هشدار / معوق</option>
          <option value="info">اطلاع‌رسانی</option>
          <option value="success">موفقیت</option>
        </select>
        <span className="text-[12px] font-bold text-mist">{faNum(list.length)} اعلان {unread > 0 && <span className="text-nok">({faNum(unread)} خوانده‌نشده)</span>}</span>
        <Btn size="sm" variant="outline" className="mr-auto" onClick={markAllRead} disabled={unread === 0}><I name="check" size={14} />خواندن همه</Btn>
      </div>
      {list.length === 0 ? (
        <div className="bg-card border border-line rounded-xl"><Empty icon="bell" title="اعلانی وجود ندارد" sub="هشدار بازدیدهای انجام‌نشده و موارد NOK اینجا نمایش داده می‌شوند." /></div>
      ) : (
        <div className="space-y-2.5">
          {list.map((n) => {
            const m = NTF_META[n.type];
            return (
              <button key={n.id} onClick={() => !n.read && markNotifRead(n.id)}
                className={`w-full text-right bg-card border rounded-xl p-3.5 flex gap-3 transition-all hover:-translate-y-0.5 hover:shadow-md ${n.read ? "border-line opacity-70" : "border-acc/35 shadow-sm"}`}>
                <span className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${m.cls}`}><I name={m.icon} size={18} /></span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13.5px] font-bold text-ink flex-1 truncate">{n.title}</p>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-acc live-dot shrink-0" />}
                    <span className="text-[10.5px] font-semibold text-mist shrink-0">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-[12px] text-steel font-semibold leading-5 mt-0.5">{n.body}</p>
                  <div className="flex gap-1.5 mt-2">
                    {n.channels.map((c) => (
                      <span key={c} className="inline-flex items-center gap-1 text-[9.5px] font-bold bg-paper border border-line text-mist rounded px-1.5 py-0.5">
                        <I name={CHANNEL[c].icon} size={9} />{CHANNEL[c].label}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================ لاگ‌ها ============================ */
export function LogsPage() {
  const { state } = useStore();
  const [fUser, setFUser] = useState("");
  const [fAct, setFAct] = useState("");
  const actions = useMemo(() => [...new Set(state.logs.map((l) => l.action))], [state.logs]);
  const list = state.logs.filter((l) => (!fUser || l.userId === fUser) && (!fAct || l.action === fAct));
  const th = "text-right px-3.5 py-2.5 text-[11px] font-bold text-mist";
  const td = "px-3.5 py-2.5 text-[12.5px] font-semibold text-steel";
  return (
    <div className="anim-fade-up">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select className="field !py-1.5 !text-[12.5px] !w-auto" value={fUser} onChange={(e) => setFUser(e.target.value)}>
          <option value="">همه کاربران</option>
          {state.users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
        </select>
        <select className="field !py-1.5 !text-[12.5px] !w-auto" value={fAct} onChange={(e) => setFAct(e.target.value)}>
          <option value="">همه عملیات‌ها</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <span className="text-[12px] font-bold text-mist mr-auto">{faNum(list.length)} رویداد</span>
      </div>
      <div className="bg-card border border-line rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-paper/80 border-b border-line"><th className={th}>زمان</th><th className={th}>کاربر</th><th className={th}>عملیات</th><th className={`${th} hidden sm:table-cell`}>جزئیات</th></tr></thead>
            <tbody className="divide-y divide-line">
              {list.slice(0, 80).map((l) => {
                const isAuth = l.action.includes("ورود") || l.action.includes("خروج");
                return (
                  <tr key={l.id} className="hover:bg-paper/50">
                    <td className={`${td} whitespace-nowrap`}>{formatDateJ(l.at.slice(0, 10))} <span className="text-mist num-ltr">{faNum(l.at.slice(11, 16))}</span></td>
                    <td className={`${td} font-bold text-ink whitespace-nowrap`}>{l.userName}</td>
                    <td className={td}>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-md px-2 py-0.5 ${isAuth ? "bg-infobg text-info" : l.action.includes("حذف") ? "bg-nokbg text-nok" : l.action.includes("سال") ? "bg-accbg text-accd" : "bg-paper border border-line text-steel"}`}>
                        <I name={isAuth ? "key" : l.action.includes("حذف") ? "trash" : l.action.includes("سال") ? "archive" : "history"} size={11} />{l.action}
                      </span>
                    </td>
                    <td className={`${td} hidden sm:table-cell`}>{l.detail}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {list.length === 0 && <Empty icon="list" title="رویدادی ثبت نشده" />}
      </div>
      <p className="text-[11px] font-semibold text-mist mt-3 flex items-center gap-1.5"><I name="shield" size={13} />ورود و خروج کاربران، تغییرات تجهیزات، چک‌لیست‌ها، ثبت بازدیدها و بستن سال مالی به‌صورت خودکار ثبت می‌شوند.</p>
    </div>
  );
}

/* ============================ بایگانی و سال مالی ============================ */
export function ArchivePage() {
  const { state, can, user, openYear, closeYear, restoreBackup, markBackup, addLog, toast } = useStore();
  const [selYear, setSelYear] = useState<string>("");
  const [askClose, setAskClose] = useState(false);
  const [askRestore, setAskRestore] = useState<AppState | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const isAdmin = user?.role === "admin";

  const closedYears = useMemo(() => state.years.filter((y) => y.status === "closed").sort((a, b) => b.year - a.year), [state.years]);
  const recsOf = (y: FiscalYear) => state.records.filter((r) => r.yearId === y.id);
  const effectiveYear = closedYears.find((y) => y.id === selYear) ?? closedYears[0] ?? null;

  if (!can("archive.view")) {
    return (
      <div className="anim-fade-up bg-card border border-line rounded-xl max-w-xl mx-auto">
        <Empty icon="lock" title="دسترسی به بایگانی محدود است"
          sub="دسترسی به رکوردهای سال‌های قبل و عملیات بستن سال، توسط مدیر سیستم اعطا می‌شود. در صفحه کاربران، گزینه «دسترسی به بایگانی» را برای شما فعال کنند." />
      </div>
    );
  }

  const recs = effectiveYear ? recsOf(effectiveYear) : [];
  const nok = recs.flatMap((r) => r.items).filter((i) => i.result === "nok").length;

  const downloadBackup = () => {
    markBackup();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `NIPCO-backup-${todayISO()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    addLog("پشتیبان‌گیری دستی", "دانلود نسخه پشتیبان کامل پایگاه داده (JSON)");
    toast("نسخه پشتیبان دانلود شد");
  };

  const onPickRestore = async (files: FileList | null) => {
    if (!files || !files[0]) return;
    try {
      const txt = await files[0].text();
      const data = JSON.parse(txt) as AppState;
      setAskRestore(data);
    } catch {
      toast("فایل انتخابی یک نسخه پشتیبان معتبر نیست", "error");
    }
  };

  return (
    <div className="anim-fade-up">
      {/* ---------- سال مالی + پشتیبان‌گیری ---------- */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        {/* سال مالی */}
        <div className="bg-navy blueprint text-white rounded-xl p-4 corner-frame flex flex-col">
          <h3 className="font-display text-xl flex items-center gap-2"><I name="archive" size={19} className="text-acc" />سال مالی و بایگانی خودکار</h3>
          <p className="text-white/60 text-[12.5px] font-semibold leading-6 mt-1.5">
            در پایان هر سال، مدیر سال جاری را می‌بندد و سال جدید باز می‌شود. رکوردهای سال‌های بسته‌شده در بایگانی قرار گرفته و فقط برای کاربران مجاز قابل مشاهده‌اند.
          </p>
          {openYear ? (
            <div className="flex items-center justify-between bg-white/6 border border-white/12 rounded-lg px-4 py-3 mt-3">
              <div>
                <p className="font-display text-2xl text-acc leading-7">سال {faNum(openYear.year)}</p>
                <p className="text-[11px] font-bold text-ok flex items-center gap-1 mt-0.5"><span className="w-1.5 h-1.5 rounded-full bg-ok live-dot" />سال کاری جاری (باز)</p>
              </div>
              {isAdmin && (
                <Btn variant="outline" size="sm" onClick={() => setAskClose(true)} className="!text-white !border-white/30 hover:!border-acc hover:!text-acc">
                  <I name="archive" size={14} />بستن سال و شروع سال جدید
                </Btn>
              )}
            </div>
          ) : (
            <p className="text-warnbg text-[12px] font-bold mt-3">هیچ سال بازی وجود ندارد — با مدیر تماس بگیرید.</p>
          )}
          {!isAdmin && <p className="text-[10.5px] font-bold text-white/40 mt-2 flex items-center gap-1"><I name="lock" size={11} />بستن سال فقط توسط مدیر سیستم انجام می‌شود.</p>}
        </div>

        {/* پشتیبان‌گیری */}
        <div className="bg-card border border-line rounded-xl p-4 flex flex-col">
          <p className="text-[13px] font-bold text-ink flex items-center gap-1.5"><I name="refresh" size={16} className="text-ok" />پشتیبان‌گیری (خودکار + دستی)</p>
          <div className="mt-2 space-y-2 text-[11.5px] font-semibold text-steel">
            <p className="flex items-center justify-between bg-okbg text-ok rounded-lg px-3 py-2"><span className="flex items-center gap-1.5"><I name="check" size={13} />خودکار — روزانه ساعت ۲ بامداد</span><span>فعال</span></p>
            <p className="text-mist">آخرین نسخه پشتیبان: <b className="text-ink">{formatDateJLong(state.lastBackup.slice(0, 10))}</b> — ساعت <b className="num-ltr">{faNum(state.lastBackup.slice(11, 16))}</b></p>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap gap-2 mt-auto pt-3">
              <Btn size="sm" variant="ok" onClick={downloadBackup}><I name="download" size={14} />دانلود نسخه پشتیبان</Btn>
              <Btn size="sm" variant="outline" onClick={() => fileRef.current?.click()}><I name="upload" size={14} />بازیابی از فایل</Btn>
              <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { onPickRestore(e.target.files); e.target.value = ""; }} />
            </div>
          )}
        </div>
      </div>

      {/* ---------- سال‌های بایگانی ---------- */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[12px] font-bold text-mist flex items-center gap-1.5"><I name="archive" size={15} className="text-acc" />سال‌های بایگانی‌شده:</span>
        {closedYears.length === 0 && <span className="text-[11.5px] font-bold bg-paper border border-line text-mist rounded-md px-2.5 py-1">هنوز سالی بسته نشده است</span>}
        {closedYears.map((y) => {
          const on = effectiveYear?.id === y.id;
          return (
            <button key={y.id} onClick={() => setSelYear(y.id)}
              className={`text-[12px] font-bold rounded-lg px-3.5 py-1.5 border transition-all active:scale-95 ${on ? "bg-acc text-white border-acc shadow-md shadow-acc/25" : "bg-card border-line text-steel hover:border-acc hover:text-acc"}`}>
              سال {faNum(y.year)} <span className={`font-semibold ${on ? "text-white/70" : "text-mist"}`}>({faNum(recsOf(y).length)} رکورد)</span>
            </button>
          );
        })}
      </div>

      {effectiveYear ? (
        <div className="bg-card border border-line rounded-xl overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-line">
            <div>
              <h4 className="font-display text-base text-ink">رکوردهای سال {faNum(effectiveYear.year)}</h4>
              <p className="text-[10.5px] font-semibold text-mist mt-0.5">
                بسته‌شده در {formatDateJLong(effectiveYear.closedAt!.slice(0, 10))} توسط {state.users.find((u) => u.id === effectiveYear.closedBy)?.fullName ?? "مدیر"} • {faNum(recs.length)} بازدید • {faNum(nok)} مورد NOK
              </p>
            </div>
            <Btn size="sm" variant="ok" onClick={() => {
              exportCSV(`NIPCO-archive-${effectiveYear.year}`, [["بایگانی کنترل روزانه NIPCO", `سال ${effectiveYear.year}`], [], ["تاریخ", "ساعت", "تجهیز", "تکنسین", "شیفت", "نتیجه"]].concat(
                recs.map((r) => [formatDateJ(r.date), r.time, state.equipment.find((e) => e.id === r.equipmentId)?.name ?? "—", state.users.find((u) => u.id === r.technicianId)?.fullName ?? "—", SHIFTS[r.shift].name, r.items.some((i) => i.result === "nok") ? "دارای خرابی" : "سالم"])
              ));
              addLog("خروجی بایگانی", `Excel — سال ${effectiveYear.year}`);
              toast(`خروجی سال ${faNum(effectiveYear.year)} دانلود شد`);
            }}><I name="download" size={13} />Excel</Btn>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-paper/80 border-b border-line text-[11px] font-bold text-mist">
                <th className="text-right px-3.5 py-2.5">تاریخ</th><th className="text-right px-3.5 py-2.5">تجهیز</th><th className="text-right px-3.5 py-2.5 hidden sm:table-cell">تکنسین</th><th className="text-right px-3.5 py-2.5">شیفت</th><th className="text-right px-3.5 py-2.5">نتیجه</th>
              </tr></thead>
              <tbody className="divide-y divide-line">
                {recs.slice(0, 60).map((r) => {
                  const eq = state.equipment.find((e) => e.id === r.equipmentId);
                  const isNok = r.items.some((i) => i.result === "nok");
                  return (
                    <tr key={r.id} className="hover:bg-paper/50 text-[12.5px] font-semibold text-steel">
                      <td className="px-3.5 py-2.5 num-ltr whitespace-nowrap">{formatDateJ(r.date)} <span className="text-mist">{faNum(r.time)}</span></td>
                      <td className="px-3.5 py-2.5 font-bold text-ink">{eq?.name ?? "حذف‌شده"} <span className="text-[10.5px] text-mist">({EQ_STATUS[eq?.status ?? "inactive"].label})</span></td>
                      <td className="px-3.5 py-2.5 hidden sm:table-cell">{state.users.find((u) => u.id === r.technicianId)?.fullName ?? "—"}</td>
                      <td className="px-3.5 py-2.5">{SHIFTS[r.shift].name}</td>
                      <td className="px-3.5 py-2.5"><ResultChip r={isNok ? "nok" : "ok"} small /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {recs.length > 60 && <p className="text-center text-[11px] font-bold text-mist py-2.5 border-t border-line">{faNum(recs.length - 60)} رکورد دیگر — خروجی Excel شامل همه است</p>}
          {recs.length === 0 && <Empty icon="archive" title="رکوردی در این سال ثبت نشده" />}
        </div>
      ) : (
        <div className="bg-card border border-line rounded-xl"><Empty icon="archive" title="بایگانی‌ای موجود نیست" sub="با بستن سال جاری توسط مدیر، رکوردها به‌صورت خودکار اینجا بایگانی می‌شوند." /></div>
      )}

      {/* ---------- مودال بستن سال ---------- */}
      <Confirm open={askClose} onClose={() => setAskClose(false)} yesLabel="بله، سال بسته شود"
        onYes={() => {
          const next = closeYear();
          setAskClose(false);
          if (next) { setSelYear(""); toast(`سال بسته شد — سال ${faNum(next.year)} فعال شد`); }
          else toast("خطا در بستن سال", "error");
        }}
        title={`بستن سال ${openYear ? faNum(openYear.year) : ""} و شروع سال جدید`}
        body={`سال مالی ${openYear ? faNum(openYear.year) : ""} بسته شده و همه رکوردهای آن به بایگانی منتقل می‌شود (فقط کاربران دارای دسترسی بایگانی آن را می‌بینند). سال جدید ${openYear ? faNum(openYear.year + 1) : ""} به‌عنوان سال کاری باز می‌شود. قبل از بستن، یک نسخه پشتیبان دانلود کنید. این عملیات فقط توسط مدیر قابل انجام است.`} />

      {/* ---------- مودال بازیابی ---------- */}
      <Confirm open={!!askRestore} onClose={() => setAskRestore(null)} yesLabel="بله، بازیابی شود"
        onYes={() => {
          const ok = askRestore ? restoreBackup(askRestore) : false;
          setAskRestore(null);
          if (ok) { addLog("بازیابی نسخه پشتیبان", "بازگردانی کامل پایگاه داده از فایل پشتیبان"); toast("نسخه پشتیبان با موفقیت بازیابی شد"); }
          else toast("فایل پشتیبان نامعتبر است", "error");
        }}
        title="بازیابی نسخه پشتیبان"
        body="همه داده‌های فعلی (کاربران، تجهیزات، چک‌لیست‌ها و بازدیدها) با محتوای فایل پشتیبان جایگزین می‌شود. این عملیات قابل بازگشت نیست. ادامه می‌دهید؟" />
    </div>
  );
}
