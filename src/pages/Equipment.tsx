import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import type { Equipment, EquipmentStatus } from "../types";
import { useStore } from "../store";
import { Btn, Confirm, Empty, EQ_STATUS, Field, I, Modal, Toggle } from "../components/ui";
import { compressImage, faNum, formatDateJ, timeAgo, todayISO, uid } from "../utils";

const EMPTY: Omit<Equipment, "id"> = { code: "", name: "", typeId: "", location: "", status: "active", qr: "", commissionDate: "2023-01-01", critical: false };

export function EquipmentPage() {
  const { state, can, saveEquipment, deleteEquipment, saveGroup, deleteGroup, addLog, toast } = useStore();
  const [tab, setTab] = useState("");
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [edit, setEdit] = useState<Equipment | null | "new">(null);
  const [qrEq, setQrEq] = useState<Equipment | null>(null);
  const [del, setDel] = useState<Equipment | null>(null);
  const [gModal, setGModal] = useState<{ id?: string; name: string; image?: string } | null>(null);
  const [delGroup, setDelGroup] = useState<string | null>(null);

  const list = useMemo(() => {
    let l = state.equipment;
    if (tab) l = l.filter((e) => e.typeId === tab);
    if (fStatus) l = l.filter((e) => e.status === fStatus);
    if (q.trim()) { const s = q.trim().toLowerCase(); l = l.filter((e) => e.name.toLowerCase().includes(s) || e.code.toLowerCase().includes(s) || e.location.toLowerCase().includes(s)); }
    return l;
  }, [state.equipment, tab, fStatus, q]);

  const manage = can("equipment.manage");
  const statusCounts = (["active", "repair", "out", "inactive"] as const).map((s) => ({ s, n: state.equipment.filter((e) => e.status === s).length }));

  return (
    <div className="anim-fade-up">
      {/* stats */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 bg-card border border-line rounded-lg px-3 py-1.5 text-[12px] font-bold text-steel"><I name="gear" size={14} className="text-mist" />مجموع: {faNum(state.equipment.length)}</span>
        {statusCounts.map(({ s, n }) => (
          <button key={s} onClick={() => setFStatus(fStatus === s ? "" : s)}
            className={`inline-flex items-center gap-1.5 border rounded-lg px-3 py-1.5 text-[12px] font-bold transition-all ${EQ_STATUS[s].cls} ${fStatus === s ? "ring-2 ring-acc/40" : ""}`}>
            <span className={`w-2 h-2 rounded-full ${EQ_STATUS[s].dot}`} />{EQ_STATUS[s].label}: {faNum(n)}
          </button>
        ))}
        {manage && <Btn size="sm" className="mr-auto" onClick={() => setEdit("new")}><I name="plus" size={14} />تجهیز جدید</Btn>}
      </div>

      {/* group tabs */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        <button onClick={() => setTab("")} className={`text-[12px] font-bold rounded-lg px-3 py-2 border transition-all ${tab === "" ? "bg-navy text-white border-navy" : "bg-card border-line text-steel hover:border-acc hover:text-acc"}`}>همه ({faNum(state.equipment.length)})</button>
        {state.groups.map((g) => (
          <span key={g.id} className="inline-flex items-center rounded-lg border border-line bg-card overflow-hidden group">
            <button onClick={() => setTab(tab === g.id ? "" : g.id)} className={`text-[12px] font-bold px-3 py-2 transition-all ${tab === g.id ? "bg-acc text-white" : "text-steel hover:text-acc"}`}>
              {g.name} ({faNum(state.equipment.filter((e) => e.typeId === g.id).length)})
            </button>
            {can("groups.manage") && (
              <span className="hidden group-hover:flex items-center border-r border-line">
                <button className="p-2 text-mist hover:text-info" title="ویرایش گروه" onClick={() => setGModal({ id: g.id, name: g.name, image: g.image })}><I name="pencil" size={12} /></button>
                <button className="p-2 text-mist hover:text-nok" title="حذف گروه" onClick={() => setDelGroup(g.id)}><I name="trash" size={12} /></button>
              </span>
            )}
          </span>
        ))}
        {can("groups.manage") && (
          <button onClick={() => setGModal({ name: "" })} className="inline-flex items-center gap-1 text-[12px] font-bold rounded-lg px-3 py-2 border border-dashed border-mist/50 text-mist hover:border-acc hover:text-acc transition-all">
            <I name="plus" size={13} />گروه جدید
          </button>
        )}
      </div>

      {/* search */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <input className="field !py-2" placeholder="جستجو بر اساس نام، کد یا محل استقرار…" value={q} onChange={(e) => setQ(e.target.value)} />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mist"><I name="search" size={15} /></span>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="bg-card border border-line rounded-xl"><Empty icon="gear" title="تجهیزی یافت نشد" sub="فیلترها را تغییر دهید یا تجهیز جدیدی ثبت کنید." action={manage ? <Btn onClick={() => setEdit("new")}><I name="plus" size={15} />افزودن تجهیز</Btn> : undefined} /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((e) => {
            const g = state.groups.find((x) => x.id === e.typeId);
            const last = state.records.filter((r) => r.equipmentId === e.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
            const missedToday = e.status === "active" && !state.records.some((r) => r.equipmentId === e.id && r.date === todayISO());
            return (
              <div key={e.id} className="bg-card border border-line rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:shadow-navy/8 transition-all duration-200 group">
                <div className="h-36 bg-navy/5 relative overflow-hidden">
                  {e.image
                    ? <img src={e.image} alt={e.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(ev) => ((ev.target as HTMLImageElement).style.display = "none")} />
                    : <div className="w-full h-full flex items-center justify-center text-mist/50"><I name="gear" size={44} /></div>}
                  <span className={`absolute top-2 right-2 text-[10.5px] font-bold border rounded-md px-2 py-0.5 bg-card/90 ${EQ_STATUS[e.status].cls}`}>{EQ_STATUS[e.status].label}</span>
                  {e.critical && <span className="absolute top-2 left-2 text-[10.5px] font-bold bg-nok text-white rounded-md px-2 py-0.5 flex items-center gap-1"><I name="zap" size={10} />بحرانی</span>}
                  {missedToday && <span className="absolute bottom-2 right-2 text-[10px] font-bold bg-warn text-white rounded-md px-2 py-0.5">بازدید امروز انجام نشده</span>}
                </div>
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-[14px] text-ink truncate">{e.name}</h4>
                      <p className="text-[11px] font-bold text-mist num-ltr" dir="ltr">{e.qr}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2.5 text-[11px] font-semibold text-steel">
                    <span className="flex items-center gap-1 truncate"><I name="box" size={11} className="text-mist shrink-0" />{g?.name ?? "—"}</span>
                    <span className="flex items-center gap-1 truncate"><I name="pin" size={11} className="text-mist shrink-0" />{e.location || "—"}</span>
                    <span className="flex items-center gap-1"><I name="calendar" size={11} className="text-mist shrink-0" />بهره‌برداری: {formatDateJ(e.commissionDate)}</span>
                    <span className="flex items-center gap-1 truncate"><I name="history" size={11} className="text-mist shrink-0" />{last ? timeAgo(last.createdAt) : "بدون بازدید"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-line">
                    <Btn size="sm" variant="outline" onClick={() => setQrEq(e)} title="نمایش و چاپ QR"><I name="qr" size={13} />QR</Btn>
                    {manage && (
                      <>
                        <select className="field !py-1 !px-1.5 !text-[11px] !w-auto font-bold" value={e.status}
                          onChange={(ev) => {
                            const s = ev.target.value as EquipmentStatus;
                            saveEquipment({ ...e, status: s });
                            addLog("تغییر وضعیت تجهیز", `${e.name} → ${EQ_STATUS[s].label}`);
                            toast(`وضعیت ${e.name} به «${EQ_STATUS[s].label}» تغییر کرد`);
                          }}>
                          {(Object.keys(EQ_STATUS) as EquipmentStatus[]).map((s) => <option key={s} value={s}>{EQ_STATUS[s].label}</option>)}
                        </select>
                        <button onClick={() => setEdit(e)} className="p-1.5 rounded-md border border-line text-steel hover:border-info hover:text-info hover:bg-infobg transition-all" title="ویرایش"><I name="pencil" size={14} /></button>
                        <button onClick={() => setDel(e)} className="p-1.5 rounded-md border border-line text-steel hover:border-nok hover:text-nok hover:bg-nokbg transition-all" title="حذف"><I name="trash" size={14} /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------- edit modal ---------- */}
      {edit && (
        <EquipModal key={edit === "new" ? "new" : edit.id} initial={edit === "new" ? null : edit}
          onClose={() => setEdit(null)}
          onSave={(e) => {
            saveEquipment(e);
            addLog(edit === "new" ? "افزودن تجهیز" : "ویرایش تجهیز", `${e.name} (${e.code})`);
            toast(edit === "new" ? "تجهیز جدید ثبت شد" : "تغییرات ذخیره شد");
            setEdit(null);
          }} />
      )}

      {/* ---------- group modal ---------- */}
      {gModal && (
        <Modal open onClose={() => setGModal(null)} title={gModal.id ? "ویرایش گروه تجهیز" : "گروه تجهیز جدید"} icon="box" w="max-w-md">
          <div className="space-y-3.5">
            <Field label="نام گروه" req>
              <input className="field" placeholder="مثلاً: دستگاه‌های CNC" value={gModal.name} onChange={(e) => setGModal({ ...gModal, name: e.target.value })} autoFocus />
            </Field>
            <Field label="تصویر گروه (اختیاری)">
              <div className="flex items-center gap-2.5">
                {gModal.image ? <img src={gModal.image} className="w-14 h-14 rounded-lg object-cover border border-line" alt="" /> : <span className="w-14 h-14 rounded-lg bg-paper border border-line flex items-center justify-center text-mist"><I name="image" size={20} /></span>}
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setGModal({ ...gModal, image: await compressImage(f, 600) }); }} />
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-bold border-[1.5px] border-line rounded-lg px-3 py-2 text-steel hover:border-acc hover:text-acc transition-all"><I name="camera" size={14} />آپلود تصویر</span>
                </label>
              </div>
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={() => setGModal(null)}>انصراف</Btn>
              <Btn disabled={!gModal.name.trim()} onClick={() => {
                saveGroup({ id: gModal.id ?? uid("g"), name: gModal.name.trim(), image: gModal.image, order: state.groups.length + 1 });
                addLog(gModal.id ? "ویرایش گروه تجهیز" : "افزودن گروه تجهیز", gModal.name);
                toast("گروه ذخیره شد");
                setGModal(null);
              }}><I name="check" size={15} />ذخیره گروه</Btn>
            </div>
          </div>
        </Modal>
      )}

      <Confirm open={!!del} onClose={() => setDel(null)} onYes={() => { if (del) { deleteEquipment(del.id); addLog("حذف تجهیز", `${del.name} (${del.code})`); toast("تجهیز و رکوردهای آن حذف شد"); } }}
        title="حذف تجهیز" body={`«${del?.name}» به‌همراه همه رکوردهای بازدیدش برای همیشه حذف شود؟ اگر می‌خواهید سوابق بماند، آن را غیرفعال کنید.`} />
      <Confirm open={!!delGroup} onClose={() => setDelGroup(null)} onYes={() => {
        if (!delGroup) return;
        if (state.equipment.some((e) => e.typeId === delGroup)) { toast("این گروه خالی نیست — ابتدا تجهیزاتش را منتقل یا حذف کنید", "error"); return; }
        const g = state.groups.find((x) => x.id === delGroup);
        deleteGroup(delGroup);
        addLog("حذف گروه تجهیز", g?.name ?? "");
        toast("گروه حذف شد");
      }} title="حذف گروه" body="گروه حذف شود؟ تنها گروه‌های بدون تجهیزات قابل حذف هستند." />

      <QrModal eq={qrEq} onClose={() => setQrEq(null)} />
    </div>
  );
}

/* ================= modal تجهیزات ================= */
function EquipModal({ initial, onClose, onSave }: { initial: Equipment | null; onClose: () => void; onSave: (e: Equipment) => void }) {
  const { state, toast } = useStore();
  const [f, setF] = useState<Omit<Equipment, "id">>(initial ?? { ...EMPTY, typeId: state.groups[0]?.id ?? "" });
  const [tried, setTried] = useState(false);
  const dup = state.equipment.some((e) => e.code.trim() && e.code.toUpperCase() === f.code.trim().toUpperCase() && e.id !== initial?.id);
  const err = {
    code: !f.code.trim() ? "کد تجهیز الزامی است" : dup ? "این کد قبلاً ثبت شده" : "",
    name: !f.name.trim() ? "نام تجهیز الزامی است" : "",
    type: !f.typeId ? "گروه تجهیز را انتخاب کنید" : "",
  };
  const hasErr = Object.values(err).some(Boolean);
  return (
    <Modal open onClose={onClose} title={initial ? "ویرایش تجهیز" : "ثبت تجهیز جدید"} icon="gear" w="max-w-xl">
      <div className="grid sm:grid-cols-2 gap-3.5">
        <Field label="کد تجهیز (QR)" req error={tried ? err.code : ""}>
          <input className={`field num-ltr font-bold ${tried && err.code ? "field-err" : ""}`} dir="ltr" placeholder="PRS-2500" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} />
        </Field>
        <Field label="نام تجهیز" req error={tried ? err.name : ""}>
          <input className={`field ${tried && err.name ? "field-err" : ""}`} placeholder="پرس هیدرولیک ۲۵۰۰ تن" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label="گروه تجهیز" req error={tried ? err.type : ""}>
          <select className="field" value={f.typeId} onChange={(e) => setF({ ...f, typeId: e.target.value })}>
            <option value="">انتخاب کنید…</option>
            {state.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </Field>
        <Field label="محل استقرار"><input className="field" placeholder="سالن شماره ۲" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field>
        <Field label="وضعیت">
          <select className="field" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as EquipmentStatus })}>
            {(Object.keys(EQ_STATUS) as EquipmentStatus[]).map((s) => <option key={s} value={s}>{EQ_STATUS[s].label}</option>)}
          </select>
        </Field>
        <Field label="تاریخ بهره‌برداری (شمسی)">
          <JalaliPicker value={f.commissionDate} onChange={(v) => setF({ ...f, commissionDate: v })} />
        </Field>
        <Field label="تصویر تجهیز" className="sm:col-span-2">
          <div className="flex items-center gap-3">
            {f.image ? <img src={f.image} className="w-16 h-16 rounded-lg object-cover border border-line" alt="" /> : <span className="w-16 h-16 rounded-lg bg-paper border border-line flex items-center justify-center text-mist"><I name="image" size={22} /></span>}
            <div className="flex flex-col gap-1.5">
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { setF({ ...f, image: await compressImage(file) }); toast("تصویر فشرده‌سازی و ذخیره شد"); } }} />
                <span className="inline-flex items-center gap-1.5 text-[12px] font-bold border-[1.5px] border-line rounded-lg px-3 py-1.5 text-steel hover:border-acc hover:text-acc transition-all"><I name="camera" size={13} />آپلود تصویر</span>
              </label>
              {f.image && <button className="text-[11px] font-bold text-nok text-right" onClick={() => setF({ ...f, image: undefined })}>حذف تصویر</button>}
            </div>
          </div>
        </Field>
        <div className="sm:col-span-2 flex items-center justify-between bg-paper border border-line rounded-lg px-3.5 py-2.5">
          <span className="text-[12.5px] font-bold text-steel flex items-center gap-1.5"><I name="zap" size={14} className={f.critical ? "text-nok" : "text-mist"} />تجهیز بحرانی (اولویت گزارش‌گیری)</span>
          <Toggle on={f.critical} onChange={(v) => setF({ ...f, critical: v })} />
        </div>
        <div className="sm:col-span-2 text-[11.5px] font-semibold text-mist bg-infobg rounded-lg px-3.5 py-2.5 flex items-center gap-2">
          <I name="qr" size={15} className="text-info shrink-0" />QR Code اختصاصی به‌صورت خودکار تولید می‌شود: <b dir="ltr" className="num-ltr text-info">NIPCO:{f.code.trim() || "…"}</b>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Btn variant="ghost" onClick={onClose}>انصراف</Btn>
        <Btn onClick={() => { setTried(true); if (hasErr) return; onSave({ ...f, id: initial?.id ?? uid("eq"), code: f.code.trim().toUpperCase(), qr: `NIPCO:${f.code.trim().toUpperCase()}`, name: f.name.trim() }); }}>
          <I name="check" size={15} />{initial ? "ذخیره تغییرات" : "ثبت تجهیز"}
        </Btn>
      </div>
    </Modal>
  );
}

