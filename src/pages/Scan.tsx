import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import jsQR from "jsqr";
import type { Equipment } from "../types";
import { useStore } from "../store";
import { Btn, Empty, EQ_STATUS, I } from "../components/ui";
import { faNum, formatDateJ, formatDateJLong, timeAgo, todayISO } from "../utils";
import { InspectionForm } from "./Inspections";

/* ---------------- دوربین ---------------- */
function CameraScan({ onDetect }: { onDetect: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        await v.play();
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        const loop = () => {
          if (v.readyState === v.HAVE_ENOUGH_DATA) {
            canvas.width = v.videoWidth;
            canvas.height = v.videoHeight;
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(img.data, img.width, img.height);
            if (code?.data) { onDetect(code.data); return; }
          }
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch {
        setErr("دسترسی به دوربین ممکن نشد. از ورود دستی یا بارکدخوان استفاده کنید.");
      }
    })();
    return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, [onDetect]);

  if (err) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center anim-fade-up">
        <span className="w-14 h-14 rounded-xl bg-warnbg text-warn flex items-center justify-center mb-3"><I name="camera" size={24} /></span>
        <p className="font-bold text-ink">{err}</p>
      </div>
    );
  }
  return (
    <div className="relative rounded-xl overflow-hidden bg-navy aspect-[4/3] max-h-[380px]">
      <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-8 sm:inset-14 border-2 border-white/25 rounded-lg corner-frame" />
        <div className="absolute left-10 right-10 h-0.5 bg-acc shadow-[0_0_14px_2px_rgba(240,100,30,0.8)] scan-beam" />
        <p className="absolute bottom-3 inset-x-0 text-center text-white/85 text-[12px] font-bold">QR Code تجهیز را داخل کادر قرار دهید</p>
      </div>
    </div>
  );
}

