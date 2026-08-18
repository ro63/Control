import { useMemo, useState } from "react";
import type { AppNotification } from "../types";
import { useStore } from "../store";
import { Btn, Empty, EQ_STATUS, I, ResultChip } from "../components/ui";
import { exportCSV, faNum, formatDateJ, formatDateJLong, SHIFTS, timeAgo, toJalaali } from "../utils";

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
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-md px-2 py-0.5 ${isAuth ? "bg-infobg text-info" : l.action.includes("حذف") ? "bg-nokbg text-nok" : "bg-paper border border-line text-steel"}`}>
                        <I name={isAuth ? "key" : l.action.includes("حذف") ? "trash" : "history"} size={11} />{l.action}
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
      <p className="text-[11px] font-semibold text-mist mt-3 flex items-center gap-1.5"><I name="shield" size={13} />ورود و خروج کاربران، تغییرات تجهیزات، چک‌لیست‌ها و ثبت بازدیدها به‌صورت خودکار ثبت می‌شوند.</p>
    </div>
  );
}

/* ============================ بایگانی ============================ */
export function ArchivePage() {
  const { state, can, addLog, toast } = useStore();
  const currentYear = toJalaali(new Date()).jy;
  const years = useMemo(() => [...new Set(state.records.map((r) => r.jalaliYear))].filter((y) => y < currentYear).sort((a, b) => b - a), [state.records, currentYear]);
  const [year, setYear] = useState<number | "">("");
  const sel = year === "" ? years[0] : year;

  if (!can("archive.view")) {
    return (
      <div className="anim-fade-up bg-card border border-line rounded-xl max-w-xl mx-auto">
        <Empty icon="lock" title="دسترسی به بایگانی محدود است"
          sub="دسترسی به رکوردهای سال‌های قبل توسط مدیر سیستم اعطا می‌شود. در صفحه کاربران، گزینه «دسترسی به بایگانی» را برای شما فعال کنند." />
      </div>
    );
  }

  const recs = state.records.filter((r) => r.jalaliYear === sel);
  const nok = recs.flatMap((r) => r.items).filter((i) => i.result === "nok").length;

  return (
    <div className="anim-fade-up">
      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 bg-navy blueprint text-white rounded-xl p-4 corner-frame">
          <h3 className="font-display text-xl flex items-center gap-2"><I name="archive" size={19} className="text-acc" />بایگانی خودکار سالیانه</h3>
          <p className="text-white/60 text-[12.5px] font-semibold leading-6 mt-1.5">
            رکوردهای کنترل روزانه پس از پایان هر سال شمسی به‌صورت خودکار بایگانی می‌شوند. دسترسی به سال‌های قبل فقط برای کاربران مجاز ({faNum(state.users.filter((u) => u.role === "admin" || u.canArchive).length)} نفر) فعال است.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {years.length === 0 && <span className="text-[11.5px] font-bold bg-white/8 border border-white/12 rounded-md px-2.5 py-1">هنوز سالِ بسته‌شده‌ای وجود ندارد</span>}
            {years.map((y) => (
              <button key={y} onClick={() => setYear(y)}
                className={`text-[12px] font-bold rounded-lg px-3.5 py-1.5 border transition-all ${sel === y ? "bg-acc text-white border-acc" : "bg-white/8 border-white/15 hover:border-acc"}`}>
                سال {faNum(y)} ({faNum(state.records.filter((r) => r.jalaliYear === y).length)} رکورد)
              </button>
            ))}
          </div>
        </div>
        <div className="bg-card border border-line rounded-xl p-4 flex flex-col">
          <p className="text-[12.5px] font-bold text-steel flex items-center gap-1.5"><I name="refresh" size={15} className="text-ok" />پشتیبان‌گیری خودکار</p>
          <p className="text-[11.5px] text-mist font-semibold leading-5 mt-1.5">آخرین نسخه پشتیبان: <b className="text-ink">{formatDateJLong(state.lastBackup.slice(0, 10))}</b> — ساعت <b className="num-ltr">{faNum(state.lastBackup.slice(11, 16))}</b></p>
          <Btn variant="outline" size="sm" className="mt-auto self-start" onClick={() => { addLog("پشتیبان‌گیری", "تهیه نسخه پشتیبان دستی از پایگاه داده"); toast("نسخه پشتیبان با موفقیت تهیه شد"); }}>
            <I name="download" size={14} />تهیه نسخه پشتیبان الآن
          </Btn>
        </div>
      </div>

      {years.length > 0 && sel ? (
        <div className="bg-card border border-line rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <h4 className="font-display text-base text-ink">رکوردهای سال {faNum(sel)}</h4>
            <div className="flex items-center gap-3">
              <span className="text-[11.5px] font-bold text-mist">{faNum(recs.length)} بازدید • {faNum(nok)} مورد NOK</span>
              <Btn size="sm" variant="ok" onClick={() => {
                exportCSV(`NIPCO-archive-${sel}`, [["بایگانی کنترل روزانه NIPCO", `سال ${sel}`], [], ["تاریخ", "ساعت", "تجهیز", "تکنسین", "شیفت", "نتیجه"]].concat(
                  recs.map((r) => [formatDateJ(r.date), r.time, state.equipment.find((e) => e.id === r.equipmentId)?.name ?? "—", state.users.find((u) => u.id === r.technicianId)?.fullName ?? "—", SHIFTS[r.shift].name, r.items.some((i) => i.result === "nok") ? "دارای خرابی" : "سالم"])
                ));
                toast(`خروجی سال ${faNum(sel)} دانلود شد`);
              }}><I name="download" size={13} />Excel</Btn>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-paper/80 border-b border-line text-[11px] font-bold text-mist">
                <th className="text-right px-3.5 py-2.5">تاریخ</th><th className="text-right px-3.5 py-2.5">تجهیز</th><th className="text-right px-3.5 py-2.5 hidden sm:table-cell">تکنسین</th><th className="text-right px-3.5 py-2.5">شیفت</th><th className="text-right px-3.5 py-2.5">نتیجه</th>
              </tr></thead>
              <tbody className="divide-y divide-line">
                {recs.slice(0, 60).map((r) => {
                  const isNok = r.items.some((i) => i.result === "nok");
                  return (
                    <tr key={r.id} className="hover:bg-paper/50 text-[12.5px] font-semibold text-steel">
                      <td className="px-3.5 py-2.5 num-ltr whitespace-nowrap">{formatDateJ(r.date)} <span className="text-mist">{faNum(r.time)}</span></td>
                      <td className="px-3.5 py-2.5 font-bold text-ink">{state.equipment.find((e) => e.id === r.equipmentId)?.name ?? "حذف‌شده"} <span className="text-[10.5px] text-mist">({EQ_STATUS[state.equipment.find((e) => e.id === r.equipmentId)?.status ?? "inactive"].label})</span></td>
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
        </div>
      ) : (
        <div className="bg-card border border-line rounded-xl"><Empty icon="archive" title="بایگانی‌ای موجود نیست" sub="با پایان سال جاری، رکوردها به‌صورت خودکار اینجا بایگانی می‌شوند." /></div>
      )}
    </div>
  );
}
