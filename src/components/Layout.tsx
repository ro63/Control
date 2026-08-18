import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Page, User } from "../types";
import { useStore } from "../store";
import { I, RoleBadge } from "./ui";
import type { IconName } from "./ui";
import { currentShift, faNum, formatDateJLong, SHIFTS, todayISO } from "../utils";

const NAV: { id: Page; label: string; icon: IconName; show: (u: User) => boolean }[] = [
  { id: "dashboard", label: "داشبورد", icon: "gauge", show: () => true },
  { id: "scan", label: "اسکن QR و بازدید", icon: "qr", show: (u) => u.role !== "viewer" },
  { id: "inspections", label: "بازدیدها", icon: "clipboard", show: () => true },
  { id: "equipment", label: "تجهیزات", icon: "gear", show: (u) => u.role !== "technician" },
  { id: "checklists", label: "چک‌لیست‌ها", icon: "checklist", show: (u) => u.role === "admin" || u.role === "supervisor" },
  { id: "users", label: "کاربران و دسترسی‌ها", icon: "users", show: (u) => u.role === "admin" },
  { id: "reports", label: "گزارشات", icon: "chart", show: (u) => u.role !== "technician" },
  { id: "archive", label: "بایگانی سالیانه", icon: "archive", show: (u) => u.role === "admin" || u.canArchive },
  { id: "notifications", label: "اعلان‌ها", icon: "bell", show: () => true },
  { id: "logs", label: "لاگ فعالیت‌ها", icon: "list", show: (u) => u.role === "admin" || u.role === "supervisor" },
];

