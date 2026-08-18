import { useMemo, useRef, useState } from "react";
import type { Equipment, InspectionRecord, RecordItem } from "../types";
import { useStore } from "../store";
import { Btn, Confirm, Empty, EQ_STATUS, I, JalaliDateInput, Modal, OkNokSeg, ResultChip } from "../components/ui";
import { compressImage, currentShift, faNum, fileToDataURL, formatDateJ, formatDateJLong, isoToJalali, jalaliToISO, monthStartISO, nowTime, SHIFTS, timeAgo, toJalaali, todayISO, uid, weekStartISO } from "../utils";

type Att = RecordItem["attachments"][number];
type Ans = { result: "ok" | "nok" | null; value: string; note: string; attachments: Att[] };

/* ============================================================
   فرم کنترل روزانه (داینامیک بر اساس چک‌لیست و دسترسی کاربر)
   ============================================================ */
export function InspectionForm({ equipment, onSaved, onCancel }: { equipment: Equipment; onSaved: () => void; onCancel?: () => void }) {
  const { state, user, addRecord, addLog, pushNotif, toast } = useStore();
  const [location, setLocation] = useState(equipment.location);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const items = useMemo(
    () => state.items.filter((i) => i.active && i.equipmentTypeIds.includes(equipment.typeId) && (user?.sectionAccess.length === 0 || user?.sectionAccess.includes(i.sectionId))),
    [state.items, equipment.typeId, user]
  );
  const sections = state.sections.filter((s) => s.active && items.some((i) => i.sectionId === s.id));

  const [answers, setAnswers] = useState<Record<string, Ans>>(() =>
    Object.fromEntries(items.map((i) => [i.id, { result: null, value: "", note: "", attachments: [] }]))
  );
  const setAns = (id: string, patch: Partial<Ans>) => setAnswers((a) => ({ ...a, [id]: { ...a[id], ...patch } }));
  const setNumValue = (id: string, v: string) => {
    const item = items.find((i) => i.id === id)!;
    const num = parseFloat(v);
    let result: "ok" | "nok" | null = answers[id].result;
    if (v !== "" && !Number.isNaN(num) && item.min !== undefined && item.max !== undefined) result = num >= item.min && num <= item.max ? "ok" : "nok";
    setAns(id, { value: v, result });
  };

  const done = items.filter((i) => answers[i.id]?.result).length;
  const nokCount = items.filter((i) => answers[i.id]?.result === "nok").length;
  const problems = items.filter((i) => {
    const a = answers[i.id];
    if (!a) return true;
    if (!a.result) return true;
    if (items.find((x) => x.id === i.id)?.type === "numeric" && (a.value === "" || Number.isNaN(parseFloat(a.value)))) return true;
    if (a.result === "nok" && !a.note.trim()) return true;
    return false;
  });

  const attach = async (id: string, kind: Att["kind"], files: FileList | null) => {
    if (!files || !files[0]) return;
    const f = files[0];
    if (f.size > 2.5 * 1024 * 1024) { toast("حجم فایل بیش از ۲.۵ مگابایت است", "error"); return; }
    const url = kind === "image" ? await compressImage(f) : await fileToDataURL(f);
    setAns(id, { attachments: [...answers[id].attachments, { kind, url, name: f.name }] });
    toast("فایل پیوست شد");
  };

  const submit = () => {
    setTried(true);
    if (problems.length > 0) {
      toast(`${faNum(problems.length)} آیتم تکمیل نشده — موارد NOK نیاز به توضیح الزامی دارند`, "error");
      document.getElementById(`itm-${problems[0].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSaving(true);
    setTimeout(() => {
      const shift = currentShift();
      const rec: InspectionRecord = {
        id: uid("rec"), equipmentId: equipment.id, technicianId: user!.id,
        date: todayISO(), time: nowTime(), shift, location: location.trim() || equipment.location,
        items: items.map((i) => ({
          itemId: i.id, result: answers[i.id].result!, note: answers[i.id].note.trim(),
          value: i.type === "numeric" ? parseFloat(answers[i.id].value) : undefined,
          attachments: answers[i.id].attachments,
        })),
        jalaliYear: toJalaali(new Date()).jy, createdAt: new Date().toISOString(),
      };
      addRecord(rec);
      addLog("ثبت بازدید", `کنترل روزانه ${equipment.name} — ${SHIFTS[shift].name}`);
      const noks = rec.items.filter((i) => i.result === "nok");
      if (noks.length > 0) {
        pushNotif({
          type: "danger", title: `ثبت ${faNum(noks.length)} مورد معیوب — ${equipment.name}`,
          body: `${user!.fullName} در ${SHIFTS[shift].name} موارد NOK ثبت کرد: ${noks.slice(0, 2).map((n) => state.items.find((x) => x.id === n.itemId)?.title).join("، ")}${noks.length > 2 ? " و …" : ""}. پیامک و ایمیل هشدار برای مدیر و سرپرست نت ارسال شد.`,
          channels: ["app", "sms", "email"],
        });
      }
      toast(noks.length ? "بازدید ثبت شد — هشدار NOK برای مدیر و سرپرست ارسال شد" : "بازدید با موفقیت ثبت شد", noks.length ? "info" : "success");
      onSaved();
    }, 450);
  };

  if (items.length === 0) {
    return (
      <Empty icon="checklist" title="آیتمی در دسترس شما نیست"
        sub="بر اساس سطح دسترسی شما، هیچ آیتم فعالی برای این تجهیز اختصاص نیافته است. با مدیر سیستم هماهنگ کنید."
        action={onCancel ? <Btn variant="outline" onClick={onCancel}>بازگشت</Btn> : undefined} />
    );
  }

  return (
    <div className="anim-fade-up">
      {/* header */}
      <div className="bg-card border border-line rounded-xl overflow-hidden corner-frame">
        <div className="flex flex-col sm:flex-row">
          <div className="sm:w-44 h-28 sm:h-auto shrink-0 bg-navy/5 overflow-hidden">
            {equipment.image && <img src={equipment.image} alt={equipment.name} className="w-full h-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />}
          </div>
          <div className="flex-1 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-xl text-ink">{equipment.name}</h3>
              <span className={`text-[10.5px] font-bold border rounded-md px-1.5 py-0.5 ${EQ_STATUS[equipment.status].cls}`}>{EQ_STATUS[equipment.status].label}</span>
              {equipment.critical && <span className="text-[10.5px] font-bold border border-nok/30 text-nok bg-nokbg rounded-md px-1.5 py-0.5 flex items-center gap-1"><I name="zap" size={10} />بحرانی</span>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1.5 mt-2.5 text-[12px] font-semibold text-steel">
              <span className="flex items-center gap-1.5"><I name="box" size={13} className="text-mist" /><b dir="ltr" className="num-ltr">{equipment.code}</b></span>
              <span className="flex items-center gap-1.5"><I name="calendar" size={13} className="text-mist" />{formatDateJLong(todayISO())}</span>
              <span className="flex items-center gap-1.5"><I name="clock" size={13} className="text-mist" />{faNum(nowTime())} — {SHIFTS[currentShift()].name}</span>
              <span className="flex items-center gap-1.5"><I name="users" size={13} className="text-mist" />تکنسین: <b className="text-ink">{user?.fullName}</b></span>
            </div>
            <div className="mt-3">
              <label className="flex items-center gap-2 text-[12px] font-bold text-steel">
                <I name="pin" size={14} className="text-mist" />موقعیت ثبت:
                <input className="field !py-1.5 !text-[12.5px] max-w-64" value={location} onChange={(e) => setLocation(e.target.value)} />
              </label>
            </div>
          </div>
        </div>
        {/* progress */}
        <div className="px-4 pb-3.5">
          <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
            <span className="text-steel">{faNum(done)} از {faNum(items.length)} آیتم ثبت شده</span>
            <span className={nokCount ? "text-nok" : "text-mist"}>{nokCount ? `${faNum(nokCount)} مورد NOK` : "بدون خرابی تا این لحظه"}</span>
          </div>
          <div className="h-2.5 bg-paper rounded-full overflow-hidden flex">
            <div className="bg-ok transition-all duration-500" style={{ width: `${(done / items.length) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* sections */}
      <div className="space-y-4 mt-4">
        {sections.map((sec) => {
          const secItems = items.filter((i) => i.sectionId === sec.id);
          const secDone = secItems.filter((i) => answers[i.id]?.result).length;
          return (
            <div key={sec.id} className="bg-card border border-line rounded-xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-paper/70 border-b border-line">
                <span className="w-1.5 h-5 bg-acc rounded-full" />
                <h4 className="font-display text-base text-ink flex-1">بخش {sec.name}</h4>
                <span className={`text-[10.5px] font-bold rounded-md px-2 py-0.5 ${secDone === secItems.length ? "bg-okbg text-ok" : "bg-card border border-line text-mist"}`}>{faNum(secDone)}/{faNum(secItems.length)}</span>
              </div>
              <div className="divide-y divide-line">
                {secItems.map((item) => {
                  const a = answers[item.id];
                  const isProblem = tried && problems.some((p) => p.id === item.id);
                  const needNote = a?.result === "nok" && !a.note.trim();
                  return (
                    <div key={item.id} id={`itm-${item.id}`} className={`p-3.5 sm:p-4 transition-colors ${isProblem ? "bg-nokbg/40" : a?.result === "nok" ? "bg-nokbg/25" : a?.result === "ok" ? "bg-okbg/20" : ""}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-[13.5px] font-bold text-ink">{item.title}</p>
                          {item.type === "numeric" && (
                            <p className="text-[10.5px] text-mist font-semibold mt-0.5">محدوده مجاز: <b dir="ltr" className="num-ltr text-steel">{faNum(item.min!)} – {faNum(item.max!)} {item.unit}</b></p>
                          )}
                        </div>
                        {item.type === "numeric" && (
                          <div className="flex items-center gap-1.5">
                            <input inputMode="decimal" dir="ltr" placeholder="0.0"
                              className={`field !w-24 !py-1.5 !text-center font-bold num-ltr ${a?.value && a.result === "nok" ? "!border-nok" : a?.value ? "!border-ok" : ""}`}
                              value={a?.value ?? ""} onChange={(e) => setNumValue(item.id, e.target.value)} />
                            <span className="text-[11px] font-bold text-mist w-8">{item.unit}</span>
                          </div>
                        )}
                        <OkNokSeg compact value={a?.result ?? null} onChange={(v) => setAns(item.id, { result: v })} />
                      </div>
                      {a?.result === "nok" && (
                        <div className="mt-2.5 anim-fade-up">
                          <textarea rows={2} placeholder="شرح خرابی / اقدام مورد نیاز (الزامی)…"
                            className={`field !text-[12.5px] ${needNote && tried ? "field-err" : ""}`}
                            value={a.note} onChange={(e) => setAns(item.id, { note: e.target.value })} />
                          {needNote && tried && <p className="text-[11px] text-nok font-bold mt-1 flex items-center gap-1"><I name="alert" size={11} />ثبت توضیح برای مورد NOK الزامی است</p>}
                        </div>
                      )}
                      {/* attachments */}
                      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                        {([["image", "camera", "عکس"], ["video", "video", "ویدئو"], ["audio", "mic", "صوت"]] as const).map(([kind, icon, label]) => (
                          <span key={kind}>
                            <input ref={(el) => { fileRefs.current[`${item.id}-${kind}`] = el; }} type="file" className="hidden"
                              accept={kind === "image" ? "image/*" : kind === "video" ? "video/*" : "audio/*"}
                              capture={kind !== "audio" ? "environment" : undefined}
                              onChange={(e) => { attach(item.id, kind, e.target.files); e.target.value = ""; }} />
                            <button type="button" onClick={() => fileRefs.current[`${item.id}-${kind}`]?.click()}
                              className="inline-flex items-center gap-1 text-[10.5px] font-bold text-steel border border-line rounded-md px-2 py-1 hover:border-acc hover:text-acc hover:bg-accbg transition-all active:scale-95">
                              <I name={icon} size={12} />{label}
                            </button>
                          </span>
                        ))}
                        {a?.attachments.map((at, i) => (
                          <span key={i} className="relative group">
                            {at.kind === "image"
                              ? <img src={at.url} alt={at.name} className="w-9 h-9 rounded-md object-cover border border-line" />
                              : <span className="w-9 h-9 rounded-md border border-line bg-paper flex items-center justify-center text-mist"><I name={at.kind === "video" ? "video" : "mic"} size={14} /></span>}
                            <button type="button" onClick={() => setAns(item.id, { attachments: a.attachments.filter((_, x) => x !== i) })}
                              className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-nok text-white items-center justify-center hidden group-hover:flex"><I name="x" size={9} /></button>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* actions */}
      <div className="sticky bottom-16 md:bottom-4 z-30 mt-5 bg-card border border-line rounded-xl shadow-xl shadow-navy/10 p-3 flex items-center gap-2.5">
        <div className="flex-1 text-[11.5px] font-bold text-steel">
          {problems.length === 0
            ? <span className="text-ok flex items-center gap-1"><I name="check" size={13} />همه آیتم‌ها تکمیل شده — آماده ثبت</span>
            : <span className="flex items-center gap-1"><I name="alert" size={13} className={tried ? "text-nok" : "text-warn"} />{faNum(problems.length)} آیتم باقی‌مانده</span>}
        </div>
        {onCancel && <Btn variant="ghost" onClick={onCancel}>انصراف</Btn>}
        <Btn size="lg" onClick={submit} disabled={saving}>{saving ? "در حال ثبت…" : "ثبت نهایی بازدید"}<I name="check" size={16} /></Btn>
      </div>
    </div>
  );
}

/* ============================================================
   مودال جزئیات رکورد
   ============================================================ */
export function RecordModal({ record, onClose }: { record: InspectionRecord | null; onClose: () => void }) {
  const { state } = useStore();
  if (!record) return null;
  const eq = state.equipment.find((e) => e.id === record.equipmentId);
  const tech = state.users.find((u) => u.id === record.technicianId);
  const noks = record.items.filter((i) => i.result === "nok");
  const grouped = state.sections.map((s) => ({ s, items: record.items.filter((i) => state.items.find((x) => x.id === i.itemId)?.sectionId === s.id) })).filter((g) => g.items.length > 0);
  return (
    <Modal open onClose={onClose} title={`جزئیات بازدید — ${eq?.name ?? ""}`} w="max-w-2xl" icon="clipboard">
      <div className="print-area">
        <div className="hidden print:block text-center mb-4">
          <h2 className="font-display text-xl">NIPCO — فرم کنترل روزانه تجهیزات</h2>
          <p className="text-xs text-mist">واحد نگهداری و تعمیرات</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[12px] font-semibold bg-paper rounded-lg p-3 border border-line">
          <span><span className="text-mist">تجهیز: </span><b>{eq?.name}</b></span>
          <span><span className="text-mist">کد: </span><b dir="ltr" className="num-ltr">{eq?.code}</b></span>
          <span><span className="text-mist">تکنسین: </span><b>{tech?.fullName}</b></span>
          <span><span className="text-mist">تاریخ: </span><b>{formatDateJ(record.date)}</b></span>
          <span><span className="text-mist">ساعت: </span><b className="num-ltr">{faNum(record.time)}</b></span>
          <span><span className="text-mist">شیفت: </span><b>{SHIFTS[record.shift].name}</b></span>
          <span className="col-span-2"><span className="text-mist">موقعیت: </span><b>{record.location}</b></span>
          <span><span className="text-mist">نتیجه: </span>{noks.length ? <ResultChip r="nok" small /> : <ResultChip r="ok" small />}</span>
        </div>
        <div className="space-y-3 mt-4">
          {grouped.map(({ s, items }) => (
            <div key={s.id}>
              <p className="text-[12px] font-bold text-steel mb-1.5 flex items-center gap-1.5"><span className="w-1 h-4 bg-acc rounded-full" />بخش {s.name}</p>
              <div className="border border-line rounded-lg divide-y divide-line">
                {items.map((ri) => {
                  const def = state.items.find((x) => x.id === ri.itemId);
                  return (
                    <div key={ri.itemId} className="p-2.5 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <p className="flex-1 text-[13px] font-bold text-ink">{def?.title ?? "آیتم حذف‌شده"}</p>
                        {def?.type === "numeric" && <span className="text-[12px] font-bold num-ltr text-steel" dir="ltr">{faNum(ri.value ?? "—")} {def.unit}</span>}
                        <ResultChip r={ri.result} small />
                      </div>
                      {ri.note && <p className={`text-[12px] font-semibold rounded-md px-2.5 py-1.5 ${ri.result === "nok" ? "bg-nokbg text-nok" : "bg-warnbg text-warn"}`}>{ri.note}</p>}
                      {ri.attachments.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap">
                          {ri.attachments.map((a, i) => a.kind === "image"
                            ? <img key={i} src={a.url} alt={a.name} className="w-12 h-12 rounded-md object-cover border border-line" />
                            : <span key={i} className="w-12 h-12 rounded-md bg-paper border border-line flex items-center justify-center text-mist"><I name={a.kind === "video" ? "video" : "mic"} size={16} /></span>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="hidden print:grid grid-cols-2 gap-8 mt-8 text-xs font-semibold">
          <p>امضاء تکنسین: ____________________</p>
          <p>تأیید سرپرست نت: ____________________</p>
        </div>
        <div className="flex justify-end gap-2 mt-5 no-print">
          <Btn variant="outline" onClick={() => window.print()}><I name="printer" size={15} />چاپ / PDF</Btn>
          <Btn variant="dark" onClick={onClose}>بستن</Btn>
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================
   صفحه فهرست بازدیدها
   ============================================================ */
export function InspectionsPage({ goScan }: { goScan: () => void }) {
  const { state, user, can, deleteRecord, addLog, toast } = useStore();
  const [fGroup, setFGroup] = useState("");
  const [fTech, setFTech] = useState("");
  const [fShift, setFShift] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fDate, setFDate] = useState(todayISO());
  const [view, setView] = useState<InspectionRecord | null>(null);
  const [del, setDel] = useState<InspectionRecord | null>(null);

  const rows = useMemo(() => {
    let r = state.records;
    if (user?.role === "technician") r = r.filter((x) => x.technicianId === user.id);
    if (fDate) r = r.filter((x) => x.date === fDate);
    if (fGroup) r = r.filter((x) => state.equipment.find((e) => e.id === x.equipmentId)?.typeId === fGroup);
    if (fTech) r = r.filter((x) => x.technicianId === fTech);
    if (fShift) r = r.filter((x) => x.shift === +fShift);
    if (fStatus) r = r.filter((x) => (fStatus === "nok" ? x.items.some((i) => i.result === "nok") : !x.items.some((i) => i.result === "nok")));
    return [...r].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [state, user, fGroup, fTech, fShift, fStatus, fDate]);

  const quick = [
    { l: "امروز", v: todayISO() }, { l: "دیروز", v: (() => { const d = new Date(); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })() },
    { l: "این هفته", v: weekStartISO() }, { l: "این ماه", v: monthStartISO() },
  ];
  const sel = "field !py-1.5 !text-[12.5px] !w-auto";

  return (
    <div className="anim-fade-up">
      {/* filters */}
      <div className="bg-card border border-line rounded-xl p-3.5 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11.5px] font-bold text-mist flex items-center gap-1"><I name="filter" size={13} />فیلتر:</span>
          <div className="flex gap-1">
            {quick.map((q) => (
              <button key={q.l} onClick={() => setFDate(q.v)}
                className={`text-[11px] font-bold rounded-md px-2.5 py-1.5 border transition-all ${fDate === q.v ? "bg-navy text-white border-navy" : "border-line text-steel hover:border-acc hover:text-acc"}`}>{q.l}</button>
            ))}
            <button onClick={() => setFDate("")} className={`text-[11px] font-bold rounded-md px-2.5 py-1.5 border transition-all ${fDate === "" ? "bg-navy text-white border-navy" : "border-line text-steel hover:border-acc hover:text-acc"}`}>همه</button>
          </div>
          <JalaliDateInput value={fDate} onChange={setFDate} clearable />
        </div>
        <div className="flex flex-wrap gap-2 mt-2.5">
          <select className={sel} value={fGroup} onChange={(e) => setFGroup(e.target.value)}>
            <option value="">همه گروه‌ها</option>
            {state.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          {user?.role !== "technician" && (
            <select className={sel} value={fTech} onChange={(e) => setFTech(e.target.value)}>
              <option value="">همه تکنسین‌ها</option>
              {state.users.filter((u) => u.role !== "viewer").map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          )}
          <select className={sel} value={fShift} onChange={(e) => setFShift(e.target.value)}>
            <option value="">همه شیفت‌ها</option>
            {([1, 2, 3] as const).map((s) => <option key={s} value={s}>{SHIFTS[s].name} ({SHIFTS[s].range})</option>)}
          </select>
          <select className={sel} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">همه نتایج</option>
            <option value="ok">سالم</option>
            <option value="nok">دارای مورد معیوب</option>
          </select>
          <span className="mr-auto text-[11.5px] font-bold text-mist self-center">{faNum(rows.length)} رکورد</span>
        </div>
      </div>

      {can("inspections.create") && (
        <div className="flex justify-end mb-3">
          <Btn onClick={goScan}><I name="qr" size={15} />ثبت بازدید جدید (اسکن QR)</Btn>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="bg-card border border-line rounded-xl">
          <Empty icon="clipboard" title="رکوردی مطابق فیلترها یافت نشد" sub="فیلترها را تغییر دهید یا بازدید جدیدی ثبت کنید."
            action={can("inspections.create") ? <Btn onClick={goScan}><I name="qr" size={15} />شروع اسکن</Btn> : undefined} />
        </div>
      ) : (
        <div className="bg-card border border-line rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="bg-paper/80 text-mist text-[11px] font-bold border-b border-line">
                  <th className="text-right px-3.5 py-2.5">تجهیز</th>
                  <th className="text-right px-3.5 py-2.5 hidden sm:table-cell">تکنسین</th>
                  <th className="text-right px-3.5 py-2.5">تاریخ</th>
                  <th className="text-right px-3.5 py-2.5 hidden md:table-cell">ساعت</th>
                  <th className="text-right px-3.5 py-2.5">شیفت</th>
                  <th className="text-right px-3.5 py-2.5">نتیجه</th>
                  <th className="text-right px-3.5 py-2.5">جزئیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.slice(0, 60).map((r) => {
                  const eq = state.equipment.find((e) => e.id === r.equipmentId);
                  const tech = state.users.find((u) => u.id === r.technicianId);
                  const nok = r.items.some((i) => i.result === "nok");
                  const nokN = r.items.filter((i) => i.result === "nok").length;
                  return (
                    <tr key={r.id} className="hover:bg-paper/50 transition-colors">
                      <td className="px-3.5 py-2.5">
                        <p className="font-bold text-ink">{eq?.name ?? "حذف‌شده"}</p>
                        <p className="text-[10.5px] text-mist font-semibold num-ltr" dir="ltr">{eq?.code}</p>
                      </td>
                      <td className="px-3.5 py-2.5 hidden sm:table-cell font-semibold text-steel">{tech?.fullName ?? "—"}</td>
                      <td className="px-3.5 py-2.5 font-semibold num-ltr">{formatDateJ(r.date)}</td>
                      <td className="px-3.5 py-2.5 hidden md:table-cell font-semibold num-ltr">{faNum(r.time)}</td>
                      <td className="px-3.5 py-2.5"><span className="text-[10.5px] font-bold bg-infobg text-info rounded-md px-2 py-0.5">{SHIFTS[r.shift].name}</span></td>
                      <td className="px-3.5 py-2.5">
                        {nok ? <span className="inline-flex items-center gap-1"><ResultChip r="nok" small />{nokN > 1 && <span className="text-[10px] font-bold text-nok">×{faNum(nokN)}</span>}</span> : <ResultChip r="ok" small />}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="flex gap-1">
                          <button onClick={() => setView(r)} className="p-1.5 rounded-md border border-line text-steel hover:border-info hover:text-info hover:bg-infobg transition-all" title="مشاهده"><I name="eye" size={14} /></button>
                          {(user?.role === "admin" || user?.role === "supervisor") && (
                            <button onClick={() => setDel(r)} className="p-1.5 rounded-md border border-line text-steel hover:border-nok hover:text-nok hover:bg-nokbg transition-all" title="حذف"><I name="trash" size={14} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows.length > 60 && <p className="text-center text-[11px] font-bold text-mist py-2.5 border-t border-line">{faNum(rows.length - 60)} رکورد دیگر — فیلترها را محدودتر کنید</p>}
        </div>
      )}

      <RecordModal record={view} onClose={() => setView(null)} />
      <Confirm open={!!del} onClose={() => setDel(null)} onYes={() => {
        if (!del) return;
        deleteRecord(del.id);
        addLog("حذف رکورد", `حذف بازدید ${formatDateJ(del.date)}`);
        toast("رکورد بازدید حذف شد");
      }}
        title="حذف رکورد بازدید" body={`رکورد بازدید ${formatDateJ(del?.date ?? "")} حذف شود؟ این عمل قابل بازگشت نیست و در لاگ ثبت می‌شود.`} />
    </div>
  );
}


