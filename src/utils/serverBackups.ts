const TOKEN = (import.meta.env.VITE_SYNC_TOKEN as string | undefined) || "tlift-asemansara-1405";
const endpoints = () => {
  const custom = import.meta.env.VITE_SYNC_API as string | undefined;
  if (custom) return [custom];
  if (location.hostname === "emami-asemansara.ir" || location.hostname === "www.emami-asemansara.ir") return ["/api/sync.php", "/sync.php"];
  return ["https://emami-asemansara.ir/api/sync.php", "https://emami-asemansara.ir/sync.php"];
};
async function request(params: Record<string, string>) {
  let last: unknown;
  for (const endpoint of endpoints()) {
    try {
      const url = new URL(endpoint, location.origin);
      Object.entries({ ...params, token: TOKEN }).forEach(([key, value]) => url.searchParams.set(key, value));
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) { last = error; }
  }
  throw last instanceof Error ? last : new Error("سرور پشتیبان در دسترس نیست");
}
export const listServerBackupDates = async (): Promise<string[]> => request({ action: "backups" });
export const getContractsServerBackup = async (date: string): Promise<any[]> => {
  const row = await request({ action: "backup", key: "tlift_contracts", date });
  return Array.isArray(row?.data) ? row.data : [];
};
