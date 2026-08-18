import type { AppState, ChecklistItem, ChecklistSection, Equipment, EquipmentGroup, InspectionRecord, RecordItem, User } from "./types";
import { hashPw, mulberry32, toJalaali, uid } from "./utils";
import type { Shift } from "./utils";

const IMG = {
  press: "https://image.qwenlm.ai/generated-images/a7b9b6c4-de4a-4aac-9ded-00bd009886a8/_result.png",
  robot: "https://image.qwenlm.ai/generated-images/1e7454d6-bcab-4332-972f-384fd7bbbd55/_result.png",
  compressor: "https://image.qwenlm.ai/generated-images/8c5a0fa5-cf43-4a8f-aa32-807af6ee724f/_result.png",
  forklift: "https://image.qwenlm.ai/generated-images/011ac2cc-a44c-4dbf-9765-23919e641fbe/_result.png",
  boiler: "https://image.qwenlm.ai/generated-images/0c5a58a2-1e45-4b30-b53f-cbf87f963a08/_result.png",
};

const users: User[] = [
  { id: "u-admin", fullName: "محمد روشندل", personnelCode: "1001", username: "m.roshandel", password: hashPw("admin123"), mobile: "09121234567", role: "admin", active: true, formAccess: [], sectionAccess: [], canArchive: true, createdAt: "2025-03-21" },
  { id: "u-takhti", fullName: "جعفر تختی", personnelCode: "2105", username: "j.takhti", password: hashPw("takhti123"), mobile: "09131234567", role: "supervisor", active: true, formAccess: [], sectionAccess: [], canArchive: true, createdAt: "2025-03-21" },
  { id: "u-esfandiari", fullName: "رضا اسفندیاری", personnelCode: "3042", username: "esfandiari", password: hashPw("esf123"), mobile: "09135551212", role: "technician", active: true, formAccess: [], sectionAccess: ["sec-elec"], canArchive: false, createdAt: "2025-03-21" },
  { id: "u-azamian", fullName: "فردین عظمیان", personnelCode: "3117", username: "f.azamian", password: hashPw("azamian123"), mobile: "09137774545", role: "technician", active: true, formAccess: ["g-press", "g-robot"], sectionAccess: [], canArchive: false, createdAt: "2025-03-21" },
  { id: "u-karimi", fullName: "حمید کریمی", personnelCode: "3258", username: "h.karimi", password: hashPw("karimi123"), mobile: "09138889090", role: "technician", active: true, formAccess: ["g-compressor", "g-forklift", "g-motor"], sectionAccess: [], canArchive: false, createdAt: "2025-04-02" },
  { id: "u-viewer", fullName: "کاربر مهمان", personnelCode: "9001", username: "viewer", password: hashPw("viewer123"), mobile: "09120000000", role: "viewer", active: true, formAccess: [], sectionAccess: [], canArchive: false, createdAt: "2025-05-10" },
];

const groups: EquipmentGroup[] = [
  { id: "g-press", name: "پرس‌های هیدرولیک", image: IMG.press, order: 1 },
  { id: "g-robot", name: "ربات‌های ABB", image: IMG.robot, order: 2 },
  { id: "g-compressor", name: "کمپرسورهای اسکرو", image: IMG.compressor, order: 3 },
  { id: "g-forklift", name: "لیفتراک‌های سپاهان", image: IMG.forklift, order: 4 },
  { id: "g-motor", name: "موتورخانه", image: IMG.boiler, order: 5 },
];

const mk = (id: string, code: string, name: string, typeId: string, location: string, status: Equipment["status"], commissionDate: string, critical = false): Equipment => ({
  id, code, name, typeId, location, status, qr: `NIPCO:${code}`, image: groups.find((g) => g.id === typeId)?.image, commissionDate, critical,
});

