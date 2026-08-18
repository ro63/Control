import { useState } from "react";
import type { FormEvent } from "react";
import { useStore } from "../store";
import { Btn, I } from "../components/ui";
import { faNum } from "../utils";

const DEMO = [
  { label: "مدیر سیستم", u: "m.roshandel", p: "admin123" },
  { label: "سرپرست نت", u: "j.takhti", p: "takhti123" },
  { label: "تکنسین برق", u: "esfandiari", p: "esf123" },
  { label: "تکنسین مکانیک", u: "f.azamian", p: "azamian123" },
  { label: "مشاهده‌کننده", u: "viewer", p: "viewer123" },
];

export function Login() {
  const { login, toast, state } = useStore();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => {
      const r = login(u, p);
      setBusy(false);
      if (!r.ok) { setErr(r.msg ?? "خطا"); setShakeKey((k) => k + 1); return; }
      toast("ورود موفق — خوش آمدید");
    }, 350);
  };

  return (
    <div className="min-h-screen flex">
      {/* ---------- brand panel ---------- */}
      <div className="hidden lg:flex flex-col w-[46%] blueprint text-white relative overflow-hidden">
        <div className="hazard h-2.5" />
        <div className="flex-1 flex flex-col justify-center px-12 py-10">
          <div className="flex items-center gap-4 anim-fade-up">
            <span className="w-16 h-16 rounded-xl bg-acc flex items-center justify-center shadow-xl shadow-acc/30 anim-spin-slow" style={{ animationDuration: "22s" }}>
              <svg width="40" height="40" viewBox="0 0 32 32" fill="none"><path d="M8 24V8l8 10 8-10v16" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <div>
              <h1 className="font-display text-5xl leading-tight">NIPCO</h1>
              <p className="text-white/55 font-semibold text-sm">شرکت قطعه‌سازی خودرو — واحد نت</p>
            </div>
          </div>
          <h2 className="font-display text-4xl leading-snug mt-9 max-w-md anim-fade-up" style={{ animationDelay: "0.08s" }}>
            سامانه کنترل روزانه تجهیزات
          </h2>
          <p className="text-white/60 leading-7 mt-3 max-w-md text-[15px] anim-fade-up" style={{ animationDelay: "0.14s" }}>
            ثبت بازدید روزانه پرس‌های هیدرولیک، ربات‌های ABB، کمپرسورهای اسکرو، لیفتراک‌های سپاهان و تجهیزات موتورخانه با اسکن QR Code — در سه شیفت کاری.
          </p>
          <div className="flex flex-wrap gap-2 mt-7 anim-fade-up" style={{ animationDelay: "0.2s" }}>
            {["QR Code Engine", "۳ شیفت کاری", "گزارش‌گیری لحظه‌ای", "خروجی PDF و Excel", "سطوح دسترسی داینامیک"].map((t) => (
              <span key={t} className="text-[12px] font-bold bg-white/8 border border-white/12 rounded-md px-3 py-1.5">{t}</span>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 mt-10 max-w-md anim-fade-up" style={{ animationDelay: "0.26s" }}>
            {[
              { n: state.equipment.length, l: "تجهیز ثبت‌شده" },
              { n: state.groups.length, l: "گروه تجهیز" },
              { n: state.items.length, l: "آیتم چک‌لیست" },
            ].map((s) => (
              <div key={s.l} className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 corner-frame">
                <div className="font-display text-3xl text-acc">{faNum(s.n)}</div>
                <div className="text-[11px] text-white/55 font-semibold mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="px-12 pb-6 text-[12px] text-white/40 font-semibold">تحلیل و طراحی سیستم: محمد روشندل</div>
      </div>

      {/* ---------- form ---------- */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-7">
            <span className="w-12 h-12 rounded-lg bg-navy flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none"><path d="M8 24V8l8 10 8-10v16" stroke="#F0641E" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <div>
              <div className="font-display text-2xl text-ink leading-6">NIPCO — کنترل روزانه تجهیزات</div>
              <div className="text-[11px] text-mist font-bold">واحد نگهداری و تعمیرات</div>
            </div>
          </div>

          <div key={shakeKey} className={`bg-card border border-line rounded-xl shadow-xl shadow-navy/5 p-6 sm:p-7 corner-frame ${shakeKey ? "anim-shake" : "anim-fade-up"}`}>
            <div className="flex items-center gap-2 mb-5">
              <span className="w-8 h-8 rounded-md bg-accbg text-accd flex items-center justify-center"><I name="lock" size={16} /></span>
              <div>
                <h3 className="font-display text-xl text-ink leading-6">ورود به سیستم</h3>
                <p className="text-[11px] text-mist font-semibold">احراز هویت امن — رمز عبور رمزنگاری می‌شود</p>
              </div>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-steel mb-1">نام کاربری</label>
                <div className="relative">
                  <input className="field !py-2.5 num-ltr" dir="ltr" placeholder="username" value={u} onChange={(e) => { setU(e.target.value); setErr(""); }} autoFocus />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mist"><I name="users" size={16} /></span>
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-steel mb-1">رمز عبور</label>
                <div className="relative">
                  <input className="field !py-2.5 num-ltr" dir="ltr" type={show ? "text" : "password"} placeholder="••••••••" value={p} onChange={(e) => { setP(e.target.value); setErr(""); }} />
                  <button type="button" onClick={() => setShow(!show)} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist hover:text-ink"><I name={show ? "eyeOff" : "eye"} size={16} /></button>
                </div>
              </div>
              {err && (
                <div className="flex items-center gap-2 bg-nokbg text-nok text-[12px] font-bold rounded-lg px-3 py-2.5 anim-fade-up">
                  <I name="alert" size={15} />{err}
                </div>
              )}
              <Btn type="submit" size="lg" className="w-full" disabled={busy || !u || !p}>
                {busy ? "در حال احراز هویت…" : "ورود به سامانه"}<I name="send" size={16} />
              </Btn>
            </form>

            <div className="mt-6 pt-5 border-t border-dashed border-line">
              <p className="text-[11px] font-bold text-mist mb-2.5 flex items-center gap-1.5"><I name="zap" size={13} className="text-acc" />ورود سریع با حساب‌های نمونه:</p>
              <div className="flex flex-wrap gap-1.5">
                {DEMO.map((d) => (
                  <button key={d.u} type="button" onClick={() => { setU(d.u); setP(d.p); setErr(""); }}
                    className="text-[11.5px] font-bold border-[1.5px] border-line rounded-md px-2.5 py-1.5 text-steel hover:border-acc hover:text-acc hover:bg-accbg transition-all active:scale-95">
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="text-center text-[11px] text-mist font-semibold mt-5">NIPCO — سامانه PWA قابل اجرا روی موبایل، تبلت و کامپیوتر</p>
        </div>
      </div>
    </div>
  );
}
