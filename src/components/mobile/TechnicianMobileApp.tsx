import { useEffect, useMemo, useRef, useState } from "react";
import {
  Menu,
  Play,
  Square,
  AlertTriangle,
  Plus,
  Wrench,
  Home,
  Map as MapIcon,
  CalendarDays,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Phone,
  Navigation,
  Truck,
  Image as ImageIcon,
  MapPin,
  Info,
  Users,
  Mic,
  MicOff,
  Camera,
  Check,
  X,
  Clock,
  RefreshCw,
  FileBarChart2,
  LogOut,
  Monitor,
  Eraser,
  Save,
  CreditCard,
  Building2,
  ClipboardCheck,
  Package,
  Search,
  Cloud,
  CloudOff,
  Smartphone,
  Download,
} from "lucide-react";
import type { Contract } from "../../data";
import {
  appStore,
  useContracts,
  useChecklist,
  useChecklistCategories,
  useActiveServiceAssignments,
  useCompanyAccessSettings,
  MonthService,
  ServiceChecklistStatus,
  ServicePartItem,
} from "../../store";
import { useParts } from "../../partsStore";
import { syncNow, toggleManualOffline } from "../../cloudSync";
import SyncIndicator, { useSyncState } from "../SyncIndicator";
import AndroidAppModal from "../AndroidAppModal";
import NumberStepper from "../NumberStepper";
import {
  getCurrentJalaliMonthInfo,
  getStoredMonthlySeconds,
  addWorkSessionSeconds,
  formatDurationPersian,
  JALALI_MONTH_NAMES,
} from "../../utils/workHoursTracker";
import { getShamsiDaysInMonth, getShamsiFirstDayOfWeek } from "../../utils/dateConverter";
import { checkForAppUpdates, APP_VERSION } from "../../utils/appUpdater";

/* -------------------------------------------------------------------------- */
/*                                   helpers                                  */
/* -------------------------------------------------------------------------- */

const fa = (n: number | string) => Number(n || 0).toLocaleString("fa-IR");
const pad = (n: number) => String(n).padStart(2, "0");
const fmtDur = (sec: number) =>
  `${pad(Math.floor(sec / 3600))}:${pad(Math.floor((sec % 3600) / 60))}:${pad(sec % 60)}`.replace(
    /\d/g,
    (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]
  );
const toEnglishDigits = (value: string) =>
  value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
const normalizeJalaliDate = (value?: string) => {
  if (!value) return "";
  const parts = toEnglishDigits(value).match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  return parts
    ? `${parts[1]}/${String(Number(parts[2])).padStart(2, "0")}/${String(Number(parts[3])).padStart(2, "0")}`
    : "";
};
const distanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const rad = (value: number) => (value * Math.PI) / 180;
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
const monthNumber = (name: string) => Math.max(1, JALALI_MONTH_NAMES.indexOf(name) + 1);
const jobDate = (job: Job) =>
  normalizeJalaliDate(job.month.plannedDate || job.month.date) ||
  `${job.month.y}/${String(monthNumber(job.month.m)).padStart(2, "0")}/${String(job.month.id || 1).padStart(2, "0")}`;

const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
const todayJalali = () =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "long", day: "numeric" }).format(
    new Date()
  );

const LS = {
  day: "tlift_mobile_day_start",
  activeJob: "tlift_mobile_active_job",
};
const MAX_WORK_SESSION_SECONDS = 12 * 60 * 60;

type Job = { contract: Contract; month: MonthService; overdue: boolean };
type Screen = "home" | "job" | "work" | "report" | "sign" | "map" | "calendar" | "services" | "offlineService" | "offlineQueue";

type OfflineServiceDraft = {
  id: string;
  customerName: string;
  createdAt: number;
  doneDate: string;
  inTime: string;
  outTime: string;
  report: string;
  reminder: string;
  followup: string;
  checklistResults: Record<number, ServiceChecklistStatus>;
  partsList: ServicePartItem[];
  faultsList: string[];
  wage: number;
  trip: number;
  attachments: string[];
  serviceDurationReason?: string;
};

const OFFLINE_DRAFTS_KEY = "tlift_unassigned_offline_services_v1";

export type TechnicianInfo = { name: string; phone?: string; code?: string; company?: string };

/* -------------------------------------------------------------------------- */
/*                                  component                                 */
/* -------------------------------------------------------------------------- */

