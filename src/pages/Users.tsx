import { useState } from "react";
import type { Role, User } from "../types";
import { useStore } from "../store";
import { Btn, Confirm, Empty, Field, I, Modal, RoleBadge, ROLES, Toggle } from "../components/ui";
import { faNum, formatDateJ, hashPw, uid } from "../utils";

export function UsersPage() {
  const { state, user: me, session, saveUser, deleteUser, addLog, toast } = useStore();
  const [edit, setEdit] = useState<User | null | "new">(null);
  const [del, setDel] = useState<User | null>(null);
  const [q, setQ] = useState("");

  const list = state.users.filter((u) => !q.trim() || u.fullName.includes(q) || u.username.toLowerCase().includes(q.toLowerCase()) || u.personnelCode.includes(q));

  return (
    <div className="anim-fade-up">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <input className="field !py-2" placeholder="جستجوی نام، نام کاربری یا کد پرسنلی…" value={q} onChange={(e) => setQ(e.target.value)} />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mist"><I name="search" size={15} /></span>
        </div>
        <Btn className="mr-auto" onClick={() => setEdit("new")}><I name="plus" size={15} />کاربر جدید</Btn>
      </div>

      {/* legend */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4 stagger">
        {(Object.keys(ROLES) as Role[]).map((r) => (
          <div key={r} className="bg-card border border-line rounded-xl px-3.5 py-2.5 flex items-center justify-between">
            <RoleBadge role={r} />
            <span className="text-[11px] font-bold text-mist">{faNum(state.users.filter((u) => u.role === r).length)} نفر</span>
          </div>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="bg-card border border-line rounded-xl"><Empty icon="users" title="کاربری یافت نشد" /></div>
      ) : (
        <div className="bg-card border border-line rounded-xl overflow-hidden divide-y divide-line">
          {list.map((u) => {
            const isMe = u.id === session?.userId;
            return (
              <div key={u.id} className={`p-3.5 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-paper/40 transition-colors ${!u.active ? "opacity-55" : ""}`}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className={`w-11 h-11 rounded-xl font-display text-xl flex items-center justify-center shrink-0 ${u.active ? "bg-navy text-acc" : "bg-paper text-mist"}`}>{u.fullName[0]}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-[14px] text-ink">{u.fullName}{isMe && <span className="text-[9.5px] font-bold bg-accbg text-accd rounded px-1.5 py-0.5">شما</span>}</p>
                      <RoleBadge role={u.role} />
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] font-semibold text-mist">
                      <span>پرسنلی: <b className="num-ltr">{u.personnelCode}</b></span>
                      <span dir="ltr" className="num-ltr">@{u.username}</span>
                      <span dir="ltr" className="num-ltr">{u.mobile}</span>
                      <span>عضویت: {formatDateJ(u.createdAt)}</span>
                    </div>
                    {(u.formAccess.length > 0 || u.sectionAccess.length > 0) && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {u.formAccess.map((gid) => <span key={gid} className="text-[9.5px] font-bold bg-infobg text-info rounded px-1.5 py-0.5">فرم: {state.groups.find((g) => g.id === gid)?.name ?? gid}</span>)}
                        {u.sectionAccess.map((sid) => <span key={sid} className="text-[9.5px] font-bold bg-warnbg text-warn rounded px-1.5 py-0.5">بخش: {state.sections.find((s) => s.id === sid)?.name ?? sid}</span>)}
                        {u.canArchive && <span className="text-[9.5px] font-bold bg-okbg text-ok rounded px-1.5 py-0.5 flex items-center gap-0.5"><I name="archive" size={9} />بایگانی</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 sm:flex-col lg:flex-row">
                  <Toggle on={u.active} onChange={(v) => {
                    if (isMe && !v) { toast("نمی‌توانید حساب خود را غیرفعال کنید", "error"); return; }
                    saveUser({ ...u, active: v });
                    addLog(v ? "فعال‌سازی کاربر" : "غیرفعال‌سازی کاربر", u.fullName);
                    toast(v ? `${u.fullName} فعال شد` : `${u.fullName} غیرفعال شد`);
                  }} label={u.active ? "فعال" : "غیرفعال"} />
                  <div className="flex gap-1">
                    <button onClick={() => setEdit(u)} className="p-1.5 rounded-md border border-line text-steel hover:border-info hover:text-info hover:bg-infobg transition-all" title="ویرایش"><I name="pencil" size={14} /></button>
                    <button onClick={() => isMe ? toast("حذف حساب خودتان ممکن نیست", "error") : setDel(u)} className="p-1.5 rounded-md border border-line text-steel hover:border-nok hover:text-nok hover:bg-nokbg transition-all" title="حذف"><I name="trash" size={14} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {edit && <UserModal key={edit === "new" ? "new" : edit.id} initial={edit === "new" ? null : edit} onClose={() => setEdit(null)}
        onSave={(u) => { saveUser(u); addLog(edit === "new" ? "افزودن کاربر" : "ویرایش کاربر", `${u.fullName} (${ROLES[u.role]})`); toast(edit === "new" ? "کاربر جدید ایجاد شد" : "تغییرات کاربر ذخیره شد"); setEdit(null); }} />}

      <Confirm open={!!del} onClose={() => setDel(null)} onYes={() => { if (del) { deleteUser(del.id); addLog("حذف کاربر", del.fullName); toast("کاربر حذف شد — سوابق بازدیدها حفظ می‌ماند"); } }}
        title="حذف کاربر" body={`کاربر «${del?.fullName}» حذف شود؟ ورود او دیگر ممکن نخواهد بود.`} />
    </div>
  );
}

function UserModal({ initial, onClose, onSave }: { initial: User | null; onClose: () => void; onSave: (u: User) => void }) {
  const { state, session } = useStore();
  const [f, setF] = useState<User>(initial ?? { id: "", fullName: "", personnelCode: "", username: "", password: "", mobile: "", role: "technician", active: true, formAccess: [], sectionAccess: [], canArchive: false, createdAt: new Date().toISOString().slice(0, 10) });
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [tried, setTried] = useState(false);
  const dupUser = state.users.some((u) => u.username.toLowerCase() === f.username.trim().toLowerCase() && u.id !== initial?.id);
  const err = {
    fullName: !f.fullName.trim() ? "نام و نام خانوادگی الزامی است" : "",
    code: !f.personnelCode.trim() ? "کد پرسنلی الزامی است" : "",
    username: !f.username.trim() ? "نام کاربری الزامی است" : dupUser ? "این نام کاربری قبلاً ثبت شده" : "",
    pw: !initial && !pw ? "رمز عبور الزامی است" : pw && pw.length < 4 ? "رمز عبور حداقل ۴ کاراکتر" : "",
  };
  const hasErr = Object.values(err).some(Boolean);
  const chip = (on: boolean) => `text-[12px] font-bold rounded-lg px-3 py-1.5 border transition-all active:scale-95 ${on ? "bg-navy text-white border-navy" : "bg-card border-line text-steel hover:border-acc hover:text-acc"}`;

  return (
    <Modal open onClose={onClose} title={initial ? `ویرایش کاربر — ${initial.fullName}` : "ثبت کاربر جدید"} icon="users" w="max-w-2xl">
      <div className="grid sm:grid-cols-2 gap-3.5">
        <Field label="نام و نام خانوادگی" req error={tried ? err.fullName : ""}>
          <input className={`field ${tried && err.fullName ? "field-err" : ""}`} value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} autoFocus />
        </Field>
        <Field label="کد پرسنلی" req error={tried ? err.code : ""}>
          <input className={`field num-ltr ${tried && err.code ? "field-err" : ""}`} dir="ltr" value={f.personnelCode} onChange={(e) => setF({ ...f, personnelCode: e.target.value })} />
        </Field>
        <Field label="نام کاربری" req error={tried ? err.username : ""}>
          <input className={`field num-ltr ${tried && err.username ? "field-err" : ""}`} dir="ltr" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
        </Field>
        <Field label={initial ? "رمز عبور جدید (اختیاری)" : "رمز عبور"} req={!initial} error={tried ? err.pw : ""}>
          <div className="relative">
            <input className={`field num-ltr ${tried && err.pw ? "field-err" : ""}`} dir="ltr" type={showPw ? "text" : "password"} placeholder={initial ? "بدون تغییر" : "حداقل ۴ کاراکتر"} value={pw} onChange={(e) => setPw(e.target.value)} />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist hover:text-ink"><I name={showPw ? "eyeOff" : "eye"} size={15} /></button>
          </div>
        </Field>
        <Field label="شماره موبایل"><input className="field num-ltr" dir="ltr" placeholder="09xxxxxxxxx" value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value })} /></Field>
        <Field label="سطح دسترسی">
          <select className="field" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
            {(Object.keys(ROLES) as Role[]).map((r) => <option key={r} value={r}>{ROLES[r]}</option>)}
          </select>
        </Field>
      </div>

      {/* granular permissions */}
      <div className="mt-4 space-y-3">
        <div className="bg-infobg/50 border border-info/20 rounded-xl p-3.5">
          <p className="text-[12.5px] font-bold text-info flex items-center gap-1.5 mb-2"><I name="clipboard" size={14} />دسترسی به فرم‌های کنترل روزانه <span className="text-[10px] font-semibold text-steel">(خالی = همه فرم‌ها)</span></p>
          <div className="flex flex-wrap gap-1.5">
            {state.groups.map((g) => {
              const on = f.formAccess.includes(g.id);
              return <button key={g.id} type="button" className={chip(on)} onClick={() => setF({ ...f, formAccess: on ? f.formAccess.filter((x) => x !== g.id) : [...f.formAccess, g.id] })}>{g.name}</button>;
            })}
          </div>
          <p className="text-[10.5px] font-semibold text-steel mt-2 leading-5">مثال: تکنسین مکانیک فقط به فرم پرس‌ها و ربات‌ها دسترسی داشته باشد.</p>
        </div>
        <div className="bg-warnbg/50 border border-warn/25 rounded-xl p-3.5">
          <p className="text-[12.5px] font-bold text-warn flex items-center gap-1.5 mb-2"><I name="checklist" size={14} />دسترسی به بخش‌های داخل فرم <span className="text-[10px] font-semibold text-steel">(خالی = همه بخش‌ها)</span></p>
          <div className="flex flex-wrap gap-1.5">
            {state.sections.map((s) => {
              const on = f.sectionAccess.includes(s.id);
              return <button key={s.id} type="button" className={chip(on)} onClick={() => setF({ ...f, sectionAccess: on ? f.sectionAccess.filter((x) => x !== s.id) : [...f.sectionAccess, s.id] })}>بخش {s.name}</button>;
            })}
          </div>
          <p className="text-[10.5px] font-semibold text-steel mt-2 leading-5">مثال: گروه برق فقط بخش «برق» فرم‌ها را انجام دهند.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex-1 flex items-center justify-between bg-paper border border-line rounded-xl px-3.5 py-2.5">
            <span className="text-[12px] font-bold text-steel flex items-center gap-1.5"><I name="archive" size={14} className="text-mist" />دسترسی به بایگانی سال‌های قبل</span>
            <Toggle on={f.canArchive} onChange={(v) => setF({ ...f, canArchive: v })} />
          </div>
          <div className="flex-1 flex items-center justify-between bg-paper border border-line rounded-xl px-3.5 py-2.5">
            <span className="text-[12px] font-bold text-steel flex items-center gap-1.5"><I name="power" size={14} className="text-mist" />حساب فعال</span>
            <Toggle on={f.id === session?.userId ? true : f.active} onChange={(v) => { if (f.id === session?.userId) return; setF({ ...f, active: v }); }} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-5">
        <Btn variant="ghost" onClick={onClose}>انصراف</Btn>
        <Btn onClick={() => {
          setTried(true);
          if (hasErr) return;
          onSave({
            ...f, id: f.id || uid("u"), fullName: f.fullName.trim(), username: f.username.trim(),
            password: pw ? hashPw(pw) : initial?.password ?? "",
          });
        }}><I name="check" size={15} />{initial ? "ذخیره تغییرات" : "ایجاد کاربر"}</Btn>
      </div>
    </Modal>
  );
}