const equipment: Equipment[] = [
  mk("eq-p1", "PRS-1000", "پرس هیدرولیک ۱۰۰۰ تن", "g-press", "سالن پرس‌کاری", "active", "2019-04-12"),
  mk("eq-p2", "PRS-1200", "پرس هیدرولیک ۱۲۰۰ تن", "g-press", "سالن پرس‌کاری", "active", "2019-09-03"),
  mk("eq-p3", "PRS-1500", "پرس هیدرولیک ۱۵۰۰ تن", "g-press", "سالن پرس‌کاری", "repair", "2020-02-18", true),
  mk("eq-p4", "PRS-2000", "پرس هیدرولیک ۲۰۰۰ تن", "g-press", "سالن پرس‌کاری", "active", "2021-06-25", true),
  mk("eq-p5", "PRS-1200B", "پرس هیدرولیک ۱۲۰۰ تن عابدی", "g-press", "سالن پرس‌کاری", "active", "2018-11-30"),
  mk("eq-p6", "PRS-06", "پرس شماره ۶", "g-press", "سالن پرس‌کاری", "active", "2017-05-14"),
  ...["01", "02", "03", "04", "05", "06", "07"].map((n, i) =>
    mk(`eq-r${i + 1}`, `ABB-${n}`, `ربات ABB-${n}`, "g-robot", "خط جوشکاری رباتیک", i === 2 ? "repair" : "active", `2020-${String((i % 12) + 1).padStart(2, "0")}-10`, i === 0)),
  mk("eq-c1", "CMP-01", "کمپرسور اسکرو شماره ۱", "g-compressor", "کمپرسورخانه", "active", "2020-08-19", true),
  mk("eq-c2", "CMP-02", "کمپرسور اسکرو شماره ۲", "g-compressor", "کمپرسورخانه", "inactive", "2020-08-19"),
  mk("eq-c3", "CMP-03", "کمپرسور اسکرو شماره ۳", "g-compressor", "کمپرسورخانه", "active", "2021-03-08"),
  mk("eq-c4", "CMP-04", "کمپرسور اسکرو شماره ۴", "g-compressor", "کمپرسورخانه", "active", "2022-01-11"),
  ...["01", "02", "03", "04", "05"].map((n, i) =>
    mk(`eq-f${i + 1}`, `FLT-${n}`, `لیفتراک سپاهان FLT-${n}`, "g-forklift", "انبار و محوطه", i === 2 ? "out" : "active", `2019-${String((i % 12) + 1).padStart(2, "0")}-22`)),
  mk("eq-b1", "BLR-01", "دیگ بخار شماره ۱", "g-motor", "موتورخانه", "active", "2016-10-05", true),
  mk("eq-b2", "BLR-02", "دیگ بخار شماره ۲", "g-motor", "موتورخانه", "active", "2016-10-05"),
  mk("eq-b3", "PMP-01", "پمپ سیرکولاتور شماره ۱", "g-motor", "موتورخانه", "active", "2018-07-16"),
  mk("eq-b4", "PMP-02", "پمپ سیرکولاتور شماره ۲", "g-motor", "موتورخانه", "active", "2018-07-16"),
  mk("eq-b5", "ELB-01", "تابلو برق موتورخانه", "g-motor", "موتورخانه", "active", "2016-10-05"),
  mk("eq-b6", "AIR-01", "سیستم هوای فشرده موتورخانه", "g-motor", "موتورخانه", "active", "2019-02-20"),
  mk("eq-b7", "AUX-01", "تجهیزات جانبی موتورخانه", "g-motor", "موتورخانه", "inactive", "2016-10-05"),
];

const sections: ChecklistSection[] = [
  { id: "sec-gen", name: "عمومی", active: true },
  { id: "sec-mech", name: "مکانیک", active: true },
  { id: "sec-hyd", name: "هیدرولیک", active: true },
  { id: "sec-elec", name: "برق", active: true },
  { id: "sec-saf", name: "ایمنی و حفاظت", active: true },
];

const it = (id: string, title: string, sectionId: string, g: string, type: "boolean" | "numeric" = "boolean", unit?: string, min?: number, max?: number): ChecklistItem => ({
  id, title, sectionId, type, unit, min, max, active: true, equipmentTypeIds: [g],
});

