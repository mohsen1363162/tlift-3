import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw, CheckCircle2, WifiOff } from "lucide-react";
import { subscribeSync, syncNow, SyncState, toggleManualOffline } from "../cloudSync";

export function useSyncState() {
  const [s, setS] = useState<SyncState>({
    status: typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "idle",
    lastSync: null,
    pending: 0,
    offlineServicesCount: 0,
    isManualOffline: false,
  });
  useEffect(() => subscribeSync(setS), []);
  return s;
}

interface SyncIndicatorProps {
  compact?: boolean;
  variant?: "header" | "footer" | "button" | "pill";
  onShowToast?: (msg: string) => void;
}

export default function SyncIndicator({
  compact = false,
  variant = "footer",
  onShowToast,
}: SyncIndicatorProps) {
  const s = useSyncState();
  const [busy, setBusy] = useState(false);

  const isOffline = s.status === "offline" || s.status === "error" || s.isManualOffline;
  const isSyncing = s.status === "syncing" || busy;
  const isOnline = s.status === "online";

  const handleSync = async () => {
    if (isSyncing) return;
    setBusy(true);
    if (onShowToast) onShowToast("در حال همگام‌سازی اطلاعات با سرور...");
    try {
      const res = await syncNow();
      if (onShowToast) {
        onShowToast(res.message);
      }
    } catch {
      if (onShowToast) {
        onShowToast("خطا در همگام‌سازی. اطلاعات در صف آفلاین ذخیره شد.");
      }
    } finally {
      setBusy(false);
    }
  };

  const time = s.lastSync
    ? new Date(s.lastSync).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })
    : "";

  if (variant === "header") {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing}
          title={
            s.error
              ? `خطا: ${s.error}`
              : isOffline
              ? "آفلاین - برای تلاش مجدد جهت اتصال کلیک کنید"
              : `آخرین همگام‌سازی موفق: ${time || "هم‌اکنون"}`
          }
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[11.5px] font-medium transition shadow-sm ${
            isSyncing
              ? "bg-blue-600 text-white animate-pulse"
              : isOffline
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
              : isOnline
              ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30"
              : "bg-zinc-700/60 text-zinc-200 hover:bg-zinc-700"
          }`}
        >
          {isSyncing ? (
            <RefreshCw size={13} className="animate-spin text-blue-200" />
          ) : isOffline ? (
            <CloudOff size={13} className="text-amber-400" />
          ) : (
            <Cloud size={13} className="text-emerald-400" />
          )}

          <span>
            {isSyncing
              ? "در حال همگام‌سازی..."
              : isOffline
              ? s.offlineServicesCount > 0
                ? `همگام‌سازی (${s.offlineServicesCount} ثبت آفلاین)`
                : s.pending > 0
                ? `همگام‌سازی (${s.pending} در صف)`
                : "آفلاین (همگام‌سازی)"
              : "همگام‌سازی ابری"}
          </span>

          {s.pending > 0 && !isSyncing && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-neutral-950">
              {s.pending}
            </span>
          )}
        </button>

        {/* دکمه سوئیچ حالت آفلاین دستی برای تست یا هنگام نبود آنتن */}
        {isOffline && (
          <button
            type="button"
            onClick={() => {
              toggleManualOffline();
              if (onShowToast) {
                onShowToast(
                  s.isManualOffline ? "حالت آنلاین فعال شد" : "حالت آفلاین دستی فعال شد"
                );
              }
            }}
            title={
              s.isManualOffline
                ? "خروج از حالت آفلاین دستی"
                : "فعال‌سازی حالت آفلاین دستی (برای نقاط بدون آنتن)"
            }
            className="flex items-center gap-1 rounded bg-amber-500/10 px-2 py-1 text-[10.5px] text-amber-300 border border-amber-500/20 hover:bg-amber-500/20"
          >
            <WifiOff size={11} />
            <span>{s.isManualOffline ? "آفلاین دستی (فعال)" : "آفلاین"}</span>
          </button>
        )}
      </div>
    );
  }

  // Footer / Default Compact Variant
  const label = isSyncing
    ? "در حال همگام‌سازی..."
    : isOnline
    ? "متصل به سرور و همگام"
    : isOffline
    ? s.offlineServicesCount > 0
      ? `آفلاین (${s.offlineServicesCount} سرویس ثبت‌شده)`
      : s.pending > 0
      ? `آفلاین (${s.pending} مورد در صف)`
      : "آفلاین (ذخیره محلی)"
    : "همگام‌سازی ابری";

  const color = isOnline
    ? "text-emerald-400 hover:text-emerald-300"
    : isOffline
    ? "text-amber-400 hover:text-amber-300"
    : "text-zinc-400 hover:text-zinc-200";

  return (
    <button
      type="button"
      title={
        s.error
          ? `آخرین خطا: ${s.error} (کلیک برای تلاش مجدد)`
          : `آخرین همگام‌سازی: ${time || "-"} (کلیک جهت همگام‌سازی)`
      }
      onClick={handleSync}
      className={`flex items-center gap-1.5 text-[11.5px] transition ${color}`}
    >
      {isSyncing ? (
        <RefreshCw size={13} className="animate-spin" />
      ) : isOnline ? (
        <CheckCircle2 size={13} />
      ) : isOffline ? (
        <CloudOff size={13} />
      ) : (
        <Cloud size={13} />
      )}

      {!compact && <span>{label}</span>}
      {s.pending > 0 && (
        <span className="rounded bg-amber-600 px-1 py-0.2 text-[9.5px] text-white font-bold">
          {s.pending}
        </span>
      )}
    </button>
  );
}