export default function TechnicianMobileApp({
  technician,
  onExitToDesktop,
  onSignOut,
}: {
  technician: TechnicianInfo;
  onExitToDesktop: () => void;
  onSignOut: () => void;
}) {
  const contracts = useContracts();
  const activeServiceAssignments = useActiveServiceAssignments();
  const accessSettings = useCompanyAccessSettings();
  const checklist = useChecklist();
  const categories = useChecklistCategories();
  const parts = useParts();
  const sync = useSyncState();
  const [syncBusy, setSyncBusy] = useState(false);
  const isOffline = sync.status === "offline" || sync.status === "error" || sync.isManualOffline;
  const isSyncing = sync.status === "syncing" || syncBusy;

  const handleManualSync = async () => {
    if (isSyncing) return;
    setSyncBusy(true);
    notify("در حال همگام‌سازی اطلاعات با سرور...");
    try {
      const res = await syncNow();
      notify(res.message);
    } catch {
      notify("خطا در همگام‌سازی؛ داده‌ها در حافظه آفلاین محفوظ است.");
    } finally {
      setSyncBusy(false);
    }
  };

  const [screen, setScreen] = useState<Screen>("home");
  const [drawer, setDrawer] = useState(false);
  const [androidModal, setAndroidModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [offlineCustomerName, setOfflineCustomerName] = useState("");
  const [isAdhocOfflineService, setIsAdhocOfflineService] = useState(false);
  const [offlineDrafts, setOfflineDrafts] = useState<OfflineServiceDraft[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(OFFLINE_DRAFTS_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [draftMappings, setDraftMappings] = useState<Record<string, string>>({});
  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast((c) => (c === m ? null : c)), 2600);
  };

  /* ------------------------------ day timer & monthly hours ------------------------------ */
  const [dayStart, setDayStart] = useState<number | null>(() => {
    const v = localStorage.getItem(LS.day);
    return v ? Number(v) : null;
  });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // ساعت کار ماه شمسی جاری (از اول ماه شمسی شروع شده و مقدار اولیه آن صفر است)
  const [monthBaseSec, setMonthBaseSec] = useState<number>(() => getStoredMonthlySeconds());
  const currentMonthInfo = useMemo(() => getCurrentJalaliMonthInfo(), [Math.floor(tick / 60)]);
  const daySec = dayStart ? Math.floor((Date.now() - dayStart) / 1000) : 0;
  const currentMonthSec = monthBaseSec + (dayStart ? Math.min(daySec, MAX_WORK_SESSION_SECONDS) : 0);
  const autoStopHandled = useRef(false);

  // هیچ نوبت کاری بیشتر از ۱۲ ساعت باز نمی‌ماند. این کنترل هم در زمان
  // باز بودن برنامه و هم بلافاصله پس از بازگشت کاربر به برنامه اجرا می‌شود.
  useEffect(() => {
    if (!dayStart || daySec < MAX_WORK_SESSION_SECONDS) {
      if (!dayStart) autoStopHandled.current = false;
      return;
    }
    if (autoStopHandled.current) return;
    autoStopHandled.current = true;

    localStorage.removeItem(LS.day);
    const newMonthTotal = addWorkSessionSeconds(MAX_WORK_SESSION_SECONDS);
    setMonthBaseSec(newMonthTotal);
    setDayStart(null);
    notify("نوبت کاری پس از رسیدن به سقف ۱۲ ساعت به‌صورت خودکار پایان یافت.");
  }, [dayStart, daySec]);

  const toggleDay = () => {
    if (dayStart) {
      localStorage.removeItem(LS.day);
      const elapsed = Math.min(
        MAX_WORK_SESSION_SECONDS,
        Math.floor((Date.now() - dayStart) / 1000)
      );
      const newMonthTotal = addWorkSessionSeconds(elapsed);
      setMonthBaseSec(newMonthTotal);
      setDayStart(null);
      notify(`روز کاری پایان یافت. ساعت کار امروز: ${fmtDur(elapsed)}`);
    } else {
      const s = Date.now();
      localStorage.setItem(LS.day, String(s));
      setDayStart(s);
      notify("روز کاری شروع شد");
    }
  };

  /* ------------------------------ app updater ------------------------------ */
  const [updatingApp, setUpdatingApp] = useState(false);
  const handleAppUpdate = async () => {
    if (updatingApp) return;
    setUpdatingApp(true);
    notify("در حال بررسی و دریافت آخرین نسخه نرم‌افزار...");
    try {
      const res = await checkForAppUpdates();
      notify(res.message);
    } catch {
      notify(`نسخه ${APP_VERSION} تلیفت همراه فعال است.`);
    } finally {
      setUpdatingApp(false);
    }
  };

  /* -------------------------------- jobs --------------------------------- */
  const jobs = useMemo<Job[]>(() => {
    const out: Job[] = [];
    contracts.forEach((contract) => {
      const details = appStore.getContractDetails(contract.id);
      details.months.forEach((month) => {
        out.push({ contract, month, overdue: false });
      });
    });
    // سرویس‌های انجام‌نشده همیشه بالاتر و انجام‌شده‌ها پایین فهرست می‌آیند.
    return out.sort((a, b) => Number(a.month.done) - Number(b.month.done) || jobDate(a).localeCompare(jobDate(b)));
  }, [contracts, tick % 5 === 0 ? tick : 0]);
  const todayJobs = jobs.filter((j) => !j.overdue);
  const pastJobs = jobs.filter((j) => j.overdue);

  const initialCalendar = getCurrentJalaliMonthInfo();
  const [calendarYear, setCalendarYear] = useState(initialCalendar.year);
  const [calendarMonth, setCalendarMonth] = useState(initialCalendar.month);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(
    normalizeJalaliDate(
      new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date())
    )
  );
  const [serviceQuery, setServiceQuery] = useState("");

  const [selected, setSelected] = useState<Job | null>(null);

  /* ----------------------------- active service -------------------------- */
  const [jobStart, setJobStart] = useState<number | null>(null);
  const [jobStartClock, setJobStartClock] = useState<string>("");
  const jobSec = jobStart ? Math.floor((Date.now() - jobStart) / 1000) : 0;

  const [workTab, setWorkTab] = useState<"checklist" | "parts" | "faults">("checklist");
  const [results, setResults] = useState<Record<number, ServiceChecklistStatus>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [usedParts, setUsedParts] = useState<ServicePartItem[]>([]);
  const [partPicker, setPartPicker] = useState(false);
  const [partQuery, setPartQuery] = useState("");
  const [faults, setFaults] = useState<{ text: string; fixed: boolean }[]>([]);
  const [newFault, setNewFault] = useState("");

  const [wage, setWage] = useState(0);
  const [trip, setTrip] = useState(0);
  const [report, setReport] = useState("");
  const [reminder, setReminder] = useState("");
  const [followup, setFollowup] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  const [managerPresent, setManagerPresent] = useState(true);
  const [signed, setSigned] = useState(false);
  const [payModal, setPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState("کارت‌خوان سیار");
  const [payRef, setPayRef] = useState("");
  const [durationReviewOpen, setDurationReviewOpen] = useState(false);
  const [durationReason, setDurationReason] = useState("");
  const [correctedOutTime, setCorrectedOutTime] = useState("");

  const partsTotal = usedParts.reduce((s, p) => s + p.qty * p.price, 0);
  const total = (selected?.month.amount || 0) + partsTotal + wage + trip;

  const resetWork = () => {
    setJobStart(null);
    setJobStartClock("");
    setWorkTab("checklist");
    setResults({});
    setNotes({});
    setUsedParts([]);
    setFaults([]);
    setWage(0);
    setTrip(0);
    setReport("");
    setReminder("");
    setFollowup("");
    setPhotos([]);
    setSigned(false);
    setManagerPresent(true);
  };

  const saveOfflineDrafts = (drafts: OfflineServiceDraft[]) => {
    setOfflineDrafts(drafts);
    localStorage.setItem(OFFLINE_DRAFTS_KEY, JSON.stringify(drafts));
  };

  const startOfflineService = () => {
    const myActive = activeServiceAssignments.find((item) => item.technicianName === technician.name);
    if (myActive || jobStart) {
      notify(`ابتدا سرویس فعال ${myActive ? `«${myActive.buildingName}»` : "فعلی"} را به پایان برسانید`);
      return;
    }
    const name = offlineCustomerName.trim();
    if (!name) return notify("ابتدا نام مشتری یا ساختمان را وارد کنید");
    const temporaryContract: Contract = {
      id: -Date.now(),
      no: "آفلاین",
      building: name,
      manager: name,
      zone: "ثبت آفلاین",
      start: "—",
      end: "—",
      kind: "general",
    };
    const temporaryMonth: MonthService = {
      id: -Date.now(),
      m: getCurrentJalaliMonthInfo().monthName,
      y: getCurrentJalaliMonthInfo().year,
      done: false,
      amount: 0,
      paid: false,
    };
    resetWork();
    setIsAdhocOfflineService(true);
    setSelected({ contract: temporaryContract, month: temporaryMonth, overdue: false });
    setJobStart(Date.now());
    setJobStartClock(nowTime());
    setScreen("work");
    if (!dayStart) toggleDay();
  };

  const getCurrentPosition = () => new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("unsupported"));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 15000 });
  });

  const registerContractPosition = async (contract: Contract) => {
    try {
      notify("در حال دریافت موقعیت دقیق ساختمان...");
      const position = await getCurrentPosition();
      appStore.setContractGeoLocation({ contractId: contract.id, latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, updatedAt: Date.now() });
      notify(`موقعیت ساختمان ثبت شد (دقت ${Math.round(position.coords.accuracy)} متر)`);
    } catch { notify("دسترسی GPS ممکن نشد؛ مجوز موقعیت مکانی را فعال کنید"); }
  };

  const startService = async (j: Job) => {
    const location = appStore.getContractGeoLocation(j.contract.id);
    if (location && accessSettings.gpsRequired) {
      try {
        const current = await getCurrentPosition();
        const distance = distanceMeters(location.latitude, location.longitude, current.coords.latitude, current.coords.longitude);
        if (distance > accessSettings.gpsRadiusMeters + current.coords.accuracy) {
          notify(`شروع سرویس ممکن نیست؛ حدود ${Math.round(distance)} متر با ساختمان فاصله دارید`);
          return;
        }
      } catch { notify("برای شروع سرویس، GPS و مجوز موقعیت مکانی را فعال کنید"); return; }
    }
    const myActive = activeServiceAssignments.find(
      (item) => item.technicianName === technician.name
    );
    if (myActive && !(myActive.contractId === j.contract.id && myActive.monthId === j.month.id)) {
      notify(`ابتدا سرویس فعال «${myActive.buildingName}» را به پایان برسانید`);
      return;
    }
    const serviceActive = activeServiceAssignments.find(
      (item) => item.contractId === j.contract.id && item.monthId === j.month.id
    );
    if (serviceActive && serviceActive.technicianName !== technician.name) {
      notify(`این سرویس در حال انجام توسط ${serviceActive.technicianName} است`);
      return;
    }

    setIsAdhocOfflineService(false);
    setSelected(j);
    const startedAt = serviceActive?.startedAt || Date.now();
    setJobStart(startedAt);
    setJobStartClock(nowTime());
    appStore.startActiveService({
      contractId: j.contract.id,
      monthId: j.month.id,
      technicianName: technician.name,
      startedAt,
      buildingName: j.contract.building.replace(/^\*\s*/, ""),
    });
    localStorage.setItem(LS.activeJob, JSON.stringify({ contractId: j.contract.id, monthId: j.month.id, startedAt }));
    setScreen("work");
    if (!dayStart) toggleDay();
  };

  const finishService = (reviewConfirmed = false) => {
    if (!selected) return;
    if (jobSec >= 2 * 60 * 60 && !reviewConfirmed) {
      setCorrectedOutTime(nowTime().slice(0, 5));
      setDurationReason("");
      setDurationReviewOpen(true);
      return;
    }
    const finalOutTime = correctedOutTime || nowTime();
    const faultsList = faults.map((f) => `${f.text}${f.fixed ? " (رفع شد)" : ""}`);

    if (isAdhocOfflineService) {
      const draft: OfflineServiceDraft = {
        id: `offline-${Date.now()}`,
        customerName: selected.contract.building,
        createdAt: Date.now(),
        doneDate: todayJalali(),
        inTime: jobStartClock,
        outTime: finalOutTime,
        report,
        reminder,
        followup,
        checklistResults: results,
        partsList: usedParts,
        faultsList,
        wage,
        trip,
        attachments: photos,
        serviceDurationReason: durationReason.trim() || undefined,
      };
      saveOfflineDrafts([draft, ...offlineDrafts]);
      notify("سرویس آفلاین ذخیره شد؛ پس از اتصال، آن را به قرارداد مربوط متصل کنید.");
      resetWork();
      setSelected(null);
      setIsAdhocOfflineService(false);
      setOfflineCustomerName("");
      setScreen("offlineQueue");
      return;
    }

    appStore.addServiceSubmission(selected.contract.id, selected.month.id, {
      techs: [technician.name],
      doneBy: technician.name,
      doneDate: todayJalali(),
      inTime: jobStartClock,
      outTime: finalOutTime,
      report,
      reminder,
      total,
      parts: partsTotal,
      wage,
      trip,
      discount: 0,
      faults: faults.length,
      faultsList,
      partsList: usedParts,
    });
    appStore.updateMonthService(selected.contract.id, selected.month.id, {
      checklistResults: results,
      customerFollowup: followup,
      attachments: photos,
      serviceDurationReason: durationReason.trim() || undefined,
    });
    setDurationReviewOpen(false);
    setPayAmount(total);
    setPayModal(true);
  };

  const submitPayment = (skip: boolean) => {
    if (selected && !skip && payAmount > 0) {
      appStore.addPayment(
        selected.contract.id,
        {
          title: `دریافت وجه سرویس ${selected.month.m} ${selected.month.y}`,
          date: todayJalali(),
          amount: payAmount,
          method: payMethod,
          ref: payRef,
          monthId: selected.month.id,
          customerName: selected.contract.manager,
          buildingName: selected.contract.building,
          regDate: todayJalali(),
        },
        selected.month.id
      );
    }
    if (selected) {
      appStore.finishActiveService(selected.contract.id, selected.month.id, technician.name);
      localStorage.removeItem(LS.activeJob);
    }
    setPayModal(false);
    notify(
      isOffline
        ? skip
          ? "سرویس به‌صورت آفلاین ثبت شد (در صف همگام‌سازی)"
          : "سرویس و دریافت وجه به‌صورت آفلاین ثبت شد"
        : skip
        ? "سرویس ثبت و همگام‌سازی ابری انجام شد"
        : "سرویس و دریافت وجه ثبت و همگام‌سازی شد"
    );
    resetWork();
    setSelected(null);
    setScreen("home");
  };

  /* ----------------------------- voice input ------------------------------ */
  const [listening, setListening] = useState<string | null>(null);
  const recRef = useRef<any>(null);
  const voice = (field: "report" | "reminder" | "followup") => {
    const W = window as any;
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) return notify("مرورگر شما از ورودی صوتی پشتیبانی نمی‌کند");
    if (listening) {
      recRef.current?.stop();
      setListening(null);
      return;
    }
    const r = new SR();
    r.lang = "fa-IR";
    r.interimResults = false;
    r.onresult = (e: any) => {
      const txt = Array.from(e.results).map((x: any) => x[0].transcript).join(" ");
      const setter = field === "report" ? setReport : field === "reminder" ? setReminder : setFollowup;
      setter((p) => (p ? p + " " + txt : txt));
    };
    r.onend = () => setListening(null);
    r.onerror = () => setListening(null);
    recRef.current = r;
    r.start();
    setListening(field);
  };

  /* ------------------------------ signature ------------------------------- */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const pos = (e: any) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: ((p.clientX - r.left) * c.width) / r.width, y: ((p.clientY - r.top) * c.height) / r.height };
  };
  const sigStart = (e: any) => {
    if (signed) return;
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const sigMove = (e: any) => {
    if (!drawing.current || signed) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111";
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const sigEnd = () => (drawing.current = false);
  const sigClear = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setSigned(false);
  };

  /* -------------------------------- photos -------------------------------- */
  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((f) => {
      const rd = new FileReader();
      rd.onload = () => setPhotos((p) => [...p, String(rd.result)]);
      rd.readAsDataURL(f);
    });
  };

  /* ---------------------------------------------------------------------- */
  /*                                  views                                  */
  /* ---------------------------------------------------------------------- */

  const header = (title?: string, back?: () => void) => (
    <div className="flex flex-col bg-white shadow-sm border-b">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {back ? (
            <button type="button" onClick={back} className="rounded-full p-2 hover:bg-gray-100">
              <ChevronRight size={22} className="text-gray-700" />
            </button>
          ) : (
            <button type="button" onClick={() => setDrawer(true)} className="rounded-full p-2 hover:bg-gray-100">
              <Menu size={22} className="text-gray-700" />
            </button>
          )}
          <div className="truncate text-[13.5px] font-bold text-gray-800">{title || "تلیفت همراه"}</div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* دکمه همگام‌سازی همراه با کلید سه‌گوش مدت زمان در موبایل */}
          <SyncIndicator variant="mobile" onShowToast={notify} />

          {/* دکمه آپدیت و دریافت آخرین تغییرات */}
          <button
            type="button"
            onClick={handleAppUpdate}
            disabled={updatingApp}
            title={`بروزرسانی نرم‌افزار به آخرین نسخه (v${APP_VERSION})`}
            className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1.5 text-[11px] font-bold text-blue-700 border border-blue-300 hover:bg-blue-100 active:bg-blue-200 shadow-sm transition disabled:opacity-60"
          >
            <RefreshCw size={13} className={updatingApp ? "animate-spin" : ""} />
            <span className="hidden sm:inline">آپدیت</span>
          </button>

          {/* دکمه راهنما و نصب نسخه اندروید روی گوشی */}
          <button
            type="button"
            onClick={() => setAndroidModal(true)}
            title="دانلود فایل نصبی APK یا نصب نسخه اندروید"
            className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1.5 text-[11px] font-bold text-emerald-700 border border-emerald-300 hover:bg-emerald-100 active:bg-emerald-200 shadow-sm"
          >
            <Smartphone size={13} />
            <span className="hidden sm:inline">نصب APK</span>
          </button>

          {/* دکمه شروع کار */}
          <button
            type="button"
            onClick={toggleDay}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-bold text-white shadow-sm ${
              dayStart ? "bg-blue-600" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {dayStart ? (
              <>
                <Square size={12} fill="white" /> {fmtDur(daySec)}
              </>
            ) : (
              <>
                <Play size={12} fill="white" /> شروع کار
              </>
            )}
          </button>
        </div>
      </div>

      {/* بنر وضعیت آفلاین و صف سرویس‌ها */}
      {isOffline && (
        <div className="flex items-center justify-between bg-amber-50 px-3 py-1.5 text-[11px] text-amber-900 border-t border-amber-200">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-ping shrink-0" />
            <span>
              {sync.offlineServicesCount > 0
                ? `حالت آفلاین: ${fa(sync.offlineServicesCount)} سرویس در صف ذخیره محلی آماده ارسال است`
                : "اینترنت قطع است (گزینه آفلاین فعال) — می‌توانید سرویس را ثبت کنید"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleManualSync}
            className="rounded bg-amber-600 px-2 py-0.5 text-[10.5px] font-bold text-white active:bg-amber-700 shrink-0"
          >
            ارسال و آپدیت
          </button>
        </div>
      )}
    </div>
  );

  const jobCard = (j: Job) => {
    const activeAssignment = activeServiceAssignments.find(
      (item) => item.contractId === j.contract.id && item.monthId === j.month.id
    );
    return (
    <button
      key={`${j.contract.id}-${j.month.id}`}
      type="button"
      onClick={() => {
        setSelected(j);
        setScreen("job");
      }}
      className="flex w-full items-center gap-3 border-b bg-white px-3 py-3 text-right active:bg-gray-50"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        <Building2 size={26} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-bold text-gray-800">
          {j.contract.building.replace(/^\*\s*/, "")} دستگاه 1 ({j.contract.no})
        </div>
        <div className="truncate text-[11.5px] text-gray-500">{j.contract.address || "قزوین"}</div>
        <div className="mt-1 flex items-center gap-2 text-[11px]">
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
            سرویس {j.month.m} {j.month.y}
          </span>
          {j.month.done ? (
            <span className="rounded-full border border-emerald-400 bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
              ✓ انجام شد توسط {j.month.doneBy || j.month.techs?.[0] || "سرویس‌کار"}
            </span>
          ) : activeAssignment ? (
            <span className="rounded bg-blue-100 px-1.5 py-0.5 font-bold text-blue-700">
              در حال انجام توسط {activeAssignment.technicianName}
            </span>
          ) : (
            <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-600">انجام‌نشده</span>
          )}
        </div>
      </div>
      <ChevronLeft size={18} className="text-gray-400" />
    </button>
    );
  };

  const renderHomeView = () => (
    <>
      {header()}
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
        {[
          { l: "لیست خرابی", i: AlertTriangle, c: "text-red-500", badge: 1, go: () => setScreen("services") },
          { l: "ثبت خرابی", i: Plus, c: "text-orange-500", go: () => notify("فرم ثبت خرابی") },
          { l: "ثبت سرویس", i: Wrench, c: "text-blue-600", go: () => setScreen("services") },
          { l: "ثبت سرویس آفلاین", i: CloudOff, c: "text-amber-600", go: () => setScreen("offlineService") },
          { l: "صف سرویس‌های آفلاین", i: Cloud, c: "text-emerald-600", badge: offlineDrafts.length || undefined, go: () => setScreen("offlineQueue") },
        ].map((b) => (
          <button
            key={b.l}
            type="button"
            onClick={b.go}
            className="relative flex flex-col items-center gap-1 rounded-xl bg-white py-3 shadow-sm active:bg-gray-50"
          >
            <b.i size={24} className={b.c} />
            <span className="text-[12px] text-gray-700">{b.l}</span>
            {b.badge ? (
              <span className="absolute right-2 top-2 rounded-full bg-red-500 px-1.5 text-[10px] text-white">
                {fa(b.badge)}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="mx-3 rounded-xl border border-dashed border-gray-300 bg-white p-3 text-center text-[12.5px] text-gray-500">
        {jobStart && selected ? (
          <button type="button" onClick={() => setScreen("work")} className="w-full text-right">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-600">کار جاری: {selected.contract.building}</span>
              <span className="rounded bg-blue-600 px-2 py-0.5 font-mono text-white">{fmtDur(jobSec)}</span>
            </div>
          </button>
        ) : (
          "کار فعالی ندارید"
        )}
      </div>

      <div className="mt-3 flex items-center justify-between px-3 text-[12.5px] font-bold text-gray-700">
        <span>کارهای امروز ({fa(todayJobs.length)})</span>
        <span className="text-[11px] font-normal text-gray-400">{todayJalali()}</span>
      </div>
      <div className="mt-1 bg-white">{todayJobs.map(jobCard)}</div>
      {todayJobs.length === 0 && <div className="py-6 text-center text-[12px] text-gray-400">کاری برای امروز نیست</div>}

      <div className="mt-3 px-3 text-[12.5px] font-bold text-gray-700">کارهای تاریخ گذشته ({fa(pastJobs.length)})</div>
      <div className="mt-1 bg-white">{pastJobs.map((j) => jobCard(j))}</div>
      <div className="h-16" />
    </>
  );

  const renderJobView = () => {
    if (!selected) return null;
    const c = selected.contract;
    const details = appStore.getContractDetails(c.id);
    const debt = details.months.filter((m) => m.done && !m.paid).reduce((s, m) => s + m.amount, 0);
    const round = (Icon: any, label: string, cls: string, run: () => void, big = false) => (
      <button type="button" onClick={run} className="flex flex-col items-center gap-1">
        <span
          className={`flex items-center justify-center rounded-full text-white shadow-md ${cls} ${
            big ? "h-16 w-16" : "h-12 w-12"
          }`}
        >
          <Icon size={big ? 30 : 20} />
        </span>
        <span className="text-[10.5px] text-gray-600">{label}</span>
      </button>
    );
    return (
      <>
        {header(`قرارداد ${c.no}`, () => setScreen("home"))}
        <div className="relative h-44 w-full overflow-hidden bg-[linear-gradient(90deg,#e5e7eb_1px,transparent_1px),linear-gradient(#e5e7eb_1px,transparent_1px)] bg-[size:24px_24px] bg-gray-100">
          <MapPin size={36} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full text-red-600 drop-shadow" />
          <span className="absolute bottom-1 left-2 text-[10px] text-gray-400">نقشه موقعیت ساختمان</span>
        </div>
        <div className="-mt-7 flex items-end justify-around px-2">
          {round(ImageIcon, "تصاویر", "bg-gray-500", () => notify("گالری تصاویر دستگاه"))}
          {round(Phone, "تماس", "bg-sky-600", () => {
            const phone = c.coordinatorPhone || c.phone;
            if (phone) window.location.href = `tel:${phone}`;
            else notify("شماره مسئول هماهنگی ثبت نشده است");
          })}
          {round(Play, "شروع سرویس", "bg-emerald-600", () => startService(selected), true)}
          {round(Navigation, "مسیریابی", "bg-violet-600", () =>
            window.open(`https://www.google.com/maps/search/${encodeURIComponent(c.address || c.building)}`, "_blank")
          )}
          {round(Truck, "ایاب و ذهاب", "bg-orange-500", () => notify("ایاب و ذهاب ثبت شد"))}
        </div>

        <div className="mx-3 mt-4 rounded-xl bg-violet-600 p-3 text-[12.5px] leading-6 text-white">
          <div className="mb-1 font-bold">{c.building.replace(/^\*\s*/, "")}</div>
          {c.address || "قزوین"} {c.locationStatus ? `— ${c.locationStatus}` : ""}
        </div>

        <div className="grid grid-cols-3 gap-2 p-3">
          {[
            { l: "ثبت موقعیت", i: MapPin, run: () => registerContractPosition(c) },
            { l: "اطلاعات دستگاه", i: Info, run: () => notify("آسانسور کششی ۶ توقف - ۶۳۰ کیلوگرم") },
            { l: "نماینده‌ها", i: Users, run: () => notify(`${c.manager}${c.coordinator ? " / " + c.coordinator : ""}`) },
          ].map((b) => (
            <button key={b.l} type="button" onClick={b.run} className="flex flex-col items-center gap-1 rounded-xl bg-white py-3 shadow-sm">
              <b.i size={20} className="text-violet-600" />
              <span className="text-[11.5px] text-gray-700">{b.l}</span>
            </button>
          ))}
        </div>

        <div className="mx-3 mb-20 overflow-hidden rounded-xl bg-white shadow-sm">
          {[
            ["شناسه سرویس", `#${selected.month.id}`],
            ["شماره قرارداد", c.no],
            ["دوره سرویس", `${selected.month.m} ${selected.month.y}`],
            ["تاریخ شروع قرارداد", c.start],
            ["تاریخ پایان قرارداد", c.end],
            ["مدیر / نماینده", c.manager],
            ["تلفن", c.phone || "-"],
            ["بدهی مشتری", `${fa(debt)} ریال`],
            ["مبلغ ماهیانه", `${fa(selected.month.amount)} ریال`],
            ["پیوست‌ها", "—"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between border-b px-3 py-2.5 text-[12.5px] last:border-0">
              <span className="text-gray-500">{k}</span>
              <span className="font-medium text-gray-800">{v}</span>
            </div>
          ))}
        </div>
      </>
    );
  };

  const timerBar = () => (
    <div className="flex items-center justify-between bg-blue-600 px-3 py-2 text-white">
      <span className="text-[12px]">{selected?.contract.building.replace(/^\*\s*/, "")}</span>
      <span className="flex items-center gap-1 font-mono text-[14px] font-bold">
        <Clock size={14} /> {fmtDur(jobSec)}
      </span>
    </div>
  );

  const renderWorkView = () => {
    const items = checklist.filter((i) => i.deviceType === "آسانسور");
    const filteredParts = parts.filter((p) => p.name.includes(partQuery) || p.code.includes(partQuery));
    const doneCount = Object.keys(results).length;
    return (
      <>
        {header("انجام سرویس", () => setScreen("job"))}
        {timerBar()}
        <div className="flex bg-white text-[12.5px]">
          {[
            ["checklist", "چک‌لیست", ClipboardCheck],
            ["parts", "قطعات", Package],
            ["faults", "خرابی‌ها", AlertTriangle],
          ].map(([k, l, I]: any) => (
            <button
              key={k}
              type="button"
              onClick={() => setWorkTab(k)}
              className={`flex flex-1 items-center justify-center gap-1 border-b-2 py-2.5 ${
                workTab === k ? "border-blue-600 font-bold text-blue-600" : "border-transparent text-gray-500"
              }`}
            >
              <I size={15} /> {l}
              {k === "checklist" && <span className="text-[10px]">({fa(doneCount)}/{fa(items.length)})</span>}
              {k === "parts" && usedParts.length > 0 && <span className="text-[10px]">({fa(usedParts.length)})</span>}
              {k === "faults" && faults.length > 0 && <span className="text-[10px]">({fa(faults.length)})</span>}
            </button>
          ))}
        </div>

        <div className="pb-20">
          {workTab === "checklist" &&
            categories.map((cat) => {
              const rows = items.filter((i) => i.category === cat);
              if (!rows.length) return null;
              return (
                <div key={cat} className="mt-2 bg-white">
                  <div className="flex items-center justify-between bg-gray-100 px-3 py-1.5 text-[12px] font-bold text-gray-700">
                    <span>{cat}</span>
                    <button type="button" title={`ثبت همه موارد ${cat} به‌عنوان سالم`} onClick={() => setResults((previous) => {
                      const next = { ...previous };
                      rows.forEach((row) => { next[row.id] = "ok"; });
                      return next;
                    })} className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${rows.every((row) => results[row.id] === "ok") ? "border-emerald-600 bg-emerald-600 text-white" : "border-emerald-500 bg-white text-emerald-600"}`}>
                      <Check size={16} strokeWidth={3} />
                    </button>
                  </div>
                  {rows.map((r) => (
                    <div key={r.id} className="border-b px-3 py-2.5">
                      <div className="text-[12.5px] leading-5 text-gray-800">{r.question}</div>
                      <div className="mt-1.5 flex items-center gap-3">
                        {(["ok", "fault"] as ServiceChecklistStatus[]).map((s) => (
                          <label key={s} className="flex items-center gap-1 text-[12px]">
                            <input
                              type="radio"
                              name={`q${r.id}`}
                              checked={results[r.id] === s}
                              onChange={() => setResults((p) => ({ ...p, [r.id]: s }))}
                              className={s === "ok" ? "accent-emerald-600" : "accent-red-600"}
                            />
                            <span className={s === "ok" ? "text-emerald-700" : "text-red-600"}>
                              {s === "ok" ? "سالم" : "ناسالم"}
                            </span>
                          </label>
                        ))}
                        <input
                          value={notes[r.id] || ""}
                          onChange={(e) => setNotes((p) => ({ ...p, [r.id]: e.target.value }))}
                          placeholder="توضیحات"
                          className="ml-auto w-32 rounded border px-2 py-1 text-[11px] outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

          {workTab === "parts" && (
            <div className="p-3">
              <button
                type="button"
                onClick={() => setPartPicker(true)}
                className="w-full rounded-lg bg-blue-600 py-2.5 text-[13px] font-bold text-white"
              >
                + انتخاب قطعه
              </button>
              <div className="mt-3 overflow-hidden rounded-xl bg-white shadow-sm">
                {usedParts.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 border-b px-3 py-2 text-[12.5px]">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{p.name}</div>
                      <div className="text-[11px] text-gray-500">{fa(p.price)} ریال / {p.unit}</div>
                    </div>
                    <NumberStepper
                      value={p.qty}
                      min={1}
                      ariaLabel={`تعداد ${p.name}`}
                      onChange={(qty) => setUsedParts((list) => list.map((item, index) => index === i ? { ...item, qty } : item))}
                      className="w-36"
                    />
                    <button type="button" onClick={() => setUsedParts((l) => l.filter((_, k) => k !== i))}>
                      <X size={16} className="text-red-500" />
                    </button>
                  </div>
                ))}
                {usedParts.length === 0 && <div className="py-6 text-center text-[12px] text-gray-400">قطعه‌ای ثبت نشده</div>}
                {usedParts.length > 0 && (
                  <div className="flex justify-between bg-gray-50 px-3 py-2 text-[12.5px] font-bold">
                    <span>جمع قطعات</span>
                    <span>{fa(partsTotal)} ریال</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {workTab === "faults" && (
            <div className="p-3">
              <div className="flex gap-2">
                <input
                  value={newFault}
                  onChange={(e) => setNewFault(e.target.value)}
                  placeholder="شرح خرابی جدید..."
                  className="flex-1 rounded-lg border bg-white px-3 py-2 text-[12.5px] outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newFault.trim()) return;
                    setFaults((f) => [...f, { text: newFault.trim(), fixed: false }]);
                    setNewFault("");
                  }}
                  className="rounded-lg bg-red-600 px-3 text-white"
                >
                  ثبت
                </button>
              </div>
              <div className="mt-3 overflow-hidden rounded-xl bg-white shadow-sm">
                {faults.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 border-b px-3 py-2.5 text-[12.5px]">
                    <AlertTriangle size={16} className={f.fixed ? "text-emerald-500" : "text-red-500"} />
                    <span className={`flex-1 ${f.fixed ? "text-gray-400 line-through" : "text-gray-800"}`}>{f.text}</span>
                    <button
                      type="button"
                      onClick={() => setFaults((l) => l.map((x, k) => (k === i ? { ...x, fixed: !x.fixed } : x)))}
                      className={`rounded px-2 py-1 text-[11px] text-white ${f.fixed ? "bg-gray-400" : "bg-emerald-600"}`}
                    >
                      {f.fixed ? "بازگشت" : "رفع شد"}
                    </button>
                  </div>
                ))}
                {faults.length === 0 && <div className="py-6 text-center text-[12px] text-gray-400">خرابی ثبت نشده</div>}
              </div>
            </div>
          )}
        </div>

        {stepNav(() => setScreen("job"), () => setScreen("report"))}

        {partPicker && (
          <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={() => setPartPicker(false)}>
            <div className="max-h-[75vh] w-full overflow-auto rounded-t-2xl bg-white p-3" onClick={(e) => e.stopPropagation()}>
              <div className="mb-2 flex items-center gap-2 rounded-lg border px-2">
                <Search size={14} className="text-gray-400" />
                <input
                  autoFocus
                  value={partQuery}
                  onChange={(e) => setPartQuery(e.target.value)}
                  placeholder="جستجوی قطعه..."
                  className="w-full py-2 text-[13px] outline-none"
                />
              </div>
              {filteredParts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setUsedParts((l) => [...l, { code: p.code, name: p.name, unit: p.unit, qty: 1, price: p.price }]);
                    setPartPicker(false);
                    setPartQuery("");
                  }}
                  className="flex w-full items-center justify-between border-b py-2.5 text-right text-[12.5px]"
                >
                  <span className="text-gray-800">{p.name}</span>
                  <span className="text-gray-500">{fa(p.price)} ریال</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  const voiceField = (
    id: "report" | "reminder" | "followup",
    label: string,
    value: string,
    set: (v: string) => void
  ) => (
    <div key={id} className="mt-3">
      <div className="mb-1 flex items-center justify-between text-[12px] text-gray-600">
        <span>{label}</span>
        <button
          type="button"
          onClick={() => voice(id)}
          className={`rounded-full p-1.5 ${listening === id ? "animate-pulse bg-red-500 text-white" : "bg-gray-100 text-gray-600"}`}
        >
          {listening === id ? <MicOff size={14} /> : <Mic size={14} />}
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => set(e.target.value)}
        rows={3}
        className="w-full rounded-lg border bg-white p-2 text-[12.5px] outline-none"
      />
    </div>
  );

  const renderReportView = () => (
    <>
      {header("گزارش سرویس", () => setScreen("work"))}
      {timerBar()}
      <div className="p-3 pb-20">
        <div className="flex items-center justify-between rounded-xl bg-blue-50 p-3 text-[12.5px] text-blue-800">
          <span>زمان صرف شده: <b className="font-mono">{fmtDur(jobSec)}</b></span>
          <span className="flex items-center gap-1"><Clock size={13} /> شروع از ساعت {jobStartClock}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            ["اجرت (ریال)", wage, setWage],
            ["ایاب و ذهاب (ریال)", trip, setTrip],
          ].map(([l, v, s]: any) => (
            <label key={l} className="text-[12px] text-gray-600">
              {l}
              <input
                type="number"
                value={v || ""}
                onChange={(e) => s(Number(e.target.value) || 0)}
                className="mt-1 w-full rounded-lg border bg-white px-2 py-2 text-[13px] outline-none"
              />
            </label>
          ))}
        </div>
        {voiceField("report", "گزارش سرویس", report, setReport)}
        {voiceField("reminder", "یادآوری سرویس بعدی", reminder, setReminder)}
        {voiceField("followup", "پیگیری بعدی مشتری", followup, setFollowup)}

        <div className="mt-3">
          <div className="mb-1 text-[12px] text-gray-600">تصاویر</div>
          <div className="flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border">
                <img src={p} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((l) => l.filter((_, k) => k !== i))}
                  className="absolute right-0 top-0 rounded-bl bg-red-600 p-0.5 text-white"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-400">
              <Camera size={20} />
              <span className="text-[10px]">افزودن</span>
              <input type="file" accept="image/*" capture="environment" multiple onChange={onPhoto} className="hidden" />
            </label>
          </div>
        </div>
      </div>
      {stepNav(() => setScreen("work"), () => setScreen("sign"))}
    </>
  );

  const renderSignView = () => (
    <>
      {header("امضا و اتمام", () => setScreen("report"))}
      {timerBar()}
      <div className="p-3 pb-24">
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          {[
            ["مبلغ سرویس دوره", `${fa(selected?.month.amount || 0)} ریال`],
            ["قطعات", `${fa(partsTotal)} ریال`],
            ["اجرت", `${fa(wage)} ریال`],
            ["ایاب و ذهاب", `${fa(trip)} ریال`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between border-b px-3 py-2 text-[12.5px]">
              <span className="text-gray-500">{k}</span>
              <span>{v}</span>
            </div>
          ))}
          <div className="flex justify-between bg-emerald-50 px-3 py-2.5 text-[13px] font-bold text-emerald-800">
            <span>جمع قابل پرداخت</span>
            <span>{fa(total)} ریال</span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-4 rounded-xl bg-white p-3 text-[12.5px]">
          {[
            [true, "حضور مدیر"],
            [false, "عدم حضور مدیر"],
          ].map(([v, l]: any) => (
            <label key={l} className="flex items-center gap-1">
              <input type="radio" checked={managerPresent === v} onChange={() => setManagerPresent(v)} className="accent-blue-600" />
              {l}
            </label>
          ))}
          <span className="mr-auto text-gray-500">{selected?.contract.manager}</span>
        </div>

        {managerPresent && (
          <div className="mt-3">
            <div className="mb-1 rounded bg-red-50 px-2 py-1.5 text-[11px] text-red-600">
              در صورت دریافت امضا امکان ویرایش اطلاعات وجود ندارد، لطفاً تغییرات را قبل از امضا اعمال کنید.
            </div>
            <canvas
              ref={canvasRef}
              width={600}
              height={260}
              onMouseDown={sigStart}
              onMouseMove={sigMove}
              onMouseUp={sigEnd}
              onMouseLeave={sigEnd}
              onTouchStart={sigStart}
              onTouchMove={sigMove}
              onTouchEnd={sigEnd}
              className={`h-40 w-full touch-none rounded-xl border-2 bg-white ${signed ? "border-emerald-500" : "border-dashed border-gray-300"}`}
            />
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={sigClear} className="flex flex-1 items-center justify-center gap-1 rounded-lg border bg-white py-2 text-[12.5px]">
                <Eraser size={14} /> پاک کردن
              </button>
              <button
                type="button"
                onClick={() => {
                  setSigned(true);
                  notify("امضا ثبت شد");
                }}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-blue-600 py-2 text-[12.5px] text-white"
              >
                <Check size={14} /> ثبت امضا
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-[480px] p-3 bg-white/95 backdrop-blur-sm border-t">
        {isOffline && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-[11.5px] text-amber-800">
            <div className="flex items-center gap-1.5">
              <CloudOff size={14} className="text-amber-600 shrink-0" />
              <span>اینترنت قطع است؛ سرویس به‌صورت آفلاین در صف دستگاه ثبت می‌شود</span>
            </div>
            <span className="rounded bg-amber-200 px-1.5 py-0.5 font-bold text-amber-900 text-[10px] shrink-0">
              ثبت آفلاین
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={() => finishService()}
          disabled={managerPresent && !signed}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-[14px] font-bold text-white shadow-lg disabled:opacity-40"
        >
          <Save size={16} /> {isOffline ? "ثبت آفلاین و اتمام سرویس" : "ثبت و اتمام سرویس"}
        </button>
      </div>
    </>
  );

  const stepNav = (prev: () => void, next: () => void) => (
    <div className="fixed inset-x-0 bottom-0 mx-auto flex max-w-[480px] gap-2 bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,.06)]">
      <button type="button" onClick={prev} className="flex flex-1 items-center justify-center gap-1 rounded-xl border py-2.5 text-[13px]">
        <ChevronRight size={16} /> مرحله قبل
      </button>
      <button type="button" onClick={next} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-blue-600 py-2.5 text-[13px] font-bold text-white">
        مرحله بعد <ChevronLeft size={16} />
      </button>
    </div>
  );

  const attachOfflineDraft = (draft: OfflineServiceDraft) => {
    if (!navigator.onLine) return notify("برای انتقال این سرویس ابتدا به اینترنت متصل شوید");
    const mapping = draftMappings[draft.id];
    if (!mapping) return notify("قرارداد یا سرویس مقصد را انتخاب کنید");
    const [contractId, monthId] = mapping.split(":").map(Number);
    const target = jobs.find((job) => job.contract.id === contractId && job.month.id === monthId);
    if (!target) return notify("سرویس انتخاب‌شده پیدا نشد");

    const partsTotal = draft.partsList.reduce((sum, part) => sum + part.qty * part.price, 0);
    appStore.addServiceSubmission(contractId, monthId, {
      techs: [technician.name],
      doneBy: technician.name,
      doneDate: draft.doneDate,
      inTime: draft.inTime,
      outTime: draft.outTime,
      report: draft.report,
      reminder: draft.reminder,
      total: target.month.amount + partsTotal + draft.wage + draft.trip,
      parts: partsTotal,
      wage: draft.wage,
      trip: draft.trip,
      discount: 0,
      faults: draft.faultsList.length,
      faultsList: draft.faultsList,
      partsList: draft.partsList,
    });
    appStore.updateMonthService(contractId, monthId, {
      checklistResults: draft.checklistResults,
      customerFollowup: draft.followup,
      attachments: draft.attachments,
      serviceDurationReason: draft.serviceDurationReason,
    });
    saveOfflineDrafts(offlineDrafts.filter((item) => item.id !== draft.id));
    setDraftMappings((current) => {
      const next = { ...current };
      delete next[draft.id];
      return next;
    });
    syncNow();
    notify(`سرویس آفلاین به «${target.contract.building.replace(/^\*\s*/, "")}» منتقل شد`);
  };

  const renderOfflineServiceView = () => (
    <>
      {header("ثبت سرویس آفلاین", () => setScreen("home"))}
      <div className="m-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-2 text-[13px] font-bold text-amber-900">
          <CloudOff size={19} /> شروع سرویس بدون اینترنت
        </div>
        <p className="mt-1 text-[11px] leading-5 text-amber-800">
          فقط نام مشتری یا ساختمان را وارد کنید. تمام گزارش، چک‌لیست، قطعات و خرابی‌ها روی همین گوشی ذخیره می‌شود.
        </p>
        <input
          value={offlineCustomerName}
          onChange={(event) => setOfflineCustomerName(event.target.value)}
          placeholder="نام مشتری یا ساختمان..."
          className="mt-3 w-full rounded-xl border border-amber-200 bg-white px-3 py-3 text-[12px] outline-none focus:border-amber-500"
        />
        <button type="button" onClick={startOfflineService} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-3 text-[13px] font-bold text-white">
          <Play size={15} fill="white" /> شروع ثبت آفلاین
        </button>
      </div>
      <div className="mx-3 rounded-xl border border-dashed border-amber-300 bg-white p-3 text-center text-[11px] text-gray-500">
        برای اتصال سرویس‌های ثبت‌شده به قراردادها، از گزینه جداگانه «صف سرویس‌های آفلاین» در صفحه اول استفاده کنید.
      </div>
      <div className="h-20" />
    </>
  );

  const renderOfflineQueueView = () => (
    <>
      {header("صف و تخصیص سرویس‌های آفلاین", () => setScreen("home"))}
      <div className="m-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-[11.5px] leading-5 text-blue-900">
        هر سرویس آفلاین را بازبینی کنید، قرارداد و ماه سرویس مقصد را انتخاب کنید و سپس آن را آنلاین ثبت نمایید.
      </div>
      <div className="mx-3 mb-2 flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-gray-800">سرویس‌های منتظر تخصیص</h3>
        <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">{fa(offlineDrafts.length)} مورد</span>
      </div>
      <div className="mx-3 space-y-2 pb-20">
        {offlineDrafts.map((draft) => (
          <div key={draft.id} className="rounded-xl border bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[13px] font-bold text-gray-800">{draft.customerName}</div>
                <div className="mt-1 text-[10.5px] text-gray-500">{draft.doneDate} · {draft.inTime} تا {draft.outTime}</div>
              </div>
              <span className={`rounded-full px-2 py-1 text-[9.5px] font-bold ${navigator.onLine ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                {navigator.onLine ? "آماده انتقال" : "منتظر اینترنت"}
              </span>
            </div>
            <label className="mt-3 block text-[10.5px] text-gray-500">این گزارش متعلق به کدام سرویس است؟</label>
            <select
              value={draftMappings[draft.id] || ""}
              onChange={(event) => setDraftMappings((current) => ({ ...current, [draft.id]: event.target.value }))}
              className="mt-1 w-full rounded-lg border bg-white p-2.5 text-[11px] outline-none focus:border-blue-400"
            >
              <option value="">انتخاب مشتری و سرویس مقصد...</option>
              {jobs.map((job) => (
                <option key={`${job.contract.id}:${job.month.id}`} value={`${job.contract.id}:${job.month.id}`}>
                  {job.contract.building.replace(/^\*\s*/, "")} — {job.month.m} {job.month.y} — قرارداد {job.contract.no}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => attachOfflineDraft(draft)}
              disabled={!navigator.onLine || !draftMappings[draft.id]}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 text-[12px] font-bold text-white disabled:bg-gray-300"
            >
              <Cloud size={15} /> اتصال به سرویس و ثبت آنلاین
            </button>
          </div>
        ))}
        {offlineDrafts.length === 0 && <div className="rounded-xl border border-dashed bg-white py-10 text-center text-[12px] text-gray-400">سرویس آفلاینی در صف نیست</div>}
      </div>
    </>
  );

  const simpleList = (title: string, list: Job[]) => (
    <>
      {header(title)}
      <div className="mt-2 bg-white">{list.map((j) => jobCard(j))}</div>
      {list.length === 0 && <div className="py-10 text-center text-[12px] text-gray-400">موردی نیست</div>}
      <div className="h-16" />
    </>
  );

  const renderCalendarView = () => {
    const days = getShamsiDaysInMonth(calendarYear, calendarMonth);
    const offset = getShamsiFirstDayOfWeek(calendarYear, calendarMonth);
    const datePrefix = `${calendarYear}/${String(calendarMonth).padStart(2, "0")}/`;
    const jobsByDate = new Map<string, Job[]>();
    jobs.forEach((job) => {
      const date = jobDate(job);
      jobsByDate.set(date, [...(jobsByDate.get(date) || []), job]);
    });
    const selectedJobs = jobsByDate.get(selectedCalendarDate) || [];
    const changeMonth = (delta: number) => {
      let month = calendarMonth + delta;
      let year = calendarYear;
      if (month > 12) { month = 1; year += 1; }
      if (month < 1) { month = 12; year -= 1; }
      setCalendarMonth(month);
      setCalendarYear(year);
      setSelectedCalendarDate(`${year}/${String(month).padStart(2, "0")}/01`);
    };

    return (
      <>
        {header("تقویم سرویس‌ها")}
        <div className="m-3 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
          <div className="flex items-center justify-between bg-gradient-to-l from-blue-600 to-sky-500 px-3 py-3 text-white">
            <button type="button" onClick={() => changeMonth(-1)} className="rounded-full bg-white/15 p-2"><ChevronRight size={18} /></button>
            <div className="text-center">
              <div className="text-[14px] font-bold">{JALALI_MONTH_NAMES[calendarMonth - 1]} {fa(calendarYear)}</div>
              <div className="mt-0.5 text-[10px] text-blue-100">روزهای رنگی دارای سرویس هستند</div>
            </div>
            <button type="button" onClick={() => changeMonth(1)} className="rounded-full bg-white/15 p-2"><ChevronLeft size={18} /></button>
          </div>
          <div className="grid grid-cols-7 bg-blue-50 py-2 text-center text-[11px] font-bold text-blue-700">
            {["ش", "ی", "د", "س", "چ", "پ", "ج"].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1 p-2">
            {Array.from({ length: offset }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: days }).map((_, index) => {
              const day = index + 1;
              const date = `${datePrefix}${String(day).padStart(2, "0")}`;
              const hasJobs = jobsByDate.has(date);
              const active = selectedCalendarDate === date;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedCalendarDate(date)}
                  className={`relative flex aspect-square items-center justify-center rounded-xl text-[12px] font-semibold transition ${
                    active ? "bg-blue-100 text-blue-900 ring-2 ring-blue-500 shadow-sm" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {fa(day)}
                  {hasJobs && <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-red-500" />}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mx-3 mb-2 flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-gray-800">سرویس‌های {selectedCalendarDate.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])}</h3>
          <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] text-blue-700">{fa(selectedJobs.length)} سرویس</span>
        </div>
        <div className="mx-3 overflow-hidden rounded-xl border bg-white">
          {selectedJobs.map(jobCard)}
          {selectedJobs.length === 0 && <div className="p-8 text-center text-[12px] text-gray-400">برای این روز سرویسی برنامه‌ریزی نشده است</div>}
        </div>
        <div className="h-20" />
      </>
    );
  };

  const renderServicesView = () => {
    const query = serviceQuery.trim().toLowerCase();
    const filtered = jobs.filter((job) =>
      !query ||
      job.contract.building.toLowerCase().includes(query) ||
      job.contract.manager.toLowerCase().includes(query) ||
      String(job.contract.no).includes(query) ||
      (job.contract.address || "").toLowerCase().includes(query)
    );
    return (
      <>
        {header("انتخاب سرویس")}
        <div className="sticky top-0 z-10 border-b bg-gray-50/95 p-3 backdrop-blur-sm">
          <div className="relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={serviceQuery}
              onChange={(event) => setServiceQuery(event.target.value)}
              placeholder="جستجو با نام ساختمان، مشتری یا شماره قرارداد..."
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pr-10 pl-3 text-[12px] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="mt-2 text-[10.5px] text-gray-500">ابتدا سرویس را انتخاب کنید؛ سپس در صفحه جزئیات «شروع سرویس» را بزنید.</div>
        </div>
        <div className="mt-2 bg-white">{filtered.map(jobCard)}</div>
        {filtered.length === 0 && <div className="py-12 text-center text-[12px] text-gray-400">سرویسی با این مشخصات پیدا نشد</div>}
        <div className="h-20" />
      </>
    );
  };

  const renderBottomNav = () => (
    <div className="fixed inset-x-0 bottom-0 mx-auto flex max-w-[480px] justify-around border-t bg-white py-1.5">
      {[
        ["home", "خانه", Home],
        ["map", "نقشه", MapIcon],
        ["calendar", "تقویم", CalendarDays],
        ["services", "سرویس‌ها", Briefcase],
      ].map(([k, l, I]: any) => (
        <button
          key={k}
          type="button"
          onClick={() => setScreen(k)}
          className={`flex flex-col items-center gap-0.5 px-3 text-[10.5px] ${screen === k ? "text-blue-600" : "text-gray-500"}`}
        >
          <I size={20} /> {l}
        </button>
      ))}
    </div>
  );

  /* ------------------------------- drawer -------------------------------- */
  const stats = useMemo(() => {
    let done = 0;
    let faultsDone = 0;
    contracts.forEach((c) => {
      const d = appStore.getContractDetails(c.id);
      done += d.months.filter((m) => m.done).length;
      faultsDone += (d.breakdowns || []).filter((b) => b.status === "انجام شده").length;
    });
    return { done, faultsDone };
  }, [contracts, screen]);

  const renderDrawer = () =>
    drawer ? (
      <div className="fixed inset-0 z-50 flex bg-black/50" onClick={() => setDrawer(false)}>
        <div className="h-full w-72 overflow-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="bg-blue-600 p-4 text-white">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-xl font-bold">
              {technician.name.slice(0, 1)}
            </div>
            <div className="mt-2 text-[14px] font-bold">{technician.name}</div>
            <div className="text-[11px] opacity-80">کد {technician.code || "6393"} · {technician.phone}</div>
            <span className="mt-2 inline-block rounded bg-white/20 px-2 py-0.5 text-[11px]">
              🏢 {technician.company || "شرکت آسمان‌سرا"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3">
            {[
              ["ساعت کار امروز", fmtDur(daySec)],
              [`ساعت کار ${currentMonthInfo.monthName}`, formatDurationPersian(currentMonthSec)],
              ["سرویس‌های این ماه", fa(stats.done)],
              ["خرابی‌های این ماه", fa(stats.faultsDone)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-gray-50 p-2 text-center">
                <div className="text-[13.5px] font-bold text-gray-800">{v}</div>
                <div className="text-[10px] text-gray-500">{k}</div>
              </div>
            ))}
          </div>
          <div className="px-3 pb-2 text-[10.5px] text-gray-400 text-center">
            (محاسبه ساعت کار ماه از اول {currentMonthInfo.monthName} شروع از صفر)
          </div>
          {[
            [
              RefreshCw,
              `بروزرسانی نرم‌افزار (آپدیت به نسخه ${APP_VERSION})`,
              async () => {
                setDrawer(false);
                await handleAppUpdate();
              },
            ],
            [
              Smartphone,
              "دانلود مستقیم فایل نصبی اندروید (Telift.apk)",
              () => {
                setDrawer(false);
                setAndroidModal(true);
              },
            ],
            [FileBarChart2, "گزارشات", () => { setDrawer(false); setScreen("services"); }],
            [RefreshCw, sync.status === "online" ? "همگام‌سازی اطلاعات (متصل)" : "همگام‌سازی اطلاعات (آفلاین)", async () => {
              setDrawer(false);
              notify("در حال همگام‌سازی...");
              const ok = await syncNow();
              notify(ok ? "اطلاعات با سرور همگام شد" : "اتصال به سرور برقرار نشد؛ داده‌ها محلی ذخیره شدند");
            }],
            [Monitor, "بازگشت به نسخه دسکتاپ", () => { setDrawer(false); onExitToDesktop(); }],
            [LogOut, "خروج", onSignOut],
          ].map(([I, l, run]: any) => (
            <button key={l} type="button" onClick={run} className="flex w-full items-center gap-3 border-b px-4 py-3 text-right text-[13px] text-gray-700 hover:bg-gray-50">
              <I size={18} className="text-gray-500" /> {l}
            </button>
          ))}
        </div>
      </div>
    ) : null;

  /* ------------------------------ pay modal ------------------------------- */
  const renderDurationReviewModal = () =>
    durationReviewOpen ? (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" dir="rtl">
        <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl">
          <div className="flex items-center gap-2 text-[14px] font-bold text-amber-700">
            <Clock size={20} /> بررسی زمان طولانی سرویس
          </div>
          <p className="mt-2 rounded-lg bg-amber-50 p-2 text-[11.5px] leading-5 text-amber-900">
            مدت این سرویس از دو ساعت بیشتر شده است. اگر ساعت خروج اشتباه است آن را اصلاح کنید؛ در غیر این صورت دلیل طولانی‌شدن را بنویسید.
          </p>
          <label className="mt-3 block text-[11px] text-gray-600">ساعت خروج واقعی</label>
          <input type="time" value={correctedOutTime} onChange={(e) => setCorrectedOutTime(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" />
          <label className="mt-3 block text-[11px] text-gray-600">دلیل حضور بیش از دو ساعت</label>
          <textarea rows={3} value={durationReason} onChange={(e) => setDurationReason(e.target.value)} placeholder="مثلاً رفع خرابی پیچیده، انتظار برای قطعه یا هماهنگی با مدیر ساختمان..." className="mt-1 w-full rounded-xl border p-3 text-[12px]" />
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setDurationReviewOpen(false)} className="flex-1 rounded-xl border py-2.5 text-[12px]">بازگشت</button>
            <button type="button" onClick={() => {
              const [inH, inM] = jobStartClock.split(":").map(Number);
              const [outH, outM] = correctedOutTime.split(":").map(Number);
              const correctedMinutes = outH * 60 + outM - (inH * 60 + inM);
              if (correctedMinutes >= 120 && !durationReason.trim()) {
                notify("برای سرویس بالای دو ساعت، نوشتن دلیل الزامی است");
                return;
              }
              if (correctedMinutes < 0) {
                notify("ساعت خروج نمی‌تواند قبل از ساعت ورود باشد");
                return;
              }
              finishService(true);
            }} className="flex-1 rounded-xl bg-amber-600 py-2.5 text-[12px] font-bold text-white">تأیید و پایان سرویس</button>
          </div>
        </div>
      </div>
    ) : null;

  const renderPayModal = () =>
    payModal ? (
      <div className="fixed inset-0 z-50 flex items-end bg-black/50">
        <div className="w-full rounded-t-2xl bg-white p-4">
          <div className="mb-3 flex items-center gap-2 text-[14px] font-bold text-gray-800">
            <CreditCard size={18} className="text-emerald-600" /> دریافت وجه
          </div>
          <label className="block text-[12px] text-gray-600">
            مبلغ دریافتی (ریال)
            <input
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-lg border px-2 py-2 text-[14px] font-bold outline-none"
            />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {["کارت‌خوان سیار", "نقدی", "کارت به کارت", "چک"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPayMethod(m)}
                className={`rounded-lg border py-2 text-[12.5px] ${payMethod === m ? "border-emerald-600 bg-emerald-50 text-emerald-700" : ""}`}
              >
                {m}
              </button>
            ))}
          </div>
          <input
            value={payRef}
            onChange={(e) => setPayRef(e.target.value)}
            placeholder="شماره پیگیری / مرجع"
            className="mt-3 w-full rounded-lg border px-2 py-2 text-[12.5px] outline-none"
          />
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => submitPayment(true)} className="flex-1 rounded-xl border py-2.5 text-[13px]">
              بدون دریافت وجه
            </button>
            <button type="button" onClick={() => submitPayment(false)} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-[13px] font-bold text-white">
              ثبت پرداخت
            </button>
          </div>
        </div>
      </div>
    ) : null;

  /* -------------------------------- render -------------------------------- */
  return (
    <div dir="rtl" className="min-h-screen w-full bg-gray-200 font-[Vazirmatn,Tahoma,system-ui]">
      <div className="relative mx-auto min-h-screen max-w-[480px] bg-gray-100 shadow-xl">
        {screen === "home" && renderHomeView()}
        {screen === "job" && renderJobView()}
        {screen === "work" && renderWorkView()}
        {screen === "report" && renderReportView()}
        {screen === "sign" && renderSignView()}
        {screen === "map" && (
          <>
            {header("نقشه")}
            <div className="relative m-3 h-[70vh] overflow-hidden rounded-xl bg-[linear-gradient(90deg,#e5e7eb_1px,transparent_1px),linear-gradient(#e5e7eb_1px,transparent_1px)] bg-[size:24px_24px] bg-gray-50">
              {todayJobs.slice(0, 9).map((j, i) => (
                <button
                  key={j.contract.id}
                  type="button"
                  onClick={() => { setSelected(j); setScreen("job"); }}
                  style={{ left: `${15 + ((i * 37) % 70)}%`, top: `${15 + ((i * 53) % 70)}%` }}
                  className="absolute -translate-x-1/2 -translate-y-full"
                >
                  <MapPin size={28} className="text-red-600 drop-shadow" />
                </button>
              ))}
            </div>
          </>
        )}
        {screen === "calendar" && renderCalendarView()}
        {screen === "services" && renderServicesView()}
        {screen === "offlineService" && renderOfflineServiceView()}
        {screen === "offlineQueue" && renderOfflineQueueView()}

        {["home", "map", "calendar", "services", "offlineService", "offlineQueue"].includes(screen) && renderBottomNav()}
        {renderDrawer()}
        {renderDurationReviewModal()}
        {renderPayModal()}
        <AndroidAppModal open={androidModal} onClose={() => setAndroidModal(false)} />

        {toast && (
          <div className="fixed bottom-20 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-gray-900/90 px-4 py-2 text-[12px] text-white shadow-xl">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