const items: ChecklistItem[] = [
  it("it-p1", "بررسی سطح روغن هیدرولیک", "sec-hyd", "g-press"),
  it("it-p2", "بررسی نشتی روغن از اتصالات و شلنگ‌ها", "sec-hyd", "g-press"),
  it("it-p3", "فشار سیستم هیدرولیک", "sec-hyd", "g-press", "numeric", "bar", 180, 220),
  it("it-p4", "دمای روغن هیدرولیک", "sec-hyd", "g-press", "numeric", "°C", 30, 60),
  it("it-p5", "صدای غیرعادی و لرزش بدنه", "sec-mech", "g-press"),
  it("it-p6", "عملکرد سنسورها و لیمیت سوییچ‌ها", "sec-elec", "g-press"),
  it("it-p7", "جریان موتور اصلی", "sec-elec", "g-press", "numeric", "A", 20, 95),
  it("it-p8", "سلامت کنترل دو دستی و حفاظ‌ها", "sec-saf", "g-press"),
  it("it-r1", "بررسی آلارم‌های پنل کنترل", "sec-elec", "g-robot"),
  it("it-r2", "وضعیت کابل‌ها و دسته‌سیم‌ها", "sec-elec", "g-robot"),
  it("it-r3", "گریس‌کاری محورها و گیربکس", "sec-mech", "g-robot"),
  it("it-r4", "وضعیت سرووموتورها و درایوها", "sec-elec", "g-robot"),
  it("it-r5", "دمای کنترلر", "sec-elec", "g-robot", "numeric", "°C", 20, 55),
  it("it-r6", "عملکرد دکمه توقف اضطراری", "sec-saf", "g-robot"),
  it("it-c1", "سطح روغن کمپرسور", "sec-mech", "g-compressor"),
  it("it-c2", "فشار خروجی", "sec-hyd", "g-compressor", "numeric", "bar", 7, 9.5),
  it("it-c3", "دمای کاری", "sec-mech", "g-compressor", "numeric", "°C", 65, 95),
  it("it-c4", "نشتی هوا از اتصالات", "sec-hyd", "g-compressor"),
  it("it-c5", "وضعیت فیلترهای هوا و روغن", "sec-mech", "g-compressor"),
  it("it-c6", "تخلیه درین و میعانات", "sec-mech", "g-compressor"),
  it("it-f1", "آب رادیاتور", "sec-mech", "g-forklift"),
  it("it-f2", "روغن موتور", "sec-mech", "g-forklift"),
  it("it-f3", "روغن هیدرولیک", "sec-hyd", "g-forklift"),
  it("it-f4", "وضعیت لاستیک‌ها و چرخ‌ها", "sec-mech", "g-forklift"),
  it("it-f5", "چراغ‌ها و علائم هشدار", "sec-elec", "g-forklift"),
  it("it-f6", "بوق و آژیر دنده عقب", "sec-elec", "g-forklift"),
  it("it-f7", "ترمز و هیدرولیک شاخک‌ها", "sec-saf", "g-forklift"),
  it("it-b1", "فشار مدار دیگ", "sec-hyd", "g-motor", "numeric", "bar", 1.5, 3),
  it("it-b2", "دمای سیستم", "sec-hyd", "g-motor", "numeric", "°C", 60, 90),
  it("it-b3", "نشتی لوله‌ها و اتصالات", "sec-hyd", "g-motor"),
  it("it-b4", "وضعیت پمپ‌های سیرکولاتور", "sec-mech", "g-motor"),
  it("it-b5", "وضعیت تابلو برق و تغذیه", "sec-elec", "g-motor"),
  it("it-b6", "شیر اطمینان و تهویه", "sec-saf", "g-motor"),
];

const NOK_NOTES = [
  "نشتی روغن در ناحیه اتصالات مشاهده شد",
  "صدای غیرعادی هنگام کار به گوش می‌رسد",
  "مقدار ثبت‌شده خارج از محدوده مجاز است",
  "ساییدگی و فرسودگی قطعه مشاهده شد",
  "سنسور خطا گزارش می‌کند و نیاز به کالیبراسیون دارد",
  "نیاز به اقدام اصلاحی و ثبت درخواست تعمیر",
];