/* ---------------- صفحه اسکن ---------------- */
export function ScanPage({ preselect, onExit }: { preselect: string; onExit: () => void }) {
  const { state, user, activeRecords, addLog, toast } = useStore();
  const [found, setFound] = useState<Equipment | null>(null);
  const [mode, setMode] = useState<"detect" | "form">("detect");
  const [tab, setTab] = useState<"camera" | "manual" | "list">("manual");
  const [manual, setManual] = useState("");
  const [notFound, setNotFound] = useState("");

  const findEq = useCallback((raw: string) => {
    const c = raw.trim().toUpperCase().replace(/^NIPCO[:\-\s]*/i, "");
    return state.equipment.find((e) => e.code.toUpperCase() === c || e.qr.toUpperCase() === raw.trim().toUpperCase()) ?? null;
  }, [state.equipment]);

  const detect = useCallback((code: string) => {
    const eq = findEq(code);
    if (eq) { setFound(eq); setNotFound(""); toast(`تجهیز شناسایی شد: ${eq.name}`, "info"); addLog("اسکن QR", `شناسایی تجهیز ${eq.code}`); }
    else setNotFound(`کد «${code}» در سیستم یافت نشد`);
  }, [findEq, toast, addLog]);

  useEffect(() => {
    if (preselect) {
      const eq = findEq(preselect);
      if (eq) setFound(eq);
    }
  }, [preselect, findEq]);

  const submitManual = (e: FormEvent) => {
    e.preventDefault();
    const eq = findEq(manual);
    if (eq) { setFound(eq); setNotFound(""); setManual(""); }
    else setNotFound(`تجهیزی با کد «${manual}» یافت نشد`);
  };

  /* ---- دسترسی کاربر به فرم این گروه ---- */
  const formAllowed = !!(user && (user.formAccess.length === 0 || (found && user.formAccess.includes(found.typeId))));
  const groupOf = found ? state.groups.find((g) => g.id === found.typeId) : null;
  const lastRec = found ? activeRecords.filter((r) => r.equipmentId === found.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] : null;
  const doneToday = found ? activeRecords.some((r) => r.equipmentId === found.id && r.date === todayISO()) : false;

  if (mode === "form" && found) {
    return <InspectionForm equipment={found} onSaved={() => { setMode("detect"); setFound(null); }} onCancel={() => { setMode("detect"); setFound(null); }} />;
  }

  return (
    <div className="anim-fade-up max-w-3xl mx-auto">
      {/* steps */}
      <div className="flex items-center gap-2 mb-4 text-[11px] font-bold">
        {["اسکن و شناسایی", "تأیید تجهیز و تکنسین", "تکمیل چک‌لیست"].map((s, i) => (
          <span key={s} className={`flex items-center gap-1.5 ${found ? (i === 0 ? "text-ok" : "text-acc") : i === 0 ? "text-acc" : "text-mist"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${found ? (i === 0 ? "bg-ok text-white border-ok" : "bg-accbg text-accd border-acc/40") : i === 0 ? "bg-acc text-white border-acc" : "border-line"}`}>{i === 0 && found ? <I name="check" size={10} /> : faNum(i + 1)}</span>
            {s}
          </span>
        ))}
      </div>

      {!found ? (
        <div className="bg-card border border-line rounded-xl overflow-hidden corner-frame">
          <div className="flex border-b border-line">
            {([["camera", "camera", "دوربین موبایل / تبلت"], ["manual", "keyboard", "بارکدخوان / ورود دستی"], ["list", "box", "انتخاب تجهیز"]] as const).map(([id, icon, label]) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[12px] font-bold transition-colors border-b-2 ${tab === id ? "border-acc text-acc bg-accbg/40" : "border-transparent text-mist hover:text-ink"}`}>
                <I name={icon} size={15} />{label}
              </button>
            ))}
          </div>
          <div className="p-4 sm:p-5">
            {tab === "camera" && <CameraScan onDetect={detect} />}
            {tab === "manual" && (
              <form onSubmit={submitManual} className="max-w-md mx-auto py-6">
                <p className="text-[13px] font-bold text-steel mb-2 flex items-center gap-1.5"><I name="keyboard" size={15} className="text-acc" />کد تجهیز را وارد یا با بارکدخوان اسکن کنید:</p>
                <div className="flex gap-2">
                  <input className="field num-ltr !py-2.5 font-bold" dir="ltr" placeholder="PRS-1000 , ABB-03 , CMP-01 …" value={manual} onChange={(e) => { setManual(e.target.value); setNotFound(""); }} autoFocus />
                  <Btn type="submit" disabled={!manual.trim()}><I name="search" size={15} />یافتن</Btn>
                </div>
                {notFound && <p className="text-[12px] font-bold text-nok mt-2 flex items-center gap-1 anim-fade-up"><I name="alert" size={13} />{notFound}</p>}
                <p className="text-[11px] text-mist font-semibold mt-3 leading-5">بارکدخوان‌های USB/بلوتوثی مانند کیبورد عمل می‌کنند — نشانگر را در این فیلد نگه دارید و بارکد را اسکن کنید (Enter خودکار).</p>
              </form>
            )}
            {tab === "list" && (
              <div className="space-y-4 py-2 max-h-[420px] overflow-y-auto pl-1">
                {state.groups.map((g) => {
                  const list = state.equipment.filter((e) => e.typeId === g.id && e.status !== "inactive");
                  if (!list.length) return null;
                  return (
                    <div key={g.id}>
                      <p className="text-[11.5px] font-bold text-mist mb-1.5">{g.name}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {list.map((e) => (
                          <button key={e.id} onClick={() => { setFound(e); setNotFound(""); }}
                            className={`inline-flex items-center gap-1.5 border rounded-md px-2.5 py-1.5 text-[11.5px] font-bold transition-all active:scale-95 hover:-translate-y-0.5 hover:shadow ${EQ_STATUS[e.status].cls}`}
                            title={e.status === "active" ? e.name : `${e.name} — ${EQ_STATUS[e.status].label}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${EQ_STATUS[e.status].dot}`} /><span dir="ltr">{e.code}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ---------- تأیید تجهیز ---------- */
        <div className="bg-card border border-line rounded-xl overflow-hidden corner-frame anim-pop">
          <div className="flex flex-col sm:flex-row">
            <div className="sm:w-52 h-36 sm:h-auto shrink-0 relative bg-navy/5">
              {found.image && <img src={found.image} alt={found.name} className="w-full h-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />}
              <span className={`absolute top-2 right-2 text-[10.5px] font-bold border rounded-md px-2 py-0.5 backdrop-blur bg-card/85 ${EQ_STATUS[found.status].cls}`}>{EQ_STATUS[found.status].label}</span>
            </div>
            <div className="flex-1 p-4 sm:p-5">
              <p className="text-[11px] font-bold text-mist flex items-center gap-1.5"><I name="check" size={12} className="text-ok" />تجهیز شناسایی شد</p>
              <h3 className="font-display text-2xl text-ink mt-1">{found.name}</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 text-[12px] font-semibold text-steel">
                <span>کد: <b dir="ltr" className="num-ltr">{found.code}</b></span>
                <span>گروه: <b>{groupOf?.name}</b></span>
                <span className="flex items-center gap-1"><I name="pin" size={12} className="text-mist" />{found.location}</span>
                <span>آخرین بازدید: <b>{lastRec ? `${formatDateJ(lastRec.date)} — ${timeAgo(lastRec.createdAt)}` : "ندارد"}</b></span>
              </div>
              {doneToday && (
                <p className="mt-3 text-[12px] font-bold text-info bg-infobg rounded-lg px-3 py-2 flex items-center gap-1.5"><I name="alert" size={14} />امروز برای این تجهیز بازدید ثبت شده — ثبت مجدد مجاز است</p>
              )}
              {!formAllowed && (
                <div className="mt-3 bg-nokbg border border-nok/25 rounded-lg p-3 text-[12.5px] font-bold text-nok leading-6 anim-fade-up">
                  <p className="flex items-center gap-1.5"><I name="lock" size={14} />دسترسی به فرم این گروه تجهیز را ندارید</p>
                  <p className="text-[11.5px] font-semibold text-nok/80 mt-0.5">سطح دسترسی شما ({user?.fullName}) تنها فرم‌های مجاز را پوشش می‌دهد. با مدیر سیستم تماس بگیرید.</p>
                </div>
              )}
              {formAllowed && found.status !== "active" && (
                <p className="mt-3 text-[12px] font-bold text-warn bg-warnbg rounded-lg px-3 py-2 flex items-center gap-1.5"><I name="wrench" size={14} />این تجهیز در وضعیت «{EQ_STATUS[found.status].label}» است — کنترل روزانه برای آن غیرفعال است</p>
              )}
              <div className="mt-4 bg-paper border border-line rounded-lg p-3 text-[12px] font-semibold text-steel flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-navy text-acc font-display text-base flex items-center justify-center shrink-0">{user?.fullName[0]}</span>
                <span>نام تکنسین به‌صورت خودکار ثبت می‌شود: <b className="text-ink">{user?.fullName}</b> ({user?.personnelCode})</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Btn size="lg" disabled={!formAllowed || found.status !== "active"} onClick={() => setMode("form")}>
                  <I name="clipboard" size={16} />شروع کنترل روزانه
                </Btn>
                <Btn variant="ghost" onClick={() => setFound(null)}>اسکن تجهیز دیگر</Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {!found && (
        <div className="mt-4 grid sm:grid-cols-3 gap-3">
          {[
            { icon: "qr" as const, t: "۱. اسکن QR", d: "برچسب QR روی بدنه تجهیز را اسکن کنید" },
            { icon: "users" as const, t: "۲. ورود تکنسین", d: "نام تکنسین از نشست فعال، خودکار ثبت می‌شود" },
            { icon: "checklist" as const, t: "۳. تکمیل چک‌لیست", d: "آیتم‌های OK/NOK همراه با مقادیر عددی و مستندات" },
          ].map((s) => (
            <div key={s.t} className="bg-card border border-line rounded-xl p-3.5 flex gap-3 hover:border-acc/50 transition-colors">
              <span className="w-9 h-9 rounded-lg bg-accbg text-accd flex items-center justify-center shrink-0"><I name={s.icon} size={17} /></span>
              <div><p className="text-[13px] font-bold text-ink">{s.t}</p><p className="text-[11px] text-mist font-semibold leading-5 mt-0.5">{s.d}</p></div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center mt-5">
        <Btn variant="ghost" onClick={onExit}><I name="chevron" size={14} className="-rotate-90" />بازگشت</Btn>
        <span className="text-[11px] font-bold text-mist hidden sm:block">{formatDateJLong(todayISO())}</span>
      </div>
      {state.equipment.length === 0 && <Empty icon="gear" title="تجهیزی ثبت نشده است" />}
    </div>
  );
}
