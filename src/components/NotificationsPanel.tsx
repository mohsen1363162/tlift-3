import { AlertTriangle, Bell, Check, CreditCard, MessageSquare, X } from "lucide-react";
import type { AppNotification } from "../store";
import { appStore, useNotifications } from "../store";
import type { Theme } from "../theme";

export default function NotificationsPanel({ t, onClose, onOpenContract, onShowToast }: { t: Theme; onClose: () => void; onOpenContract: (contractId: number) => void; onShowToast: (message: string) => void }) {
  const notifications = useNotifications();
  const icon = (item: AppNotification) => item.type === "payment" ? <CreditCard size={17}/> : item.type === "ticket" ? <MessageSquare size={17}/> : <AlertTriangle size={17}/>;
  return <div className="fixed inset-0 z-[85] bg-black/40" onClick={onClose}><div dir="rtl" className={`absolute bottom-10 right-4 top-auto max-h-[75vh] w-[min(420px,calc(100vw-32px))] overflow-hidden rounded-2xl border shadow-2xl ${t.card} ${t.border}`} onClick={(e) => e.stopPropagation()}>
    <div className={`flex items-center justify-between border-b p-4 ${t.border}`}><div className={`flex items-center gap-2 font-bold ${t.text}`}><Bell size={19} className="text-amber-500"/> اعلان‌ها <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white">{notifications.filter((n) => !n.read).length.toLocaleString("fa-IR")}</span></div><button onClick={onClose} className={`rounded-lg p-1 ${t.hover}`}><X size={17}/></button></div>
    <div className="max-h-[65vh] overflow-y-auto p-2">{notifications.map((item) => <div key={item.id} className={`mb-2 rounded-xl border p-3 ${t.border} ${!item.read ? "bg-blue-500/10" : ""}`}>
      <button type="button" onClick={() => { appStore.markNotificationRead(item.id); onOpenContract(item.contractId); onClose(); }} className="w-full text-right"><div className="flex items-start gap-2"><span className={item.type === "payment" ? "text-emerald-500" : item.type === "ticket" ? "text-blue-500" : "text-red-500"}>{icon(item)}</span><div className="flex-1"><div className={`text-xs font-bold ${t.text}`}>{item.title}</div><div className={`mt-1 text-[11px] leading-5 ${t.sub}`}>{item.message}</div><div className={`mt-1 text-[9.5px] ${t.sub}`}>{new Date(item.createdAt).toLocaleString("fa-IR")} {item.senderName ? `— ${item.senderName}` : ""}</div></div></div></button>
      {item.type === "payment" && item.actionStatus === "pending" && <div className="mt-2 flex gap-2 border-t pt-2"><button type="button" onClick={() => { appStore.resolveNotification(item.id, true); onShowToast("پرداخت تأیید و در پرتال قرارداد ثبت شد"); }} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 py-2 text-[11px] font-bold text-white"><Check size={14}/> تأیید پرداخت</button><button type="button" onClick={() => { appStore.resolveNotification(item.id, false); onShowToast("پرداخت رد شد"); }} className="rounded-lg border border-red-400 px-3 text-[11px] text-red-500">رد</button></div>}
      {item.actionStatus && item.actionStatus !== "pending" && <div className={`mt-2 text-[10px] font-bold ${item.actionStatus === "approved" ? "text-emerald-500" : "text-red-500"}`}>{item.actionStatus === "approved" ? "تأیید شده" : "رد شده"}</div>}
    </div>)}{notifications.length === 0 && <div className={`py-16 text-center text-xs ${t.sub}`}>اعلان جدیدی وجود ندارد</div>}</div>
  </div></div>;
}