const TITLES: Record<Page, { t: string; s: string }> = {
  dashboard: { t: "داشبورد مدیریتی", s: "نمایش لحظه‌ای وضعیت تجهیزات و بازدیدهای روزانه" },
  scan: { t: "اسکن QR تجهیز", s: "اسکن بارکد دستگاه و شروع کنترل روزانه" },
  inspections: { t: "بازدیدهای روزانه", s: "ثبت و پیگیری نتایج کنترل روزانه تجهیزات" },
  equipment: { t: "مدیریت تجهیزات", s: "گروه‌ها، دستگاه‌ها، وضعیت و QR Code اختصاصی" },
  checklists: { t: "چک‌لیست‌های کنترل", s: "آیتم‌های داینامیک به تفکیک بخش و گروه تجهیز" },
  users: { t: "مدیریت کاربران", s: "سطوح دسترسی، فرم‌ها و بخش‌های مجاز هر کاربر" },
  reports: { t: "گزارشات", s: "گزارش‌های روزانه، هفتگی، ماهانه و خرابی‌ها با فیلتر پیشرفته" },
  notifications: { t: "اعلان‌ها", s: "هشدارها و یادآوری‌های ارسال‌شده در برنامه، پیامک و ایمیل" },
  logs: { t: "لاگ فعالیت‌ها", s: "ثبت کامل ورود، خروج و عملیات کاربران" },
  archive: { t: "بایگانی سالیانه", s: "دسترسی کنترل‌شده به رکوردهای سال‌های گذشته" },
};

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const sh = currentShift(now);
  return (
    <div className="hidden sm:flex items-center gap-2.5">
      <div className="text-left">
        <div className="font-display text-lg leading-5 text-ink num-ltr">
          {faNum(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`)}
        </div>
        <div className="text-[10px] text-mist font-semibold">{formatDateJLong(todayISO())}</div>
      </div>
      <span className="inline-flex items-center gap-1.5 bg-navy text-white text-[11px] font-bold rounded-md px-2.5 py-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-acc live-dot" />
        {SHIFTS[sh].name} <span className="text-white/50 font-normal num-ltr">{SHIFTS[sh].range}</span>
      </span>
    </div>
  );
}

export function Layout({ page, setPage, children }: { page: Page; setPage: (p: Page) => void; children: ReactNode }) {
  const { user, unread, logout } = useStore();
  const [moreOpen, setMoreOpen] = useState(false);
  if (!user) return null;
  const nav = NAV.filter((n) => n.show(user));
  const bottomIds: Page[] = ["dashboard", "inspections", "scan", user.role === "technician" ? "notifications" : "reports", "more" as Page];
  const bottom = nav.filter((n) => bottomIds.slice(0, 4).includes(n.id));
  const more = nav.filter((n) => !bottomIds.slice(0, 4).includes(n.id));
  const tt = TITLES[page];

  const NavBtn = ({ n, compact }: { n: (typeof NAV)[number]; compact?: boolean }) => {
    const active = page === n.id;
    return (
      <button onClick={() => { setPage(n.id); setMoreOpen(false); }}
        className={`w-full flex items-center gap-2.5 rounded-lg px-3 text-sm font-semibold transition-all duration-150 ${compact ? "py-2.5" : "py-2"} ${
          active ? "bg-acc text-white shadow-md shadow-acc/25" : "text-white/65 hover:bg-white/8 hover:text-white"}`}>
        <I name={n.icon} size={17} />
        <span className="flex-1 text-right">{n.label}</span>
        {n.id === "notifications" && unread > 0 && (
          <span className={`min-w-[20px] h-5 px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${active ? "bg-white text-acc" : "bg-nok text-white"}`}>{faNum(unread)}</span>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen flex">
      {/* -------- sidebar (desktop) -------- */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-navy blueprint sticky top-0 h-screen no-print">
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-lg bg-acc flex items-center justify-center shadow-lg shadow-acc/30">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none"><path d="M8 24V8l8 10 8-10v16" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <div>
              <div className="font-display text-2xl text-white leading-6">NIPCO</div>
              <div className="text-[10px] text-white/50 font-semibold tracking-wide">واحد نگهداری و تعمیرات</div>
            </div>
          </div>
        </div>
        <div className="hazard h-1.5 mx-4 rounded-full opacity-90" />
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <NavBtn n={nav[0]} />
          <div className="pt-2" />
          {nav.slice(1).map((n) => <NavBtn key={n.id} n={n} />)}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2.5 bg-white/5 rounded-lg p-2.5">
            <span className="w-9 h-9 rounded-lg bg-acc/20 text-acc font-display text-lg flex items-center justify-center shrink-0">{user.fullName[0]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[13px] font-bold truncate">{user.fullName}</p>
              <RoleBadge role={user.role} />
            </div>
          </div>
          <button onClick={logout} className="mt-2 w-full flex items-center justify-center gap-1.5 text-[12px] font-bold text-white/55 hover:text-nok py-1.5 rounded-md hover:bg-white/5 transition-colors">
            <I name="logout" size={14} />خروج از سیستم
          </button>
          <p className="text-center text-[9.5px] text-white/35 mt-2">تحلیل و طراحی سیستم: محمد روشندل • v1.0</p>
        </div>
      </aside>

      {/* -------- main -------- */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-line px-4 md:px-6 py-3 flex items-center gap-3 no-print">
          <div className="md:hidden flex items-center gap-2">
            <span className="w-8 h-8 rounded-md bg-acc flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 32 32" fill="none"><path d="M8 24V8l8 10 8-10v16" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-lg md:text-xl text-ink leading-6 truncate">{tt.t}</h1>
            <p className="hidden sm:block text-[11px] text-mist font-semibold truncate">{tt.s}</p>
          </div>
          <Clock />
          <button onClick={() => setPage("notifications")} className="relative p-2 rounded-lg hover:bg-paper text-steel transition-colors" title="اعلان‌ها">
            <I name="bell" size={19} />
            {unread > 0 && <span className="absolute top-0.5 left-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-nok text-white text-[9px] font-bold flex items-center justify-center">{faNum(unread)}</span>}
          </button>
          <button onClick={logout} className="md:hidden p-2 rounded-lg hover:bg-paper text-steel" title="خروج"><I name="logout" size={18} /></button>
        </header>
        <main className="flex-1 px-4 md:px-6 py-5 pb-24 md:pb-8 w-full max-w-[1200px] mx-auto">{children}</main>
      </div>

      {/* -------- mobile bottom nav -------- */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-navy border-t border-white/10 pb-[env(safe-area-inset-bottom)] no-print">
        <div className="grid grid-cols-5 items-end px-2 pt-1.5">
          {bottom.map((n) => (
            <button key={n.id} onClick={() => setPage(n.id)} className={`flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-colors ${page === n.id ? "text-acc" : "text-white/55"}`}>
              <I name={n.icon} size={19} />
              <span className="text-[9.5px] font-bold">{n.label.split(" ")[0]}</span>
            </button>
          ))}
          <button onClick={() => setMoreOpen(true)} className="flex flex-col items-center gap-0.5 py-1.5 text-white/55">
            <I name="box" size={19} />
            <span className="text-[9.5px] font-bold">بیشتر</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50" onMouseDown={(e) => e.target === e.currentTarget && setMoreOpen(false)}>
          <div className="absolute inset-0 bg-navy/65" onMouseDown={() => setMoreOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-navy blueprint rounded-t-2xl p-4 pb-8 anim-fade-up">
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4" />
            <div className="grid grid-cols-1 gap-1">
              {more.map((n) => <NavBtn key={n.id} n={n} compact />)}
              <button onClick={logout} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-nok hover:bg-white/8"><I name="logout" size={17} />خروج از سیستم</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