import { JalaliDateInput } from "../components/ui";
function JalaliPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <JalaliDateInput value={value} onChange={onChange} />;
}

/* ================= QR modal ================= */
function QrModal({ eq, onClose }: { eq: Equipment | null; onClose: () => void }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (eq) QRCode.toDataURL(eq.qr, { width: 320, margin: 1, color: { dark: "#141d2b", light: "#ffffff" } }).then(setUrl).catch(() => setUrl(""));
  }, [eq]);
  if (!eq) return null;
  return (
    <Modal open onClose={onClose} title="QR Code تجهیز" icon="qr" w="max-w-sm">
      <div className="print-area text-center">
        <div className="hidden print:block mb-3">
          <h3 className="font-display text-lg">NIPCO — برچسب کنترل روزانه</h3>
        </div>
        <div className="inline-block border-[3px] border-navy rounded-xl p-4 bg-white">
          {url ? <img src={url} alt={eq.qr} className="w-56 h-56 mx-auto" /> : <div className="w-56 h-56 flex items-center justify-center text-mist"><I name="qr" size={40} /></div>}
          <p className="font-display text-lg text-ink mt-2">{eq.name}</p>
          <p className="text-[13px] font-bold text-steel num-ltr" dir="ltr">{eq.qr}</p>
        </div>
        <p className="text-[11.5px] text-mist font-semibold mt-3 leading-5">این برچسب را روی بدنه تجهیز نصب کنید. تکنسین‌ها با اسکن آن مستقیماً وارد فرم کنترل روزانه می‌شوند.</p>
        <div className="flex justify-center gap-2 mt-4 no-print">
          <Btn variant="outline" onClick={() => window.print()}><I name="printer" size={15} />چاپ برچسب</Btn>
          <Btn variant="dark" onClick={onClose}>بستن</Btn>
        </div>
      </div>
    </Modal>
  );
}
