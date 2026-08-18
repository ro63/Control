export type Role = "admin" | "supervisor" | "technician" | "viewer";

export type EquipmentStatus = "active" | "inactive" | "repair" | "out";

export type ItemType = "boolean" | "numeric";

export type ItemResult = "ok" | "nok";

export interface User {
  id: string;
  fullName: string;
  personnelCode: string;
  username: string;
  password: string; // hashed
  mobile: string;
  role: Role;
  active: boolean;
  /** دسترسی به فرم‌های کنترل روزانه کدام گروه‌های تجهیز (خالی = همه) */
  formAccess: string[];
  /** دسترسی به کدام بخش‌های چک‌لیست (خالی = همه) */
  sectionAccess: string[];
  /** دسترسی به بایگانی سال‌های قبل */
  canArchive: boolean;
  createdAt: string;
}

export interface EquipmentGroup {
  id: string;
  name: string;
  image?: string;
  order: number;
}

export interface Equipment {
  id: string;
  code: string;
  name: string;
  typeId: string; // group id
  location: string;
  status: EquipmentStatus;
  qr: string;
  image?: string;
  commissionDate: string; // ISO
  critical: boolean;
}

export interface ChecklistSection {
  id: string;
  name: string;
  active: boolean;
}

export interface ChecklistItem {
  id: string;
  title: string;
  sectionId: string;
  type: ItemType;
  unit?: string;
  min?: number;
  max?: number;
  active: boolean;
  equipmentTypeIds: string[]; // گروه‌های تجهیز مرتبط
  /** فقط برای این تجهیزات خاص (خالی = همه تجهیزات گروه) */
  onlyEquipmentIds: string[];
  /** این تجهیزات استثنا شوند (مثلاً مدل متفاوت) */
  excludeEquipmentIds: string[];
}

export interface RecordItem {
  itemId: string;
  result: ItemResult;
  value?: number;
  note: string;
  attachments: { kind: "image" | "video" | "audio"; url: string; name: string }[];
}

export interface InspectionRecord {
  id: string;
  equipmentId: string;
  technicianId: string;
  date: string; // ISO date
  time: string; // HH:MM
  shift: 1 | 2 | 3;
  location: string;
  items: RecordItem[];
  yearId: string; // سال مالی ثبت
  createdAt: string;
}

export interface FiscalYear {
  id: string;
  year: number; // سال شمسی
  status: "open" | "closed";
  closedAt?: string;
  closedBy?: string;
}

export interface AppNotification {
  id: string;
  type: "danger" | "warning" | "info" | "success";
  title: string;
  body: string;
  channels: ("app" | "sms" | "email")[];
  read: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  detail: string;
  at: string;
}

export interface AppState {
  users: User[];
  groups: EquipmentGroup[];
  equipment: Equipment[];
  sections: ChecklistSection[];
  items: ChecklistItem[];
  records: InspectionRecord[];
  years: FiscalYear[];
  notifications: AppNotification[];
  logs: ActivityLog[];
  lastBackup: string;
}

export interface Session {
  userId: string;
  loginAt: string;
}

export type Page =
  | "dashboard"
  | "scan"
  | "inspections"
  | "equipment"
  | "checklists"
  | "users"
  | "reports"
  | "notifications"
  | "logs"
  | "archive";
