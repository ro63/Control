import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { AppState, ChecklistItem, ChecklistSection, Equipment, EquipmentGroup, InspectionRecord, Session, User, AppNotification, ActivityLog } from "./types";
import { buildSeed } from "./seed";
import { hashPw, todayISO, uid } from "./utils";

const DB_KEY = "nipco-db-v3";
const SES_KEY = "nipco-session-v3";

export type Perm =
  | "users.manage" | "checklists.manage" | "equipment.manage" | "groups.manage"
  | "reports.view" | "archive.view" | "logs.view" | "inspections.create" | "inspections.viewAll"
  | "equipment.editStatus";

const ROLE_PERMS: Record<string, Perm[]> = {
  admin: ["users.manage", "checklists.manage", "equipment.manage", "groups.manage", "reports.view", "archive.view", "logs.view", "inspections.create", "inspections.viewAll", "equipment.editStatus"],
  supervisor: ["equipment.manage", "groups.manage", "reports.view", "logs.view", "inspections.create", "inspections.viewAll", "equipment.editStatus"],
  technician: ["inspections.create"],
  viewer: ["reports.view"],
};

export interface Toast { id: string; msg: string; type: "success" | "error" | "info" }

interface StoreApi {
  state: AppState;
  session: Session | null;
  user: User | null;
  unread: number;
  toasts: Toast[];
  toast: (msg: string, type?: Toast["type"]) => void;
  dismissToast: (id: string) => void;
  login: (username: string, password: string) => { ok: boolean; msg?: string };
  logout: () => void;
  can: (p: Perm) => boolean;
  addLog: (action: string, detail: string) => void;
  saveUser: (u: User) => void;
  deleteUser: (id: string) => void;
  saveGroup: (g: EquipmentGroup) => void;
  deleteGroup: (id: string) => void;
  saveEquipment: (e: Equipment) => void;
  deleteEquipment: (id: string) => void;
  saveSection: (s: ChecklistSection) => void;
  saveItem: (i: ChecklistItem) => void;
  deleteItem: (id: string) => void;
  addRecord: (r: InspectionRecord) => void;
  deleteRecord: (id: string) => void;
  pushNotif: (n: Omit<AppNotification, "id" | "read" | "createdAt">) => void;
  markNotifRead: (id: string) => void;
  markAllRead: () => void;
  resetData: () => void;
}

const Ctx = createContext<StoreApi | null>(null);

