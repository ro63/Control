import { useMemo, useState } from "react";
import type { ChecklistItem } from "../types";
import { useStore } from "../store";
import { Btn, Confirm, Empty, Field, I, Modal, Toggle } from "../components/ui";
import { faNum, uid } from "../utils";

export function ChecklistsPage() {
  const { state, can, saveSection, saveItem, deleteItem, addLog, toast } = useStore();
  const manage = can("checklists.manage");
  const [fGroup, setFGroup] = useState("");
  const [fSec, setFSec] = useState("");
  const [fAct, setFAct] = useState("");
  const [edit, setEdit] = useState<ChecklistItem | null | "new">(null);
  const [del, setDel] = useState<ChecklistItem | null>(null);
  const [secModal, setSecModal] = useState<{ id?: string; name: string } | null>(null);

  const items = useMemo(() => {
    let l = state.items;
    if (fGroup) l = l.filter((i) => i.equipmentTypeIds.includes(fGroup));
    if (fSec) l = l.filter((i) => i.sectionId === fSec);
    if (fAct) l = l.filter((i) => (fAct === "1" ? i.active : !i.active));
    return l;
  }, [state.items, fGroup, fSec, fAct]);

  const sel = "field !py-1.5 !text-[12.5px] !w-auto";

  return (
    <div className="anim-fade-up grid lg:grid-cols-4 gap-4">
      {/* ---------- sections ---------- */}
      <div className="lg:col-span-1">
        <div className="bg-card border border-line rounded-xl overflow-hidden sticky top-20">
          <div className="px-4 py-3 border-b border-line bg-paper/60 flex items-center justify-between">
            <h3 className="font-display text-base text-ink">بخش‌های فرم</h3>
            {manage && <button onClick={() => setSecModal({ name: "" })} className="text-acc hover:text-accd" title="بخش جدید"><I name="plus" size={16} /></button>}
          </div>
          <div className="divide-y divide-line">
            {state.sections.map((s) => {
              const n = state.items.filter((i) => i.sectionId === s.id).length;
              return (
                <div key={s.id} className={`px-4 py-2.5 flex items-center gap-2 ${!s.active ? "opacity-50" : ""}`}>
                  <span className="w-1.5 h-6 rounded-full bg-acc" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-ink truncate">بخش {s.name}</p>
                    <p className="text-[10.5px] text-mist font-semibold">{faNum(n)} آیتم</p>
                  </div>
                  {manage ? (
                    <>
                      <button onClick={() => setSecModal({ id: s.id, name: s.name })} className="p-1 text-mist hover:text-info" title="تغییر نام"><I name="pencil" size={13} /></button>
                      <Toggle on={s.active} onChange={(v) => { saveSection({ ...s, active: v }); toast(v ? "بخش فعال شد" : "بخش غیرفعال شد — از فرم‌ها حذف می‌شود"); }} />
                    </>
                  ) : (
                    <span className={`text-[10px] font-bold rounded-md px-1.5 py-0.5 ${s.active ? "bg-okbg text-ok" : "bg-paper text-mist"}`}>{s.active ? "فعال" : "غیرفعال"}</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="p-3.5 bg-infobg/60 border-t border-line text-[11px] font-semibold text-steel leading-5">
            <p className="flex items-center gap-1 font-bold text-info mb-1"><I name="shield" size={12} />دسترسی بخشی</p>
            برای هر کاربر در صفحه «کاربران» تعیین کنید فقط به بخش‌های خاصی (مثلاً برق) دسترسی داشته باشد.
          </div>
        </div>
      </div>

      {/* ---------- items ---------- */}
      <div className="lg:col-span-3">
        <div className="bg-card border border-line rounded-xl p-3.5 mb-4 flex flex-wrap items-center gap-2">
          <span className="text-[11.5px] font-bold text-mist flex items-center gap-1"><I name="filter" size={13} />فیلتر:</span>
          <select className={sel} value={fGroup} onChange={(e) => setFGroup(e.target.value)}>
            <option value="">همه گروه‌های تجهیز</option>
            {state.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select className={sel} value={fSec} onChange={(e) => setFSec(e.target.value)}>
            <option value="">همه بخش‌ها</option>
            {state.sections.map((s) => <option key={s.id} value={s.id}>بخش {s.name}</option>)}
          </select>
          <select className={sel} value={fAct} onChange={(e) => setFAct(e.target.value)}>
            <option value="">فعال و غیرفعال</option>
            <option value="1">فقط فعال</option>
            <option value="0">فقط غیرفعال</option>
          </select>
          <span className="text-[11.5px] font-bold text-mist mr-auto">{faNum(items.length)} آیتم</span>
          {manage && <Btn size="sm" onClick={() => setEdit("new")}><I name="plus" size={14} />آیتم جدید</Btn>}
        </div>

        {items.length === 0 ? (
          <div className="bg-card border border-line rounded-xl"><Empty icon="checklist" title="آیتمی یافت نشد" sub="آیتم جدیدی تعریف کنید یا فیلترها را تغییر دهید." action={manage ? <Btn onClick={() => setEdit("new")}><I name="plus" size={15} />افزودن آیتم</Btn> : undefined} /></div>
        ) : (
          <div className="bg-card border border-line rounded-xl divide-y divide-line overflow-hidden">
            {items.map((i) => {
              const sec = state.sections.find((s) => s.id === i.sectionId);
              return (
                <div key={i.id} className={`p-3.5 flex flex-col sm:flex-row sm:items-center gap-2.5 hover:bg-paper/40 transition-colors ${!i.active ? "opacity-55" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13.5px] font-bold text-ink">{i.title}</p>
                      {i.type === "numeric"
                        ? <span className="text-[10px] font-bold bg-infobg text-info rounded-md px-1.5 py-0.5 num-ltr" dir="ltr">عددی {i.unit ? `(${i.unit})` : ""} {i.min !== undefined && i.max !== undefined ? `${faNum(i.min)}–${faNum(i.max)}` : ""}</span>
                        : <span className="text-[10px] font-bold bg-okbg text-ok rounded-md px-1.5 py-0.5">دوحالته OK / NOK</span>}
                      <span className="text-[10px] font-bold bg-paper border border-line text-steel rounded-md px-1.5 py-0.5">بخش {sec?.name ?? "—"}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {i.equipmentTypeIds.map((gid) => {
                        const g = state.groups.find((x) => x.id === gid);
                        return g ? <span key={gid} className="text-[10px] font-bold bg-navy text-white/85 rounded px-1.5 py-0.5">{g.name}</span> : null;
                      })}
                    </div>
                  </div>
                  {manage && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setEdit(i)} className="p-1.5 rounded-md border border-line text-steel hover:border-info hover:text-info hover:bg-infobg transition-all" title="ویرایش"><I name="pencil" size={14} /></button>
                      <button onClick={() => setDel(i)} className="p-1.5 rounded-md border border-line text-steel hover:border-nok hover:text-nok hover:bg-nokbg transition-all" title="حذف"><I name="trash" size={14} /></button>
                      <Toggle on={i.active} onChange={(v) => { saveItem({ ...i, active: v }); toast(v ? "آیتم فعال شد" : "آیتم غیرفعال شد"); }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {edit && <ItemModal key={edit === "new" ? "new" : edit.id} initial={edit === "new" ? null : edit} onClose={() => setEdit(null)}
        onSave={(i) => { saveItem(i); addLog(edit === "new" ? "افزودن آیتم چک‌لیست" : "ویرایش آیتم چک‌لیست", i.title); toast("آیتم ذخیره شد"); setEdit(null); }} />}

      <Confirm open={!!del} onClose={() => setDel(null)} onYes={() => { if (del) { deleteItem(del.id); addLog("حذف آیتم چک‌لیست", del.title); toast("آیتم حذف شد"); } }}
        title="حذف آیتم" body={`آیتم «${del?.title}» حذف شود؟ سوابق ثبت‌شده قبلی حفظ می‌مانند.`} />

      {secModal && (
        <Modal open onClose={() => setSecModal(null)} title={secModal.id ? "تغییر نام بخش" : "بخش جدید فرم"} icon="checklist" w="max-w-sm">
          <Field label="نام بخش" req>
            <input className="field" placeholder="مثلاً: پنوماتیک" value={secModal.name} onChange={(e) => setSecModal({ ...secModal, name: e.target.value })} autoFocus />
          </Field>
          <div className="flex justify-end gap-2 mt-4">
            <Btn variant="ghost" onClick={() => setSecModal(null)}>انصراف</Btn>
            <Btn disabled={!secModal.name.trim()} onClick={() => {
              saveSection({ id: secModal.id ?? uid("sec"), name: secModal.name.trim(), active: true });
              addLog(secModal.id ? "ویرایش بخش فرم" : "افزودن بخش فرم", secModal.name);
              toast("بخش ذخیره شد"); setSecModal(null);
            }}><I name="check" size={15} />ذخیره</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ================= item modal ================= */
function ItemModal({ initial, onClose, onSave }: { initial: ChecklistItem | null; onClose: () => void; onSave: (i: ChecklistItem) => void }) {
  const { state } = useStore();
  const [f, setF] = useState<ChecklistItem>(initial ?? { id: "", title: "", sectionId: state.sections[0]?.id ?? "", type: "boolean", unit: "", active: true, equipmentTypeIds: [] });
  const [tried, setTried] = useState(false);
  const err = {
    title: !f.title.trim() ? "عنوان آیتم الزامی است" : "",
    groups: f.equipmentTypeIds.length === 0 ? "حداقل یک گروه تجهیز انتخاب کنید" : "",
    range: f.type === "numeric" && (f.min === undefined || f.max === undefined || f.min >= f.max) ? "محدوده مجاز را صحیح وارد کنید (حداقل < حداکثر)" : "",
  };
  const hasErr = Object.values(err).some(Boolean);
  return (
    <Modal open onClose={onClose} title={initial ? "ویرایش آیتم چک‌لیست" : "آیتم جدید چک‌لیست"} icon="checklist" w="max-w-xl">
      <div className="space-y-3.5">
        <Field label="عنوان آیتم" req error={tried ? err.title : ""}>
          <input className={`field ${tried && err.title ? "field-err" : ""}`} placeholder="بررسی فشار سیستم هیدرولیک" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus />
        </Field>
        <div className="grid sm:grid-cols-2 gap-3.5">
          <Field label="بخش فرم">
            <select className="field" value={f.sectionId} onChange={(e) => setF({ ...f, sectionId: e.target.value })}>
              {state.sections.map((s) => <option key={s.id} value={s.id}>بخش {s.name}</option>)}
            </select>
          </Field>
          <Field label="نوع ارزیابی">
            <select className="field" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as "boolean" | "numeric" })}>
              <option value="boolean">دوحالته — OK / NOK</option>
              <option value="numeric">عددی — ورود مقدار (فشار، دما و …)</option>
            </select>
          </Field>
        </div>
        {f.type === "numeric" && (
          <div className="grid grid-cols-3 gap-3.5 bg-infobg/50 border border-info/20 rounded-lg p-3 anim-fade-up">
            <Field label="واحد اندازه‌گیری"><input className="field" dir="ltr" placeholder="bar / °C / A" value={f.unit ?? ""} onChange={(e) => setF({ ...f, unit: e.target.value })} /></Field>
            <Field label="حداقل مجاز"><input className="field num-ltr" dir="ltr" type="number" step="0.1" value={f.min ?? ""} onChange={(e) => setF({ ...f, min: e.target.value === "" ? undefined : +e.target.value })} /></Field>
            <Field label="حداکثر مجاز"><input className="field num-ltr" dir="ltr" type="number" step="0.1" value={f.max ?? ""} onChange={(e) => setF({ ...f, max: e.target.value === "" ? undefined : +e.target.value })} /></Field>
            {tried && err.range && <p className="col-span-3 text-[11px] text-nok font-bold -mt-1 flex items-center gap-1"><I name="alert" size={11} />{err.range}</p>}
            <p className="col-span-3 text-[10.5px] font-semibold text-info -mt-1">خارج از محدوده = ثبت خودکار NOK و الزام توضیح</p>
          </div>
        )}
        <Field label="اختصاص به گروه‌های تجهیز" req error={tried ? err.groups : ""}>
          <div className="flex flex-wrap gap-1.5">
            {state.groups.map((g) => {
              const on = f.equipmentTypeIds.includes(g.id);
              return (
                <button key={g.id} type="button" onClick={() => setF({ ...f, equipmentTypeIds: on ? f.equipmentTypeIds.filter((x) => x !== g.id) : [...f.equipmentTypeIds, g.id] })}
                  className={`text-[12px] font-bold rounded-lg px-3 py-1.5 border transition-all active:scale-95 ${on ? "bg-navy text-white border-navy" : "bg-card border-line text-steel hover:border-acc hover:text-acc"}`}>
                  {g.name}
                </button>
              );
            })}
          </div>
        </Field>
        <div className="flex items-center justify-between bg-paper border border-line rounded-lg px-3.5 py-2.5">
          <span className="text-[12.5px] font-bold text-steel">آیتم فعال (در فرم نمایش داده شود)</span>
          <Toggle on={f.active} onChange={(v) => setF({ ...f, active: v })} />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Btn variant="ghost" onClick={onClose}>انصراف</Btn>
        <Btn onClick={() => { setTried(true); if (hasErr) return; onSave({ ...f, id: f.id || uid("it"), title: f.title.trim() }); }}><I name="check" size={15} />ذخیره آیتم</Btn>
      </div>
    </Modal>
  );
}
