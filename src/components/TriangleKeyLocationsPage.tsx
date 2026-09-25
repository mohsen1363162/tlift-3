import { useMemo, useState } from "react";
import { KeyRound, Search, Save, X } from "lucide-react";
import type { Theme } from "../theme";
import { appStore, useContracts } from "../store";
import type { Contract } from "../data";

export default function TriangleKeyLocationsPage({
  t,
  onShowToast,
}: {
  t: Theme;
  onShowToast: (message: string) => void;
}) {
  const contracts = useContracts();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Contract | null>(null);
  const [location, setLocation] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("fa");
    if (q.length < 2) return [];
    return contracts
      .filter((contract) =>
        [contract.building, contract.buildingName, contract.manager, contract.customer, contract.phone, contract.coordinator, contract.coordinatorPhone, contract.no]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase("fa").includes(q))
      )
      .slice(0, 50);
  }, [contracts, query]);

  const startEdit = (contract: Contract) => {
    setEditing(contract);
    setLocation(contract.triangleKeyLocation || "");
  };

  const save = () => {
    if (!editing) return;
    appStore.updateContract({
      ...editing,
      triangleKeyLocation: location.trim() || undefined,
    });
    setEditing(null);
    setLocation("");
    onShowToast("محل کلید سه‌گوش ذخیره شد");
  };

  return (
    <div dir="rtl" className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className={`mx-auto max-w-4xl rounded-2xl border p-4 shadow-sm sm:p-6 ${t.card} ${t.border}`}>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <KeyRound size={23} />
          </div>
          <div>
            <h1 className={`text-base font-bold ${t.text}`}>محل کلید سه‌گوش</h1>
            <p className={`mt-1 text-xs ${t.sub}`}>دسترسی سریع به محل کلید نجات اضطراری ساختمان‌ها</p>
          </div>
        </div>

        <div className={`flex items-center gap-2 rounded-xl border px-3 ${t.input} ${t.border}`}>
          <Search size={18} className={t.sub} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="نام ساختمان، مشتری، مسئول هماهنگی یا شماره قرارداد را جستجو کنید"
            className="h-12 w-full bg-transparent text-sm outline-none"
          />
          {query && <button type="button" onClick={() => setQuery("")}><X size={17} className={t.sub} /></button>}
        </div>

        {query.trim().length < 2 ? (
          <div className={`py-14 text-center text-sm ${t.sub}`}>برای حفظ محرمانگی، فهرست ساختمان‌ها نمایش داده نمی‌شود. حداقل دو حرف جستجو کنید.</div>
        ) : results.length === 0 ? (
          <div className={`py-14 text-center text-sm ${t.sub}`}>ساختمانی با این مشخصات پیدا نشد.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {results.map((contract) => (
              <div key={contract.id} className={`rounded-xl border p-4 ${t.border}`}>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <div className={`font-semibold ${t.text}`}>{contract.building.replace(/^\*\s*/, "")}</div>
                    <div className={`mt-1 text-xs ${t.sub}`}>{contract.manager} · قرارداد {contract.no}</div>
                  </div>
                  <button type="button" onClick={() => startEdit(contract)} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700">
                    {contract.triangleKeyLocation ? "ویرایش محل کلید" : "ثبت محل کلید"}
                  </button>
                </div>
                <div className={`mt-3 rounded-lg border px-3 py-3 text-sm ${t.border} ${contract.triangleKeyLocation ? t.text : t.sub}`}>
                  <span className="ml-2 text-xs font-medium text-red-500">محل کلید:</span>
                  {contract.triangleKeyLocation || "ثبت نشده"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={() => setEditing(null)}>
          <div className={`w-full max-w-lg rounded-2xl border p-5 shadow-2xl ${t.card} ${t.border}`} onClick={(event) => event.stopPropagation()}>
            <h2 className={`font-bold ${t.text}`}>محل کلید سه‌گوش — {editing.building.replace(/^\*\s*/, "")}</h2>
            <p className={`mt-1 text-xs ${t.sub}`}>محل دقیق و قابل فهم برای شرایط نجات اضطراری را بنویسید.</p>
            <textarea
              autoFocus
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="مثلاً: داخل جعبه آتش‌نشانی طبقه همکف، پشت کپسول"
              className={`mt-4 min-h-28 w-full rounded-xl border p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${t.input} ${t.border}`}
            />
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={save} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm text-white hover:bg-emerald-700"><Save size={16} /> ذخیره</button>
              <button type="button" onClick={() => setEditing(null)} className={`rounded-lg border px-5 py-2.5 text-sm ${t.border} ${t.hover}`}>انصراف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
