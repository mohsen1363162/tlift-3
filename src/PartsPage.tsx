import { useMemo, useState } from "react";
import { Package, Plus, Truck, Users } from "lucide-react";
import type { Theme } from "./theme";
import { partsApi, useParts, UNITS } from "./partsStore";
import { appStore, useStaff, useTechnicianPartDeliveries } from "./store";
import NumberStepper from "./components/NumberStepper";

export default function PartsPage({ t }: { t: Theme }) {
  const parts = useParts();
  const staff = useStaff();
  const deliveries = useTechnicianPartDeliveries();
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<"part" | "delivery" | "stock" | null>(null);
  const [selectedPartId, setSelectedPartId] = useState<number>(parts[0]?.id || 0);
  const [selectedStaffId, setSelectedStaffId] = useState<number>(staff[0]?.id || 0);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [stockQuantity, setStockQuantity] = useState(1);
  const [partForm, setPartForm] = useState({ code: "", name: "", unit: "عدد", price: 0 });
  const [toast, setToast] = useState("");
  const notify = (message: string) => { setToast(message); setTimeout(() => setToast(""), 2500); };
  const list = useMemo(() => parts.filter((part) => !q.trim() || `${part.name} ${part.code}`.toLowerCase().includes(q.trim().toLowerCase())), [parts, q]);
  const selectedPart = parts.find((part) => part.id === selectedPartId);
  const selectedStaff = staff.find((person) => person.id === selectedStaffId);
  const deliver = () => {
    if (!selectedPart || !selectedStaff) return notify("قطعه و سرویس‌کار را انتخاب کنید");
    if (quantity <= 0 || selectedPart.stock < quantity) return notify("موجودی انبار برای این تحویل کافی نیست");
    if (!partsApi.adjustStock(selectedPart.id, -quantity)) return notify("کسر موجودی انجام نشد");
    appStore.addTechnicianPartDelivery({ technicianName: `${selectedStaff.first} ${selectedStaff.last}`.trim(), technicianPhone: selectedStaff.phone, partId: selectedPart.id, partCode: selectedPart.code, partName: selectedPart.name, unit: selectedPart.unit, quantity, usedQuantity: 0, remainingQuantity: quantity, deliveredAt: new Date().toLocaleDateString("fa-IR"), note, status: "active" });
    setModal(null); setQuantity(1); setNote(""); notify("قطعه تحویل شد و از موجودی انبار کسر گردید");
  };
  return <div className="relative flex h-full min-h-0 flex-col p-4">
    <div className="mb-4 flex flex-wrap items-center gap-2"><div className={`flex h-10 min-w-60 flex-1 items-center rounded-xl border px-3 ${t.input} ${t.border}`}><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی نام یا کد کالا..." className="w-full bg-transparent text-sm outline-none"/></div><button onClick={() => setModal("stock")} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white"><Plus size={15} className="ml-1 inline"/> افزایش موجودی</button><button onClick={() => setModal("delivery")} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white"><Truck size={15} className="ml-1 inline"/> تحویل به سرویس‌کار</button><button onClick={() => setModal("part")} className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white"><Package size={15} className="ml-1 inline"/> تعریف کالا</button></div>
    <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1fr_390px]">
      <div className={`overflow-auto rounded-xl border ${t.border}`}><table className="w-full text-xs"><thead className={t.head}><tr>{["کد","نام کالا","واحد","موجودی انبار","قیمت واحد"].map(x=><th key={x} className="p-3 text-right">{x}</th>)}</tr></thead><tbody>{list.map(part=><tr key={part.id} className={`border-t ${t.border}`}><td className="p-3 text-violet-500">{part.code}</td><td className={`p-3 font-bold ${t.text}`}>{part.name}</td><td className={`p-3 ${t.sub}`}>{part.unit}</td><td className={`p-3 text-lg font-black ${part.stock <= (part.minimumStock || 0) ? "text-red-500" : "text-emerald-500"}`}>{part.stock.toLocaleString("fa-IR")}</td><td className={`p-3 ${t.text}`}>{part.price.toLocaleString("fa-IR")} ریال</td></tr>)}</tbody></table></div>
      <div className={`overflow-auto rounded-xl border p-3 ${t.border}`}><h3 className={`mb-3 flex items-center gap-2 text-sm font-bold ${t.text}`}><Users size={18} className="text-blue-500"/> امانت و موجودی نزد همکاران</h3><div className="space-y-2">{deliveries.filter(d=>d.status==="active").map(d=><div key={d.id} className={`rounded-xl border p-3 ${t.border}`}><div className={`font-bold ${t.text}`}>{d.partName}</div><div className={`mt-1 text-xs ${t.sub}`}>{d.technicianName} · تحویل {d.deliveredAt}</div><div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]"><span className="rounded bg-blue-500/10 p-1 text-blue-500">تحویل: {d.quantity}</span><span className="rounded bg-amber-500/10 p-1 text-amber-500">مصرف: {d.usedQuantity}</span><span className="rounded bg-emerald-500/10 p-1 text-emerald-500">باقی: {d.remainingQuantity}</span></div></div>)}{deliveries.filter(d=>d.status==="active").length===0&&<div className={`py-10 text-center text-xs ${t.sub}`}>قطعه‌ای نزد سرویس‌کاران نیست</div>}</div></div>
    </div>
    {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={()=>setModal(null)}><div className={`w-full max-w-lg rounded-2xl border p-5 ${t.panel} ${t.border}`} onClick={e=>e.stopPropagation()}><h2 className={`mb-4 font-bold ${t.text}`}>{modal==="delivery"?"تحویل کالا به سرویس‌کار":modal==="stock"?"افزایش موجودی انبار":"تعریف کالای جدید"}</h2>{modal==="part"?<div className="space-y-3"><input value={partForm.code} onChange={e=>setPartForm({...partForm,code:e.target.value})} placeholder="کد کالا" className={`w-full rounded-xl border p-3 ${t.input}`}/><input value={partForm.name} onChange={e=>setPartForm({...partForm,name:e.target.value})} placeholder="نام کالا" className={`w-full rounded-xl border p-3 ${t.input}`}/><select value={partForm.unit} onChange={e=>setPartForm({...partForm,unit:e.target.value})} className={`w-full rounded-xl border p-3 ${t.input}`}>{UNITS.map(u=><option key={u}>{u}</option>)}</select><input inputMode="numeric" value={partForm.price||""} onChange={e=>setPartForm({...partForm,price:Number(e.target.value.replace(/\D/g,""))})} placeholder="قیمت واحد ریال" className={`w-full rounded-xl border p-3 ${t.input}`}/><button onClick={()=>{if(!partForm.name)return;partsApi.add({...partForm,alias:"",brand:"",country:"",desc:"",consumable:true,stock:0,minimumStock:0});setModal(null)}} className="w-full rounded-xl bg-violet-600 py-3 font-bold text-white">ذخیره کالا</button></div>:<div className="space-y-3"><select value={selectedPartId} onChange={e=>setSelectedPartId(Number(e.target.value))} className={`w-full rounded-xl border p-3 ${t.input}`}>{parts.map(p=><option key={p.id} value={p.id}>{p.name} — موجودی {p.stock}</option>)}</select>{modal==="delivery"&&<select value={selectedStaffId} onChange={e=>setSelectedStaffId(Number(e.target.value))} className={`w-full rounded-xl border p-3 ${t.input}`}>{staff.map(s=><option key={s.id} value={s.id}>{`${s.first} ${s.last}`.trim()}</option>)}</select>}<div className="flex justify-center"><NumberStepper value={modal==="delivery"?quantity:stockQuantity} onChange={modal==="delivery"?setQuantity:setStockQuantity} min={1}/></div>{modal==="delivery"&&<textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="توضیحات تحویل" className={`w-full rounded-xl border p-3 ${t.input}`}/>}<button onClick={modal==="delivery"?deliver:()=>{if(selectedPart&&partsApi.adjustStock(selectedPart.id,stockQuantity)){setModal(null);notify("موجودی افزایش یافت")}}} className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white">ثبت نهایی</button></div>}</div></div>}
    {toast&&<div className="fixed bottom-16 left-1/2 z-[70] -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-2 text-xs text-white">{toast}</div>}
  </div>;
}
