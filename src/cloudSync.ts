/**
 * همگام‌سازی ابری با سرور (Supabase / Cloud State)
 * با پشتیبانی کامل از حالت آفلاین، صف ذخیره‌سازی محلی پایدار و همگام‌سازی خودکار
 */
import { supabase } from "@/integrations/supabase/client";

export type SyncStatus = "idle" | "syncing" | "online" | "offline" | "error";

export type OfflineServiceRecord = {
  id: string;
  contractId: number;
  monthId: number;
  buildingName?: string;
  customerName?: string;
  doneDate: string;
  amount: number;
  recordedAt: number;
};

export type SyncState = {
  status: SyncStatus;
  lastSync: number | null;
  pending: number;
  offlineServicesCount: number;
  isManualOffline: boolean;
  error?: string;
};

type Listener = (s: SyncState) => void;

const TABLE = "app_state";
const META_KEY = "tlift_cloud_meta_v1";
const QUEUE_KEY = "tlift_offline_queue_v2";
const OFFLINE_SERVICES_KEY = "tlift_offline_services_v1";
const MANUAL_OFFLINE_KEY = "tlift_manual_offline_v1";

// خواندن صف ذخیره‌سازی محلی پایدار
const loadQueue = (): Record<string, unknown> => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "{}");
  } catch {
    return {};
  }
};

const saveQueue = (q: Record<string, unknown>) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    /* ignore */
  }
};

// خواندن سرویس‌های ثبت‌شده در حالت آفلاین
export const getOfflineServices = (): OfflineServiceRecord[] => {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_SERVICES_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveOfflineServices = (items: OfflineServiceRecord[]) => {
  try {
    localStorage.setItem(OFFLINE_SERVICES_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
};

export const recordOfflineService = (item: OfflineServiceRecord) => {
  const current = getOfflineServices();
  const updated = [item, ...current.filter((x) => x.id !== item.id)];
  saveOfflineServices(updated);
  setState({ offlineServicesCount: updated.length });
};

export const clearOfflineServices = () => {
  saveOfflineServices([]);
  setState({ offlineServicesCount: 0 });
};

const getInitialManualOffline = (): boolean => {
  try {
    return localStorage.getItem(MANUAL_OFFLINE_KEY) === "true";
  } catch {
    return false;
  }
};

const queue: Record<string, unknown> = loadQueue();
const timers: Record<string, ReturnType<typeof setTimeout>> = {};
let applyingRemote = false;

let state: SyncState = {
  status: typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "idle",
  lastSync: null,
  pending: Object.keys(queue).length,
  offlineServicesCount: getOfflineServices().length,
  isManualOffline: getInitialManualOffline(),
};

const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l({ ...state }));
const setState = (p: Partial<SyncState>) => {
  state = { ...state, ...p };
  emit();
};

export const subscribeSync = (l: Listener) => {
  listeners.add(l);
  l({ ...state });
  return () => {
    listeners.delete(l);
  };
};

export const getSyncState = () => state;

export const setManualOffline = (enabled: boolean) => {
  try {
    localStorage.setItem(MANUAL_OFFLINE_KEY, enabled ? "true" : "false");
  } catch {
    /* ignore */
  }
  setState({
    isManualOffline: enabled,
    status: enabled ? "offline" : navigator.onLine ? "idle" : "offline",
  });
  if (!enabled && navigator.onLine) {
    syncNow();
  }
};

export const toggleManualOffline = () => {
  setManualOffline(!state.isManualOffline);
};

// ---- local meta (updated_at per key) ----
const loadMeta = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) || "{}");
  } catch {
    return {};
  }
};

const saveMeta = (m: Record<string, string>) => {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
};

const db = () => (supabase as any).from(TABLE);

// تایم‌اوت برای جلوگیری از معلق ماندن در اینترنت ضعیف
function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("مهلت اتصال به سرور به پایان رسید (Timeout)")), ms)
    ),
  ]);
}

// ---- push (debounced per key) ----
export function pushKey(key: string, data: unknown) {
  if (applyingRemote) return; // تغییر از سمت سرور آمده؛ بازتاب نده
  queue[key] = data;
  saveQueue(queue);
  clearTimeout(timers[key]);
  setState({ pending: Object.keys(queue).length });

  // اگر در حالت آفلاین دستی است، در صف بماند و فعلا ارسال نشود
  if (state.isManualOffline || (typeof navigator !== "undefined" && !navigator.onLine)) {
    setState({ status: "offline" });
    return;
  }

  timers[key] = setTimeout(() => flushKey(key), 800);
}

async function flushKey(key: string): Promise<boolean> {
  if (state.isManualOffline || (typeof navigator !== "undefined" && !navigator.onLine)) {
    setState({ status: "offline" });
    return false;
  }

  const data = queue[key];
  if (data === undefined) return true;

  const updated_at = new Date().toISOString();
  try {
    setState({ status: "syncing" });
    const res = await withTimeout(
      db().upsert({ key, data, updated_at }, { onConflict: "key" })
    );
    if (res.error) throw res.error;

    delete queue[key];
    saveQueue(queue);

    const meta = loadMeta();
    meta[key] = updated_at;
    saveMeta(meta);

    setState({
      status: "online",
      lastSync: Date.now(),
      pending: Object.keys(queue).length,
      error: undefined,
    });
    return true;
  } catch (e: unknown) {
    // در صف نگه‌دار و وضعیت را به آفلاین تغییر بده
    queue[key] = data;
    saveQueue(queue);
    setState({
      status: "offline",
      pending: Object.keys(queue).length,
      error: String((e as Error)?.message || e),
    });
    clearTimeout(timers[key]);
    timers[key] = setTimeout(() => flushKey(key), 20000);
    return false;
  }
}