const pad = (n: number) => String(n).padStart(2, "0");
const gISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function buildRecords(): InspectionRecord[] {
  const rnd = mulberry32(14040315);
  const out: InspectionRecord[] = [];
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const techByGroup: Record<string, string> = {
    "g-press": "u-azamian", "g-robot": "u-azamian",
    "g-compressor": "u-karimi", "g-forklift": "u-karimi", "g-motor": "u-karimi",
  };
  const active = equipment.filter((e) => e.status === "active");
  const nowH = new Date().getHours();

  const makeRecord = (eq: Equipment, date: Date, d: number) => {
    const elecOnly = rnd() < 0.16;
    const tech = elecOnly ? "u-esfandiari" : techByGroup[eq.typeId];
    const pool = items.filter((x) => x.active && x.equipmentTypeIds.includes(eq.typeId) && (!elecOnly || x.sectionId === "sec-elec"));
    if (!pool.length) return;
    const shift: Shift = d === 0 ? (nowH >= 14 ? 2 : 1) : ((1 + Math.floor(rnd() * 3)) as Shift);
    const hour = d === 0
      ? (shift === 1 ? 6 + Math.floor(rnd() * Math.max(1, Math.min(nowH, 13) - 5)) : 14 + Math.floor(rnd() * Math.max(1, Math.min(nowH, 21) - 13)))
      : shift === 1 ? 6 + Math.floor(rnd() * 8) : shift === 2 ? 14 + Math.floor(rnd() * 8) : 22 + Math.floor(rnd() * 4);
    const h = hour % 24;
    const time = `${pad(h)}:${pad(Math.floor(rnd() * 60))}`;
    const nokP = d === 0 ? 0.13 : d < 7 ? 0.07 : 0.05;
    const recItems: RecordItem[] = pool.map((x) => {
      const nok = rnd() < nokP;
      if (x.type === "numeric") {
        const min = x.min!, max = x.max!, span = max - min;
        const v = nok ? (rnd() < 0.5 ? max + span * 0.3 * rnd() : min - span * 0.3 * rnd()) : min + span * (0.12 + 0.72 * rnd());
        return { itemId: x.id, result: nok ? "nok" : "ok", value: Math.round(v * 10) / 10, note: nok ? pick(NOK_NOTES) : "", attachments: [] };
      }
      return { itemId: x.id, result: nok ? "nok" : "ok", note: nok ? pick(NOK_NOTES) : "", attachments: [] };
    });
    const j = toJalaali(date);
    out.push({
      id: uid("rec"), equipmentId: eq.id, technicianId: tech, date: gISO(date), time, shift,
      location: eq.location, items: recItems, jalaliYear: j.jy, createdAt: `${gISO(date)}T${time}:00`,
    });
  };

  for (let d = 34; d >= 0; d--) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - d);
    const isFriday = date.getDay() === 5;
    for (const eq of active) {
      let skip = rnd() < (isFriday ? 0.55 : 0.13);
      if (d === 0 && rnd() < 0.42) skip = true;
      if (skip) continue;
      makeRecord(eq, date, d);
    }
  }
  // رکوردهای سال قبل برای بایگانی
  for (let d = 340; d >= 300; d -= 2) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - d);
    for (const eq of active) {
      if (rnd() < 0.55) continue;
      makeRecord(eq, date, 30);
    }
  }
  return out;
}

export function buildSeed(): AppState {
  const records = buildRecords();
  const today = gISO(new Date());
  const yesterdayD = new Date();
  yesterdayD.setDate(yesterdayD.getDate() - 1);
  const yesterday = gISO(yesterdayD);
  return {
    users, groups, equipment, sections, items, records,
    notifications: [
      { id: uid("ntf"), type: "danger", title: "مورد معیوب در پرس ۲۰۰۰ تن", body: "فردین عظمیان مورد NOK در بازدید پرس هیدرولیک ۲۰۰۰ تن ثبت کرد. اقدام اصلاحی الزامی است.", channels: ["app", "sms", "email"], read: false, createdAt: `${today}T08:42:00` },
      { id: uid("ntf"), type: "warning", title: "بازدید معوق ربات ABB-03", body: "بازدید روزانه ربات ABB-03 در شیفت ۱ انجام نشده است. یادآوری به سرپرست نت ارسال شد.", channels: ["app", "sms"], read: false, createdAt: `${today}T07:15:00` },
      { id: uid("ntf"), type: "info", title: "تعمیرات برنامه‌ریزی‌شده", body: "PRS-1500 تا پایان هفته در وضعیت تعمیر قرار دارد. بازدید روزانه برای آن غیرفعال است.", channels: ["app"], read: true, createdAt: `${yesterday}T14:20:00` },
      { id: uid("ntf"), type: "success", title: "پشتیبان‌گیری خودکار", body: "پشتیبان‌گیری خودکار از پایگاه داده با موفقیت انجام شد.", channels: ["app", "email"], read: true, createdAt: `${yesterday}T02:00:00` },
    ],
    logs: [
      { id: uid("log"), userId: "u-takhti", userName: "جعفر تختی", action: "ورود به سیستم", detail: "احراز هویت موفق", at: `${today}T06:05:00` },
      { id: uid("log"), userId: "u-azamian", userName: "فردین عظمیان", action: "ثبت بازدید", detail: "کنترل روزانه پرس هیدرولیک ۲۰۰۰ تن — شیفت ۱", at: `${today}T08:42:00` },
      { id: uid("log"), userId: "u-admin", userName: "محمد روشندل", action: "ویرایش چک‌لیست", detail: "افزودن آیتم «دمای کنترلر» به ربات‌های ABB", at: `${yesterday}T11:30:00` },
      { id: uid("log"), userId: "u-admin", userName: "محمد روشندل", action: "مدیریت کاربران", detail: "تغییر سطح دسترسی حمید کریمی به تکنسین نت", at: `${yesterday}T10:12:00` },
      { id: uid("log"), userId: "u-takhti", userName: "جعفر تختی", action: "خروج از سیستم", detail: "پایان نشست کاربری", at: `${yesterday}T14:02:00` },
    ],
    lastBackup: `${yesterday}T02:00:00`,
  };
}