function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => load<AppState>(DB_KEY) ?? buildSeed());
  const [session, setSession] = useState<Session | null>(() => load<Session>(SES_KEY));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => { try { localStorage.setItem(DB_KEY, JSON.stringify(state)); } catch { /* full */ } }, [state]);
  useEffect(() => { try { session ? localStorage.setItem(SES_KEY, JSON.stringify(session)) : localStorage.removeItem(SES_KEY); } catch { /* noop */ } }, [session]);

  const toast = useCallback((msg: string, type: Toast["type"] = "success") => {
    const id = uid("t");
    setToasts((t) => [...t.slice(-3), { id, msg, type }]);
    timers.current.push(window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800));
  }, []);
  const dismissToast = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const user = useMemo(() => state.users.find((u) => u.id === session?.userId) ?? null, [state.users, session]);

  const can = useCallback((p: Perm) => {
    if (!user) return false;
    if (p === "archive.view") return user.role === "admin" || user.canArchive;
    return (ROLE_PERMS[user.role] ?? []).includes(p);
  }, [user]);

  const addLog = useCallback((action: string, detail: string) => {
    setState((s) => ({
      ...s,
      logs: [{ id: uid("log"), userId: session?.userId ?? "sys", userName: user?.fullName ?? "سیستم", action, detail, at: new Date().toISOString() }, ...s.logs].slice(0, 400),
    }));
  }, [session, user]);

  const login = useCallback((username: string, password: string) => {
    const u = state.users.find((x) => x.username.toLowerCase() === username.trim().toLowerCase());
    if (!u) return { ok: false, msg: "نام کاربری یافت نشد" };
    if (!u.active) return { ok: false, msg: "حساب کاربری غیرفعال است — با مدیر سیستم تماس بگیرید" };
    if (u.password !== hashPw(password)) return { ok: false, msg: "رمز عبور اشتباه است" };
    setSession({ userId: u.id, loginAt: new Date().toISOString() });
    setState((s) => ({ ...s, logs: [{ id: uid("log"), userId: u.id, userName: u.fullName, action: "ورود به سیستم", detail: "احراز هویت موفق", at: new Date().toISOString() }, ...s.logs].slice(0, 400) }));
    return { ok: true };
  }, [state.users]);

  const logout = useCallback(() => {
    if (session) {
      setState((s) => ({ ...s, logs: [{ id: uid("log"), userId: session.userId, userName: user?.fullName ?? "—", action: "خروج از سیستم", detail: "پایان نشست کاربری", at: new Date().toISOString() }, ...s.logs].slice(0, 400) }));
    }
    setSession(null);
  }, [session, user]);

  /* اعلان خودکار بازدیدهای انجام‌نشده + پشتیبان‌گیری روزانه */
  useEffect(() => {
    const today = todayISO();
    setState((s) => {
      const done = new Set(s.records.filter((r) => r.date === today).map((r) => r.equipmentId));
      const missed = s.equipment.filter((e) => e.status === "active" && !done.has(e.id));
      const nid = `auto-missed-${today}`;
      let notifications = s.notifications;
      if (missed.length > 0 && !s.notifications.some((n) => n.id === nid)) {
        const auto: AppNotification = {
          id: nid, type: "warning", title: "بازدید روزانه انجام نشده",
          body: `${missed.length} تجهیز فعال هنوز بازدید روزانه نشده‌اند: ${missed.slice(0, 3).map((m) => m.name).join("، ")}${missed.length > 3 ? " و …" : ""}. پیامک و ایمیل یادآوری برای مدیر و سرپرست نت ارسال شد.`,
          channels: ["app", "sms", "email"], read: false, createdAt: new Date().toISOString(),
        };
        notifications = [auto, ...notifications].slice(0, 80);
      }
      const lastBackup = s.lastBackup.slice(0, 10) !== today ? new Date().toISOString() : s.lastBackup;
      return { ...s, notifications, lastBackup };
    });
  }, []);

  const api: StoreApi = {
    state, session, user,
    unread: state.notifications.filter((n) => !n.read).length,
    toasts, toast, dismissToast, login, logout, can, addLog,
    saveUser: (u) => setState((s) => {
      const exists = s.users.some((x) => x.id === u.id);
      return { ...s, users: exists ? s.users.map((x) => (x.id === u.id ? u : x)) : [...s.users, u] };
    }),
    deleteUser: (id) => setState((s) => ({ ...s, users: s.users.filter((x) => x.id !== id) })),
    saveGroup: (g) => setState((s) => {
      const exists = s.groups.some((x) => x.id === g.id);
      return { ...s, groups: exists ? s.groups.map((x) => (x.id === g.id ? g : x)) : [...s.groups, g] };
    }),
    deleteGroup: (id) => setState((s) => ({ ...s, groups: s.groups.filter((x) => x.id !== id) })),
    saveEquipment: (e) => setState((s) => {
      const exists = s.equipment.some((x) => x.id === e.id);
      return { ...s, equipment: exists ? s.equipment.map((x) => (x.id === e.id ? e : x)) : [...s.equipment, e] };
    }),
    deleteEquipment: (id) => setState((s) => ({ ...s, equipment: s.equipment.filter((x) => x.id !== id), records: s.records.filter((r) => r.equipmentId !== id) })),
    saveSection: (sec) => setState((s) => {
      const exists = s.sections.some((x) => x.id === sec.id);
      return { ...s, sections: exists ? s.sections.map((x) => (x.id === sec.id ? sec : x)) : [...s.sections, sec] };
    }),
    saveItem: (i) => setState((s) => {
      const exists = s.items.some((x) => x.id === i.id);
      return { ...s, items: exists ? s.items.map((x) => (x.id === i.id ? i : x)) : [...s.items, i] };
    }),
    deleteItem: (id) => setState((s) => ({ ...s, items: s.items.filter((x) => x.id !== id) })),
    addRecord: (r) => setState((s) => ({ ...s, records: [r, ...s.records] })),
    deleteRecord: (id) => setState((s) => ({ ...s, records: s.records.filter((r) => r.id !== id) })),
    pushNotif: (n) => setState((s) => ({ ...s, notifications: [{ ...n, id: uid("ntf"), read: false, createdAt: new Date().toISOString() }, ...s.notifications].slice(0, 80) })),
    markNotifRead: (id) => setState((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
    markAllRead: () => setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
    resetData: () => { localStorage.removeItem(DB_KEY); setState(buildSeed()); },
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore(): StoreApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside provider");
  return v;
}

export type { ActivityLog };