export async function flushAll(): Promise<boolean> {
  if (state.isManualOffline || (typeof navigator !== "undefined" && !navigator.onLine)) {
    setState({ status: "offline" });
    return false;
  }
  const keys = Object.keys(queue);
  if (keys.length === 0) return true;

  const results = await Promise.all(keys.map((k) => flushKey(k)));
  const allOk = results.every(Boolean);
  if (allOk) {
    clearOfflineServices();
  }
  return allOk;
}

// ---- pull ----
type Applier = (key: string, data: unknown) => void;
let applier: Applier | null = null;

export function registerApplier(fn: Applier) {
  applier = fn;
}

function applyRemote(key: string, data: unknown, updated_at: string) {
  // اگر برای این کلید تغییرات محلی ارسال‌نشده داریم، داده سرور آن را رونویسی نکند
  if (queue[key] !== undefined) return;

  const meta = loadMeta();
  if (meta[key] && meta[key] >= updated_at) return; // قبلاً داریم یا جدیدتر است
  applyingRemote = true;
  try {
    applier?.(key, data);
  } finally {
    applyingRemote = false;
  }
  meta[key] = updated_at;
  saveMeta(meta);
}

export async function pullAll(prefix = "tlift_"): Promise<boolean> {
  if (state.isManualOffline || (typeof navigator !== "undefined" && !navigator.onLine)) {
    setState({ status: "offline" });
    return false;
  }
  try {
    setState({ status: "syncing" });
    const res = await withTimeout(
      db().select("key,data,updated_at").like("key", `${prefix}%`)
    );
    if (res.error) throw res.error;

    (res.data || []).forEach((r: { key: string; data: unknown; updated_at: string }) =>
      applyRemote(r.key, r.data, r.updated_at)
    );
    setState({ status: "online", lastSync: Date.now(), error: undefined });
    return true;
  } catch (e: unknown) {
    setState({ status: "offline", error: String((e as Error)?.message || e) });
    return false;
  }
}

// ---- realtime ----
let channelStarted = false;
export function startRealtime() {
  if (channelStarted) return;
  channelStarted = true;
  try {
    supabase
      .channel("app_state_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE },
        (payload: { new?: { key?: string; data?: unknown; updated_at?: string } }) => {
          const r = payload.new;
          if (r?.key && r.updated_at) applyRemote(r.key, r.data, r.updated_at);
        }
      )
      .subscribe();
  } catch {
    /* realtime optional */
  }
}

// ---- bootstrap ----
let started = false;
export async function startCloudSync() {
  if (started) return;
  started = true;

  // مقداردهی اولیه تعداد صف
  setState({
    pending: Object.keys(queue).length,
    offlineServicesCount: getOfflineServices().length,
  });

  if (!state.isManualOffline && navigator.onLine) {
    await pullAll();
    if (Object.keys(queue).length > 0) {
      await flushAll();
    }
    startRealtime();
  } else {
    setState({ status: "offline" });
  }

  // تلاش مجدد دوره‌ای برای صف و همگام‌سازی
  setInterval(() => {
    if (!state.isManualOffline && navigator.onLine) {
      if (Object.keys(queue).length) flushAll();
      else pullAll();
    }
  }, 45000);

  window.addEventListener("online", () => {
    if (!state.isManualOffline) {
      setState({ status: "syncing" });
      flushAll().then(() => pullAll());
    }
  });

  window.addEventListener("offline", () => {
    setState({ status: "offline" });
  });
}

/** همگام‌سازی دستی یا خودکار */
export async function syncNow(): Promise<{ success: boolean; message: string }> {
  if (state.isManualOffline) {
    return {
      success: false,
      message: "حالت آفلاین دستی فعال است. ابتدا آن را غیرفعال کنید.",
    };
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    setState({ status: "offline" });
    return {
      success: false,
      message: "اتصال به اینترنت برقرار نیست. داده‌ها در صف آفلاین محفوظ هستند.",
    };
  }

  setState({ status: "syncing" });
  try {
    const pushed = await flushAll();
    const pulled = await pullAll();

    if (pushed && pulled) {
      clearOfflineServices();
      setState({
        status: "online",
        lastSync: Date.now(),
        pending: 0,
        offlineServicesCount: 0,
        error: undefined,
      });
      return {
        success: true,
        message: "همگام‌سازی کامل با سرور انجام شد و همه اطلاعات به‌روزرسانی شدند.",
      };
    } else {
      setState({ status: "offline" });
      return {
        success: false,
        message: "برخی داده‌ها در صف باقی ماندند. به محض اتصال مجدد ارسال خواهند شد.",
      };
    }
  } catch (err: unknown) {
    setState({ status: "offline", error: String((err as Error)?.message || err) });
    return {
      success: false,
      message: "خطا در برقراری ارتباط با سرور. اطلاعات در حافظه محلی محفوظ است.",
    };
  }
}
