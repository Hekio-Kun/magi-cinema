import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowUpDown,
  BadgePercent,
  Banknote,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Edit3,
  Eye,
  EyeOff,
  Globe2,
  History,
  Loader2,
  Plus,
  Power,
  PowerOff,
  Search,
  ShieldCheck,
  Store,
  Tag,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { TimeRulerPicker } from "@/components/ui/TimeRulerPicker";
import {
  promotionApi,
  type BirthdayRule,
  type LeapDayPolicy,
  type PaymentMethod,
  type BookingChannel,
  type PromotionAnalytics,
  type PromotionDiscountType,
  type PromotionRequest,
  type PromotionResponse,
  type PromotionStatus,
  type PromotionType,
  type PromotionUsage,
} from "@/api/promotionApi";
import { membershipApi, type MembershipPlan } from "@/api/membershipApi";

type ApiError = { response?: { data?: { message?: string } }; message?: string };
type PromotionStep = 1 | 2 | 3 | 4 | 5;
type FormErrors = Record<string, string>;
type PromotionSort = "NEWEST" | "OLDEST" | "ENDING_SOON" | "NAME_ASC";

const PROMOTION_STEPS: Array<{ id: PromotionStep; label: string }> = [
  { id: 1, label: "Cơ bản" },
  { id: 2, label: "Thời gian" },
  { id: 3, label: "Điều kiện" },
  { id: 4, label: "Ưu đãi" },
  { id: 5, label: "Xác nhận" },
];

const money = (value?: number) => `${Number(value || 0).toLocaleString("vi-VN")} ₫`;
const dateTime = (value?: string) => value ? new Date(value).toLocaleString("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
}) : "—";
const messageOf = (error: unknown, fallback: string) => {
  const apiError = error as ApiError;
  return apiError.response?.data?.message || apiError.message || fallback;
};
const localInput = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};
const numberOrUndefined = (value: string) => value === "" ? undefined : Number(value);
const formatMoneyInput = (value?: number) => value == null || value === 0
  ? ""
  : value.toLocaleString("vi-VN");
const parseMoneyInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : undefined;
};
const isBirthdayPromotion = (type: PromotionType) =>
  type === "BIRTHDAY" || type === "LEAP_DAY_BIRTHDAY";
const yearOfInput = (value?: string) => Number(value?.slice(0, 4)) || new Date().getFullYear();
const annualRange = (year: number) => ({
  startAt: `${year}-01-01T00:00`,
  endAt: `${year}-12-31T23:59`,
});
const endOfInputYear = (startAt: string) => `${startAt.slice(0, 4)}-12-31T23:59`;

const validatePromotionStep = (
  form: PromotionRequest,
  step: PromotionStep,
): FormErrors => {
  const errors: FormErrors = {};
  if (step === 1) {
    if (!form.name.trim()) errors.name = "Tên chương trình là bắt buộc.";
    if (!form.code.trim()) errors.code = "Mã voucher là bắt buộc.";
    else if (!/^[A-Za-z0-9_-]{3,50}$/.test(form.code.trim())) {
      errors.code = "Mã chỉ gồm chữ, số, gạch ngang hoặc gạch dưới và dài từ 3 đến 50 ký tự.";
    }
    if (form.description && form.description.length > 1000) {
      errors.description = "Mô tả tối đa 1000 ký tự.";
    }
    if ((form.termsAndConditions?.length ?? 0) > 2000) {
      errors.termsAndConditions = "Điều khoản tối đa 2000 ký tự.";
    }
    if (form.priority < 0 || form.priority > 100) {
      errors.priority = "Độ ưu tiên phải từ 0 đến 100.";
    }
  }
  if (step === 2) {
    if (!form.startAt) errors.startAt = "Thời gian bắt đầu là bắt buộc.";
    if (!form.endAt) errors.endAt = "Thời gian kết thúc là bắt buộc.";
    if (form.startAt && form.endAt) {
      if (form.endAt <= form.startAt) {
        errors.endAt = "Thời gian kết thúc phải sau thời gian bắt đầu.";
      } else if (form.startAt.slice(0, 4) !== form.endAt.slice(0, 4)) {
        errors.endAt = "Thời gian khuyến mãi phải nằm trong cùng một năm.";
      }
    }
    if (Boolean(form.dailyStartTime) !== Boolean(form.dailyEndTime)) {
      errors.dailyTime = "Phải nhập đủ giờ bắt đầu và kết thúc.";
    } else if (form.dailyStartTime && form.dailyStartTime === form.dailyEndTime) {
      errors.dailyTime = "Giờ bắt đầu và kết thúc không được trùng nhau.";
    }
    if (isBirthdayPromotion(form.type)) {
      const year = yearOfInput(form.startAt);
      if (form.startAt.slice(0, 10) !== `${year}-01-01`
          || form.endAt.slice(0, 10) !== `${year}-12-31`) {
        errors.applicationYear = "Khuyến mãi sinh nhật phải áp dụng cho toàn bộ năm đã chọn.";
      }
      if (!form.birthdayRule) errors.birthdayRule = "Vui lòng chọn thời gian hưởng ưu đãi.";
      if (form.type === "LEAP_DAY_BIRTHDAY" && !form.leapDayPolicy) {
        errors.leapDayPolicy = "Vui lòng chọn chính sách cho năm không nhuận.";
      }
      if ((form.birthdayMinProfileAgeDays ?? 0) < 1) {
        errors.birthdayMinProfileAgeDays = "Ngày sinh phải ổn định ít nhất 1 ngày.";
      }
      if (form.birthdayRule === "DATE_RANGE"
          && ((form.birthdayDaysBefore ?? 0) < 0 || (form.birthdayDaysAfter ?? 0) < 0)) {
        errors.birthdayRange = "Số ngày trước và sau sinh nhật không được âm.";
      }
    }
  }
  if (step === 3) {
    if ((form.minOrderAmount ?? 0) < 0) errors.minOrderAmount = "Giá trị đơn tối thiểu không được âm.";
    if (form.type === "MEMBER_TIER"
        && (form.eligibleMemberTiers?.length ?? 0) === 0) {
      errors.eligibleMemberTiers = "Phải chọn ít nhất một hạng hội viên.";
    }
    if (form.type === "E_WALLET" && !form.walletPaymentMethod) {
      errors.walletPaymentMethod = "Vui lòng chọn ví điện tử áp dụng.";
    }
    if (form.applicableChannels.length === 0) {
      errors.applicableChannels = "Phải chọn ít nhất một kênh bán.";
    }
    if (form.type === "E_WALLET" && (form.applicableChannels.length !== 1 || form.applicableChannels[0] !== "ONLINE")) {
      errors.applicableChannels = "Voucher ví điện tử chỉ áp dụng online.";
    }
  }
  if (step === 4) {
    if ((form.discountValue ?? 0) < 1) errors.discountValue = "Giá trị giảm phải lớn hơn 0.";
    if (form.discountType === "PERCENTAGE" && form.discountValue > 100) {
      errors.discountValue = "Phần trăm giảm phải từ 1 đến 100.";
    }
    if (form.maxDiscountAmount != null && form.maxDiscountAmount < 1) {
      errors.maxDiscountAmount = "Mức giảm tối đa phải lớn hơn 0.";
    }
    if (form.totalUsageLimitType === "LIMITED" && (form.totalUsageLimit ?? 0) < 1) {
      errors.totalUsageLimit = "Tổng lượt sử dụng phải lớn hơn 0.";
    }
    if (form.perCustomerUsageLimitType === "LIMITED" && (form.perCustomerUsageLimit ?? 0) < 1) {
      errors.perCustomerUsageLimit = "Lượt mỗi khách hàng phải lớn hơn 0.";
    }
    if (form.totalUsageLimitType === "LIMITED"
        && form.perCustomerUsageLimitType === "LIMITED"
        && (form.perCustomerUsageLimit ?? 0) > (form.totalUsageLimit ?? 0)) {
      errors.perCustomerUsageLimit = "Lượt mỗi khách không được vượt tổng lượt chương trình.";
    }
    if (form.budgetLimit != null && form.budgetLimit < 1000) {
      errors.budgetLimit = "Ngân sách phải từ 1.000 ₫.";
    }
    const maximumDiscount = form.discountType === "FIXED_AMOUNT"
      ? form.discountValue
      : (form.maxDiscountAmount ?? 0);
    if (form.budgetLimit != null && maximumDiscount > 0 && form.budgetLimit < maximumDiscount) {
      errors.budgetLimit = "Ngân sách phải đủ cho ít nhất một lượt giảm tối đa.";
    }
  }
  return errors;
};

const createInitialForm = (): PromotionRequest => {
  const start = new Date();
  start.setMinutes(start.getMinutes() + 5);
  const end = new Date(start);
  end.setDate(end.getDate() + 30);
  const startAt = localInput(start);
  const candidateEndAt = localInput(end);
  return {
    name: "",
    code: "",
    description: "",
    type: "GENERAL",
    discountType: "PERCENTAGE",
    discountValue: 10,
    minOrderAmount: 0,
    publicVisible: true,
    priority: 50,
    termsAndConditions: "Không áp dụng đồng thời với chương trình khuyến mãi khác.",
    applicableChannels: ["ONLINE", "COUNTER"],
    startAt,
    endAt: startAt.slice(0, 4) === candidateEndAt.slice(0, 4)
      ? candidateEndAt
      : endOfInputYear(startAt),
    totalUsageLimitType: "UNLIMITED",
    perCustomerUsageLimitType: "LIMITED",
    perCustomerUsageLimit: 1,
    eligibleMemberTiers: [],
  };
};

const TYPE_LABELS: Record<PromotionType, string> = {
  GENERAL: "Toàn bộ khách hàng",
  MEMBER_TIER: "Hạng thành viên",
  BIRTHDAY: "Sinh nhật",
  LEAP_DAY_BIRTHDAY: "Sinh nhật 29/02",
  E_WALLET: "Ví điện tử",
};

const STATUS_STYLES: Record<PromotionStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  INACTIVE: "bg-amber-100 text-amber-700",
  EXPIRED: "bg-rose-100 text-rose-700",
};

const STATUS_LABELS: Record<PromotionStatus, string> = {
  DRAFT: "Bản nháp",
  ACTIVE: "Đang chạy",
  INACTIVE: "Tạm dừng",
  EXPIRED: "Hết hạn",
};

const USAGE_STATUS_LABELS: Record<PromotionUsage["status"], string> = {
  RESERVED: "Đang giữ",
  APPLIED: "Đã áp dụng",
  RELEASED: "Đã giải phóng",
};

const USAGE_STATUS_STYLES: Record<PromotionUsage["status"], string> = {
  RESERVED: "border-amber-200 bg-amber-50 text-amber-700",
  APPLIED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  RELEASED: "border-slate-200 bg-slate-100 text-slate-600",
};

export function PromotionManagementPage() {
  const [promotions, setPromotions] = useState<PromotionResponse[]>([]);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [usages, setUsages] = useState<PromotionUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PromotionResponse | null>(null);
  const [form, setForm] = useState<PromotionRequest>(createInitialForm);
  const [formStep, setFormStep] = useState<PromotionStep>(1);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [statusFilter, setStatusFilter] = useState<PromotionStatus | "">("");
  const [typeFilter, setTypeFilter] = useState<PromotionType | "">("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<PromotionSort>("NEWEST");
  const [analytics, setAnalytics] = useState<PromotionAnalytics>({
    totalPromotions: 0,
    activePromotions: 0,
    scheduledPromotions: 0,
    reservedUsages: 0,
    appliedUsages: 0,
    releasedUsages: 0,
    originalRevenue: 0,
    discountGranted: 0,
    netRevenue: 0,
  });

  const loadPromotions = useCallback(async () => {
    try {
      const [promotionData, analyticsData] = await Promise.all([
        promotionApi.getPromotions(),
        promotionApi.getAnalytics(),
      ]);
      setPromotions(promotionData);
      setAnalytics(analyticsData);
    } catch (error) {
      toast.error(messageOf(error, "Không thể tải danh sách promotion."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([promotionApi.getPromotions(), membershipApi.getAdminPlans(), promotionApi.getAnalytics()])
      .then(([promotionResult, planResult, analyticsResult]) => {
        if (cancelled) return;
        if (promotionResult.status === "fulfilled") {
          setPromotions(promotionResult.value);
        } else {
          toast.error(messageOf(promotionResult.reason, "Không thể tải danh sách promotion."));
        }
        if (planResult.status === "fulfilled") {
          setMembershipPlans(planResult.value);
        } else {
          toast.error(messageOf(planResult.reason, "Không thể tải danh sách hạng hội viên."));
        }
        if (analyticsResult.status === "fulfilled") {
          setAnalytics(analyticsResult.value);
        } else {
          toast.error(messageOf(analyticsResult.reason, "Không thể tải số liệu khuyến mãi."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const promotionSummary = useMemo(() => ({
    total: promotions.length,
    active: promotions.filter((promotion) => promotion.status === "ACTIVE").length,
    draft: promotions.filter((promotion) => promotion.status === "DRAFT").length,
    inactive: promotions.filter((promotion) => promotion.status === "INACTIVE").length,
    expired: promotions.filter((promotion) => promotion.status === "EXPIRED").length,
  }), [promotions]);

  const visiblePromotions = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("vi-VN");
    const filtered = promotions.filter((promotion) => {
      const searchable = [
        promotion.name,
        promotion.code,
        promotion.description,
        TYPE_LABELS[promotion.type],
      ].filter(Boolean).join(" ").toLocaleLowerCase("vi-VN");
      return (!statusFilter || promotion.status === statusFilter)
        && (!typeFilter || promotion.type === typeFilter)
        && (!query || searchable.includes(query));
    });
    return [...filtered].sort((left, right) => {
      if (sortBy === "OLDEST") {
        return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      }
      if (sortBy === "ENDING_SOON") {
        return new Date(left.endAt).getTime() - new Date(right.endAt).getTime();
      }
      if (sortBy === "NAME_ASC") {
        return left.name.localeCompare(right.name, "vi");
      }
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }, [promotions, searchTerm, sortBy, statusFilter, typeFilter]);

  const hasFilters = Boolean(searchTerm || statusFilter || typeFilter || sortBy !== "NEWEST");
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setTypeFilter("");
    setSortBy("NEWEST");
  };

  const usageSummary = useMemo(() => ({
    reserved: usages.filter((usage) => usage.status === "RESERVED").length,
    applied: usages.filter((usage) => usage.status === "APPLIED").length,
    released: usages.filter((usage) => usage.status === "RELEASED").length,
  }), [usages]);
  const openCreate = () => {
    setEditing(null);
    setForm(createInitialForm());
    setFormStep(1);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (promotion: PromotionResponse) => {
    setEditing(promotion);
    setForm({
      name: promotion.name,
      code: promotion.code,
      description: promotion.description || "",
      type: promotion.type,
      discountType: promotion.discountType,
      discountValue: promotion.discountValue,
      maxDiscountAmount: promotion.maxDiscountAmount,
      minOrderAmount: promotion.minOrderAmount,
      budgetLimit: promotion.budgetLimit,
      publicVisible: promotion.publicVisible,
      priority: promotion.priority,
      termsAndConditions: promotion.termsAndConditions || "",
      applicableChannels: promotion.applicableChannels || ["ONLINE", "COUNTER"],
      startAt: promotion.startAt.slice(0, 16),
      endAt: promotion.endAt.slice(0, 16),
      dailyStartTime: promotion.dailyStartTime?.slice(0, 5),
      dailyEndTime: promotion.dailyEndTime?.slice(0, 5),
      totalUsageLimitType: promotion.totalUsageLimitType,
      totalUsageLimit: promotion.totalUsageLimit,
      perCustomerUsageLimitType: promotion.perCustomerUsageLimitType,
      perCustomerUsageLimit: promotion.perCustomerUsageLimit,
      eligibleMemberTiers: promotion.eligibleMemberTiers || [],
      birthdayRule: promotion.birthdayRule,
      birthdayDaysBefore: promotion.birthdayDaysBefore,
      birthdayDaysAfter: promotion.birthdayDaysAfter,
      leapDayPolicy: promotion.leapDayPolicy,
      birthdayMinProfileAgeDays: promotion.birthdayMinProfileAgeDays,
      walletPaymentMethod: promotion.walletPaymentMethod,
    });
    setFormStep(1);
    setFormErrors({});
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setFormErrors({});
  };

  const changePromotionType = (type: PromotionType) => {
    const next = { ...form, type };
    if (type === "E_WALLET") {
      next.applicableChannels = ["ONLINE"];
    }
    if (isBirthdayPromotion(type)) {
      Object.assign(next, annualRange(yearOfInput(form.startAt)));
      next.birthdayRule = next.birthdayRule || "BIRTH_MONTH";
      next.birthdayMinProfileAgeDays = next.birthdayMinProfileAgeDays ?? 30;
      if (type === "LEAP_DAY_BIRTHDAY") {
        next.leapDayPolicy = next.leapDayPolicy || "FEBRUARY_28";
      }
    }
    setForm(next);
    setFormErrors({});
  };

  const changeApplicationYear = (year: number) => {
    if (!Number.isInteger(year) || year < 1900 || year > 9999) return;
    const next = { ...form, ...annualRange(year) };
    setForm(next);
    setFormErrors(validatePromotionStep(next, 2));
  };

  const changeStartAt = (startAt: string) => {
    const endAt = form.endAt
      && form.endAt.slice(0, 4) === startAt.slice(0, 4)
      && form.endAt > startAt
      ? form.endAt
      : "";
    const next = { ...form, startAt, endAt };
    setForm(next);
    setFormErrors(validatePromotionStep(next, 2));
  };

  const goToNextStep = () => {
    const errors = validatePromotionStep(form, formStep);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setFormStep((formStep + 1) as PromotionStep);
  };

  const goToPreviousStep = () => {
    setFormErrors({});
    setFormStep((formStep - 1) as PromotionStep);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    for (const step of PROMOTION_STEPS.slice(0, 4)) {
      const errors = validatePromotionStep(form, step.id);
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        setFormStep(step.id);
        toast.warning("Vui lòng kiểm tra lại thông tin ở bước này.");
        return;
      }
    }
    const birthday = isBirthdayPromotion(form.type);
    const request: PromotionRequest = {
      ...form,
      code: form.code.trim().toUpperCase(),
      maxDiscountAmount: form.discountType === "PERCENTAGE"
        ? form.maxDiscountAmount
        : undefined,
      totalUsageLimit: form.totalUsageLimitType === "LIMITED"
        ? form.totalUsageLimit
        : undefined,
      perCustomerUsageLimit: form.perCustomerUsageLimitType === "LIMITED"
        ? form.perCustomerUsageLimit
        : undefined,
      eligibleMemberTiers: form.type === "MEMBER_TIER"
        ? [...new Set((form.eligibleMemberTiers || [])
            .map((tier) => tier.trim().toUpperCase())
            .filter(tier => membershipPlans.some(p => p.code === tier)))]
        : undefined,
      birthdayRule: birthday ? form.birthdayRule : undefined,
      birthdayDaysBefore: birthday && form.birthdayRule === "DATE_RANGE"
        ? form.birthdayDaysBefore
        : undefined,
      birthdayDaysAfter: birthday && form.birthdayRule === "DATE_RANGE"
        ? form.birthdayDaysAfter
        : undefined,
      leapDayPolicy: form.type === "LEAP_DAY_BIRTHDAY" ? form.leapDayPolicy : undefined,
      birthdayMinProfileAgeDays: birthday ? form.birthdayMinProfileAgeDays : undefined,
      walletPaymentMethod: form.type === "E_WALLET" ? form.walletPaymentMethod : undefined,
    };
    setSaving(true);
    try {
      if (editing) {
        await promotionApi.update(editing.promotionId, request);
        toast.success("Đã cập nhật promotion.");
      } else {
        await promotionApi.create(request);
        toast.success("Đã tạo promotion nháp.");
      }
      setFormOpen(false);
      setFormErrors({});
      await loadPromotions();
    } catch (error) {
      toast.error(messageOf(error, "Không thể lưu promotion."));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (promotion: PromotionResponse) => {
    try {
      if (promotion.status === "ACTIVE") {
        await promotionApi.deactivate(promotion.promotionId);
        toast.success("Đã vô hiệu hóa promotion.");
      } else {
        await promotionApi.activate(promotion.promotionId);
        toast.success("Đã kích hoạt promotion.");
      }
      await loadPromotions();
    } catch (error) {
      toast.error(messageOf(error, "Không thể đổi trạng thái promotion."));
    }
  };

  const openHistory = async () => {
    try {
      setUsages(await promotionApi.getUsages());
      setHistoryOpen(true);
    } catch (error) {
      toast.error(messageOf(error, "Không thể tải lịch sử sử dụng."));
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-50">
      <header className="flex flex-col gap-4 border-b bg-white px-5 py-5 md:px-7 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-amber-600">
            <Tag size={15} /> Promotion
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-950">Quản lý khuyến mãi</h1>
          <p className="mt-1 text-sm text-slate-500">Vận hành chiến dịch, ngân sách và hiệu quả doanh thu theo thời gian thực.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={openHistory} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">
            <History size={17} /> Lịch sử
          </button>
          <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800">
            <Plus size={17} /> Tạo promotion
          </button>
        </div>
      </header>

      <section className="grid gap-3 border-b bg-slate-100/70 px-5 py-4 md:grid-cols-2 md:px-7 xl:grid-cols-4" aria-label="Hiệu quả khuyến mãi">
        <MetricCard icon={<Banknote size={18} />} label="Doanh thu trước giảm" value={money(analytics.originalRevenue)} hint={`${analytics.appliedUsages} lượt đã thanh toán`} tone="slate" />
        <MetricCard icon={<BadgePercent size={18} />} label="Chi phí khuyến mãi" value={money(analytics.discountGranted)} hint={analytics.originalRevenue > 0 ? `${Math.round(analytics.discountGranted * 100 / analytics.originalRevenue)}% doanh thu gốc` : "Chưa phát sinh"} tone="rose" />
        <MetricCard icon={<CheckCircle2 size={18} />} label="Doanh thu thực thu" value={money(analytics.netRevenue)} hint={`${analytics.reservedUsages} lượt đang giữ`} tone="emerald" />
        <MetricCard icon={<CalendarClock size={18} />} label="Chiến dịch vận hành" value={`${analytics.activePromotions} đang chạy`} hint={`${analytics.scheduledPromotions} chiến dịch sắp mở`} tone="amber" />
      </section>

      <section className="border-b bg-white px-5 py-4 md:px-7" aria-label="Tổng quan promotion">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <SummaryButton label="Tất cả" value={promotionSummary.total} active={!statusFilter} onClick={() => setStatusFilter("")} />
          <SummaryButton label="Đang chạy" value={promotionSummary.active} tone="emerald" active={statusFilter === "ACTIVE"} onClick={() => setStatusFilter("ACTIVE")} />
          <SummaryButton label="Bản nháp" value={promotionSummary.draft} tone="slate" active={statusFilter === "DRAFT"} onClick={() => setStatusFilter("DRAFT")} />
          <SummaryButton label="Tạm dừng" value={promotionSummary.inactive} tone="amber" active={statusFilter === "INACTIVE"} onClick={() => setStatusFilter("INACTIVE")} />
          <SummaryButton label="Hết hạn" value={promotionSummary.expired} tone="rose" active={statusFilter === "EXPIRED"} onClick={() => setStatusFilter("EXPIRED")} />
        </div>

        <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm theo tên, mã voucher hoặc mô tả..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
            />
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700" aria-label="Xóa nội dung tìm kiếm">
                <X size={15} />
              </button>
            )}
          </label>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:shrink-0">
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as PromotionType | "")} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-amber-500 xl:w-48">
              <option value="">Mọi loại promotion</option>
              <option value="GENERAL">Toàn bộ khách hàng</option>
              <option value="MEMBER_TIER">Hạng thành viên</option>
              <option value="BIRTHDAY">Sinh nhật</option>
              <option value="LEAP_DAY_BIRTHDAY">Sinh nhật 29/02</option>
              <option value="E_WALLET">Ví điện tử</option>
            </select>
            <label className="relative">
              <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value as PromotionSort)} className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-8 text-sm font-semibold text-slate-700 outline-none focus:border-amber-500 xl:w-44">
                <option value="NEWEST">Mới tạo trước</option>
                <option value="OLDEST">Cũ nhất trước</option>
                <option value="ENDING_SOON">Sắp hết hạn</option>
                <option value="NAME_ASC">Tên A–Z</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-3 flex min-h-7 flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-slate-500">
            Hiển thị <strong className="text-slate-900">{visiblePromotions.length}</strong>/{promotions.length} promotion
          </p>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950">
              <X size={14} /> Xóa bộ lọc
            </button>
          )}
        </div>
      </section>

      <main className="flex-1 overflow-auto p-4 md:p-7">
        {loading ? (
          <div className="flex h-56 items-center justify-center text-slate-500"><Loader2 className="animate-spin" /></div>
        ) : visiblePromotions.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white p-14 text-center">
            <Search className="mx-auto text-slate-300" size={32} />
            <p className="mt-3 font-bold text-slate-700">Không tìm thấy promotion phù hợp</p>
            <p className="mt-1 text-sm text-slate-500">Thử đổi từ khóa hoặc xóa bớt bộ lọc.</p>
            {hasFilters && <button type="button" onClick={clearFilters} className="mt-4 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">Xóa bộ lọc</button>}
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {visiblePromotions.map((promotion) => (
              <article key={promotion.promotionId} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-black ${STATUS_STYLES[promotion.status]}`}>
                        {STATUS_LABELS[promotion.status]}
                      </span>
                      <span className="text-xs font-bold text-slate-500">{TYPE_LABELS[promotion.type]}</span>
                      <span className={`inline-flex items-center gap-1 text-xs font-bold ${promotion.publicVisible ? "text-sky-700" : "text-violet-700"}`}>
                        {promotion.publicVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                        {promotion.publicVisible ? "Công khai" : "Mã riêng"}
                      </span>
                    </div>
                    <h2 className="mt-3 truncate text-lg font-black text-slate-900" title={promotion.name}>{promotion.name}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-black uppercase tracking-[.12em] text-slate-400">Mã voucher</span>
                      <code className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-black tracking-wider text-amber-800">
                        {promotion.code}
                      </code>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => openEdit(promotion)} className="rounded-lg border p-2 text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950" title="Chỉnh sửa">
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => void toggleStatus(promotion)}
                      disabled={promotion.status === "EXPIRED"}
                      className={`rounded-lg border p-2 transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300 ${promotion.status === "ACTIVE" ? "text-rose-600 hover:border-rose-200 hover:bg-rose-50" : "text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50"}`}
                      title={promotion.status === "EXPIRED" ? "Promotion đã hết hạn" : promotion.status === "ACTIVE" ? "Tạm dừng" : "Kích hoạt"}
                    >
                      {promotion.status === "ACTIVE" ? <PowerOff size={16} /> : <Power size={16} />}
                    </button>
                  </div>
                </div>
                <p className="mt-3 min-h-10 text-sm leading-5 text-slate-500">{promotion.description || "Không có mô tả."}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Info label="Ưu đãi" value={promotion.discountType === "PERCENTAGE"
                    ? `${promotion.discountValue}%${promotion.maxDiscountAmount ? ` · tối đa ${money(promotion.maxDiscountAmount)}` : ""}`
                    : money(promotion.discountValue)} />
                  <Info label="Đơn tối thiểu" value={money(promotion.minOrderAmount)} />
                  <Info label="Đã dùng" value={`${promotion.appliedUsageCount}/${promotion.totalUsageLimitType === "UNLIMITED" ? "∞" : promotion.totalUsageLimit}`} />
                  <Info label="Đang giữ" value={String(promotion.reservedUsageCount)} />
                  <Info label="Tiền đã giảm" value={money(promotion.appliedDiscountAmount)} />
                  <Info label="Thực thu" value={money(promotion.appliedNetAmount)} />
                  {promotion.type === "MEMBER_TIER" && (
                    <Info
                      label="Hạng hội viên"
                      value={(promotion.eligibleMemberTiers || []).map((code) =>
                        membershipPlans.find((plan) => plan.code === code)?.name || code
                      ).join(", ") || "—"}
                    />
                  )}
                </div>
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-600">
                    <span>Ngân sách</span>
                    <span>{promotion.budgetLimit == null
                      ? "Không giới hạn"
                      : `${money(promotion.appliedDiscountAmount + promotion.reservedDiscountAmount)} / ${money(promotion.budgetLimit)}`}</span>
                  </div>
                  {promotion.budgetLimit != null && (
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full ${promotion.remainingBudget === 0 ? "bg-rose-500" : "bg-amber-500"}`}
                        style={{ width: `${Math.min(100, (promotion.appliedDiscountAmount + promotion.reservedDiscountAmount) * 100 / promotion.budgetLimit)}%` }}
                      />
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
                    {promotion.applicableChannels.includes("ONLINE") && <span className="inline-flex items-center gap-1"><Globe2 size={12} /> Online</span>}
                    {promotion.applicableChannels.includes("COUNTER") && <span className="inline-flex items-center gap-1"><Store size={12} /> Tại quầy</span>}
                    <span>Ưu tiên {promotion.priority}</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 border-t pt-4 text-xs text-slate-500">
                  <CalendarDays size={14} /> {dateTime(promotion.startAt)} → {dateTime(promotion.endAt)}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {formOpen && (
        <Modal title={editing ? "Chỉnh sửa voucher" : "Tạo voucher mới"} onClose={closeForm} formModal>
          <form onSubmit={submit} className="space-y-5" noValidate>
            {editing && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.14em] text-amber-700">Đang chỉnh sửa mã</p>
                  <code className="mt-1 block text-xl font-black tracking-wider text-slate-950">{editing.code}</code>
                </div>
                <span className={`rounded-full px-3 py-1.5 text-xs font-black ${STATUS_STYLES[editing.status]}`}>
                  {editing.status}
                </span>
              </div>
            )}

            <nav className="grid grid-cols-5 gap-2" aria-label="Các bước tạo promotion">
              {PROMOTION_STEPS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={item.id > formStep}
                  onClick={() => {
                    if (item.id <= formStep) {
                      setFormStep(item.id);
                      setFormErrors({});
                    }
                  }}
                  className={`rounded-xl border px-2 py-3 text-center text-xs font-black transition ${item.id === formStep
                    ? "border-amber-500 bg-amber-50 text-amber-800"
                    : item.id < formStep
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-400"}`}
                  aria-current={item.id === formStep ? "step" : undefined}
                >
                  <span className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-current/10">
                    {item.id < formStep ? <Check size={14} /> : item.id}
                  </span>
                  <span className="hidden sm:block">{item.label}</span>
                </button>
              ))}
            </nav>

            {formStep === 1 && (
              <FormSection icon={<Tag size={19} />} title="Thông tin cơ bản" description="Tên, mã và loại promotion khách hàng sẽ sử dụng.">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Tên chương trình" hint="Ví dụ: Ưu đãi sinh nhật 2026" error={formErrors.name}>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nhập tên dễ nhận biết" />
                  </Field>
                  <Field label="Mã voucher" hint="Chữ, số, gạch ngang hoặc gạch dưới" error={formErrors.code}>
                    <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SINHNHAT2026" className="font-black uppercase tracking-wider" />
                  </Field>
                  <Field label="Loại promotion">
                    <select value={form.type} onChange={(e) => changePromotionType(e.target.value as PromotionType)}>
                      <option value="GENERAL">Toàn bộ khách hàng</option>
                      <option value="MEMBER_TIER">Theo hạng thành viên</option>
                      <option value="BIRTHDAY">Sinh nhật thông thường</option>
                      <option value="LEAP_DAY_BIRTHDAY">Sinh nhật ngày 29/02</option>
                      <option value="E_WALLET">Thanh toán ví điện tử</option>
                    </select>
                  </Field>
                  <Field label="Độ ưu tiên hiển thị" hint="0–100, số lớn được đưa lên trước" error={formErrors.priority}>
                    <input type="number" min={0} max={100} value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
                  </Field>
                  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                    <span>
                      <span className="flex items-center gap-2 text-sm font-black text-slate-800">{form.publicVisible ? <Eye size={16} /> : <EyeOff size={16} />} Hiển thị công khai</span>
                      <span className="mt-1 block text-xs text-slate-500">Tắt để tạo mã riêng, khách vẫn nhập được mã khi thanh toán.</span>
                    </span>
                    <input type="checkbox" checked={form.publicVisible} onChange={(e) => setForm({ ...form, publicVisible: e.target.checked })} className="h-5 w-5 accent-slate-950" />
                  </label>
                  <Field label="Mô tả" hint="Nội dung khách hàng sẽ nhìn thấy" error={formErrors.description} wide>
                    <textarea rows={3} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả ngắn gọn quyền lợi và điều kiện áp dụng" />
                  </Field>
                  <Field label="Điều khoản áp dụng" hint="Hiển thị cùng voucher để khách hiểu rõ điều kiện" error={formErrors.termsAndConditions} wide>
                    <textarea rows={3} value={form.termsAndConditions || ""} onChange={(e) => setForm({ ...form, termsAndConditions: e.target.value })} placeholder="Ví dụ: Không áp dụng đồng thời với ưu đãi khác..." />
                  </Field>
                </div>
              </FormSection>
            )}

            {formStep === 2 && (
              <FormSection icon={<CalendarClock size={19} />} title="Thời gian áp dụng" description="Mỗi promotion chỉ được nằm trong một năm dương lịch.">
                {isBirthdayPromotion(form.type) ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Năm áp dụng" hint="Một cấu hình áp dụng tự động cho đủ 12 tháng" error={formErrors.applicationYear} wide>
                      <input type="number" min={1900} max={9999} value={yearOfInput(form.startAt)} onChange={(e) => changeApplicationYear(Number(e.target.value))} />
                    </Field>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800 md:col-span-2">
                      Khách hàng được xét theo tháng/ngày sinh trong năm {yearOfInput(form.startAt)}. Không cần tạo 12 promotion riêng.
                    </div>
                    <Field label="Thời gian hưởng ưu đãi" error={formErrors.birthdayRule}>
                      <select value={form.birthdayRule || ""} onChange={(e) => setForm({ ...form, birthdayRule: e.target.value as BirthdayRule })}>
                        <option value="">Chọn quy tắc</option>
                        <option value="EXACT_DATE">Chỉ đúng ngày sinh nhật</option>
                        <option value="DATE_RANGE">Trước/sau ngày sinh nhật</option>
                        <option value="BIRTH_MONTH">Trong toàn bộ tháng sinh nhật</option>
                      </select>
                    </Field>
                    {form.type === "LEAP_DAY_BIRTHDAY" && (
                      <Field label="Năm không nhuận" error={formErrors.leapDayPolicy}>
                        <select value={form.leapDayPolicy || ""} onChange={(e) => setForm({ ...form, leapDayPolicy: e.target.value as LeapDayPolicy })}>
                          <option value="">Chọn chính sách</option>
                          <option value="LEAP_DAY_ONLY">Chỉ áp dụng trong năm nhuận</option>
                          <option value="FEBRUARY_28">Lấy ngày 28/02 làm mốc</option>
                          <option value="MARCH_1">Lấy ngày 01/03 làm mốc</option>
                        </select>
                      </Field>
                    )}
                    {form.birthdayRule === "DATE_RANGE" && (
                      <>
                        <Field label="Số ngày trước" error={formErrors.birthdayRange}>
                          <input type="number" min={0} value={form.birthdayDaysBefore ?? 0} onChange={(e) => setForm({ ...form, birthdayDaysBefore: Number(e.target.value) })} />
                        </Field>
                        <Field label="Số ngày sau" error={formErrors.birthdayRange}>
                          <input type="number" min={0} value={form.birthdayDaysAfter ?? 0} onChange={(e) => setForm({ ...form, birthdayDaysAfter: Number(e.target.value) })} />
                        </Field>
                      </>
                    )}
                    <Field label="Ngày sinh ổn định tối thiểu" hint="Số ngày từ lần cập nhật ngày sinh gần nhất" error={formErrors.birthdayMinProfileAgeDays} wide>
                      <input type="number" min={1} value={form.birthdayMinProfileAgeDays ?? ""} onChange={(e) => setForm({ ...form, birthdayMinProfileAgeDays: Number(e.target.value) })} placeholder="30" />
                    </Field>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Bắt đầu" error={formErrors.startAt}>
                      <input type="datetime-local" value={form.startAt} onChange={(e) => changeStartAt(e.target.value)} />
                    </Field>
                    <Field label="Kết thúc" error={formErrors.endAt}>
                      <input
                        type="datetime-local"
                        min={form.startAt || undefined}
                        max={form.startAt ? endOfInputYear(form.startAt) : undefined}
                        value={form.endAt}
                        onChange={(e) => {
                          const next = { ...form, endAt: e.target.value };
                          setForm(next);
                          setFormErrors(validatePromotionStep(next, 2));
                        }}
                      />
                    </Field>
                  </div>
                )}
                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-5 w-5 accent-slate-950"
                    checked={Boolean(form.dailyStartTime && form.dailyEndTime)}
                    onChange={(e) => setForm({
                      ...form,
                      dailyStartTime: e.target.checked ? "00:00" : undefined,
                      dailyEndTime: e.target.checked ? "23:59" : undefined,
                    })}
                  />
                  <span><span className="block text-sm font-black text-slate-800">Giới hạn theo khung giờ mỗi ngày</span><span className="mt-1 block text-xs text-slate-500">Tắt nếu voucher áp dụng cả ngày.</span></span>
                </label>
                {formErrors.dailyTime && <p className="mt-2 text-xs font-semibold text-rose-600">{formErrors.dailyTime}</p>}
                {form.dailyStartTime && form.dailyEndTime && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="Từ giờ"><TimeRulerPicker value={form.dailyStartTime || "00:00"} onChange={(val) => setForm({ ...form, dailyStartTime: val })} /></Field>
                    <Field label="Đến giờ"><TimeRulerPicker value={form.dailyEndTime || "23:59"} onChange={(val) => setForm({ ...form, dailyEndTime: val })} /></Field>
                  </div>
                )}
              </FormSection>
            )}

            {formStep === 3 && (
              <FormSection icon={form.type === "E_WALLET" ? <WalletCards size={19} /> : form.type === "MEMBER_TIER" ? <UsersRound size={19} /> : <ShieldCheck size={19} />} title="Điều kiện áp dụng" description="Chỉ hiển thị các điều kiện hệ thống đang hỗ trợ.">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Giá trị đơn tối thiểu" error={formErrors.minOrderAmount} wide>
                    <MoneyInput value={form.minOrderAmount} onChange={(value) => setForm({ ...form, minOrderAmount: value })} placeholder="0" />
                  </Field>
                  <Field label="Kênh bán được áp dụng" hint="Chọn nơi nhân viên hoặc khách hàng có thể dùng mã" error={formErrors.applicableChannels} wide>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(["ONLINE", "COUNTER"] as BookingChannel[]).map((channel) => {
                        const selected = form.applicableChannels.includes(channel);
                        const disabled = form.type === "E_WALLET" && channel === "COUNTER";
                        return (
                          <label key={channel} className={`flex items-center gap-3 rounded-xl border p-4 ${disabled ? "cursor-not-allowed bg-slate-100 opacity-50" : "cursor-pointer"} ${selected ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-white"}`}>
                            <input
                              type="checkbox"
                              checked={selected}
                              disabled={disabled}
                              onChange={() => setForm({
                                ...form,
                                applicableChannels: selected
                                  ? form.applicableChannels.filter((item) => item !== channel)
                                  : [...form.applicableChannels, channel],
                              })}
                              className="h-4 w-4 accent-amber-600"
                            />
                            {channel === "ONLINE" ? <Globe2 size={17} /> : <Store size={17} />}
                            <span className="font-bold text-slate-800">{channel === "ONLINE" ? "Đặt vé online" : "Bán tại quầy"}</span>
                          </label>
                        );
                      })}
                    </div>
                  </Field>
                  {form.type === "MEMBER_TIER" && (
                    <Field label="Hạng hội viên được áp dụng" hint="Danh sách được đồng bộ từ cấu hình hạng hội viên." error={formErrors.eligibleMemberTiers} wide>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {membershipPlans.map((plan) => {
                          const selected = (form.eligibleMemberTiers || []).includes(plan.code);
                          return (
                            <label
                              key={plan.planId}
                              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${selected
                                ? "border-amber-500 bg-amber-50 ring-1 ring-amber-200"
                                : "border-slate-200 bg-white hover:border-slate-400"}`}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => {
                                  const current = form.eligibleMemberTiers || [];
                                  const eligibleMemberTiers = selected
                                    ? current.filter((code) => code !== plan.code)
                                    : [...current, plan.code];
                                  setForm({ ...form, eligibleMemberTiers });
                                  setFormErrors({ ...formErrors, eligibleMemberTiers: "" });
                                }}
                                className="mt-1 !h-4 !w-4 !rounded !p-0 accent-amber-600"
                              />
                              <span className="min-w-0">
                                <span className="block font-black text-slate-900">{plan.name}</span>
                                <span className="mt-0.5 block text-xs font-bold text-slate-500">
                                  {plan.code} · {plan.status === "ACTIVE" ? "Đang hoạt động" : "Ngừng hoạt động"}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                        {membershipPlans.length === 0 && (
                          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500 sm:col-span-2 lg:col-span-3">
                            Chưa có hạng hội viên để áp dụng. Hãy cấu hình hạng hội viên trước.
                          </div>
                        )}
                      </div>
                    </Field>
                  )}
                  {form.type === "E_WALLET" && (
                    <Field label="Ví điện tử bắt buộc" error={formErrors.walletPaymentMethod} wide>
                      <select value={form.walletPaymentMethod || ""} onChange={(e) => setForm({ ...form, walletPaymentMethod: e.target.value as PaymentMethod })}>
                        <option value="">Chọn ví áp dụng</option><option value="MOMO">MoMo</option><option value="ZALOPAY">ZaloPay</option>
                      </select>
                    </Field>
                  )}
                  {isBirthdayPromotion(form.type) && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 md:col-span-2">
                      {form.type === "LEAP_DAY_BIRTHDAY" ? "Chỉ khách có ngày sinh 29/02 được áp dụng." : "Áp dụng cho khách sinh nhật thông thường; khách sinh 29/02 dùng policy riêng."}
                    </div>
                  )}
                </div>
              </FormSection>
            )}

            {formStep === 4 && (
              <FormSection icon={<BadgePercent size={19} />} title="Ưu đãi và giới hạn" description="Cấu hình quyền lợi và số lượt sử dụng.">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Hình thức giảm">
                    <select value={form.discountType} onChange={(e) => {
                      const discountType = e.target.value as PromotionDiscountType;
                      setForm({ ...form, discountType, maxDiscountAmount: discountType === "FIXED_AMOUNT" ? undefined : form.maxDiscountAmount });
                    }}>
                      <option value="PERCENTAGE">Giảm theo phần trăm (%)</option><option value="FIXED_AMOUNT">Giảm số tiền cố định (VNĐ)</option>
                    </select>
                  </Field>
                  <Field label={form.discountType === "PERCENTAGE" ? "Phần trăm giảm (%)" : "Số tiền giảm"} error={formErrors.discountValue}>
                    {form.discountType === "PERCENTAGE"
                      ? <PercentageInput value={form.discountValue} onChange={(value) => setForm({ ...form, discountValue: value })} />
                      : <MoneyInput value={form.discountValue} onChange={(value) => setForm({ ...form, discountValue: value ?? 0 })} placeholder="20.000" />}
                  </Field>
                  {form.discountType === "PERCENTAGE" && (
                    <Field label="Mức giảm tối đa" error={formErrors.maxDiscountAmount}>
                      <MoneyInput value={form.maxDiscountAmount} onChange={(value) => setForm({ ...form, maxDiscountAmount: value })} placeholder="Không giới hạn" />
                    </Field>
                  )}
                  <Field label="Ngân sách giảm giá" hint="Để trống nếu không giới hạn theo tiền" error={formErrors.budgetLimit}>
                    <MoneyInput value={form.budgetLimit} onChange={(value) => setForm({ ...form, budgetLimit: value })} placeholder="Không giới hạn" />
                  </Field>
                  <Field label="Tổng lượt toàn chương trình" error={formErrors.totalUsageLimit}>
                    <div className="grid gap-2">
                      <select value={form.totalUsageLimitType} onChange={(e) => {
                        const limited = e.target.value === "LIMITED";
                        setForm({ ...form, totalUsageLimitType: limited ? "LIMITED" : "UNLIMITED", totalUsageLimit: limited ? (form.totalUsageLimit ?? 1) : undefined });
                      }}><option value="UNLIMITED">Không giới hạn</option><option value="LIMITED">Có giới hạn</option></select>
                      {form.totalUsageLimitType === "LIMITED" && <input type="number" min={1} value={form.totalUsageLimit ?? ""} onChange={(e) => setForm({ ...form, totalUsageLimit: numberOrUndefined(e.target.value) })} />}
                    </div>
                  </Field>
                  <Field label="Lượt tối đa mỗi khách hàng" error={formErrors.perCustomerUsageLimit}>
                    <div className="grid gap-2">
                      <select value={form.perCustomerUsageLimitType} onChange={(e) => {
                        const limited = e.target.value === "LIMITED";
                        setForm({ ...form, perCustomerUsageLimitType: limited ? "LIMITED" : "UNLIMITED", perCustomerUsageLimit: limited ? (form.perCustomerUsageLimit ?? 1) : undefined });
                      }}><option value="UNLIMITED">Không giới hạn</option><option value="LIMITED">Có giới hạn</option></select>
                      {form.perCustomerUsageLimitType === "LIMITED" && <input type="number" min={1} value={form.perCustomerUsageLimit ?? ""} onChange={(e) => setForm({ ...form, perCustomerUsageLimit: numberOrUndefined(e.target.value) })} />}
                    </div>
                  </Field>
                </div>
              </FormSection>
            )}

            {formStep === 5 && (
              <FormSection icon={<CheckCircle2 size={19} />} title="Xác nhận cấu hình" description="Kiểm tra lần cuối trước khi gọi API lưu promotion.">
                <div className="grid gap-3 md:grid-cols-2">
                  <Info label="Chương trình" value={`${form.name} · ${form.code.trim().toUpperCase()}`} />
                  <Info label="Loại" value={TYPE_LABELS[form.type]} />
                  <Info label="Thời gian" value={`${dateTime(form.startAt)} → ${dateTime(form.endAt)}`} />
                  <Info label="Ưu đãi" value={form.discountType === "PERCENTAGE" ? `${form.discountValue}%` : money(form.discountValue)} />
                  <Info label="Đơn tối thiểu" value={money(form.minOrderAmount)} />
                  <Info label="Ngân sách" value={form.budgetLimit == null ? "Không giới hạn" : money(form.budgetLimit)} />
                  <Info label="Hiển thị" value={form.publicVisible ? "Công khai trên website" : "Mã riêng"} />
                  <Info label="Kênh áp dụng" value={form.applicableChannels.map((channel) => channel === "ONLINE" ? "Online" : "Tại quầy").join(", ")} />
                  <Info label="Tổng lượt" value={form.totalUsageLimitType === "UNLIMITED" ? "Không giới hạn" : String(form.totalUsageLimit)} />
                  <Info label="Mỗi khách hàng" value={form.perCustomerUsageLimitType === "UNLIMITED" ? "Không giới hạn" : `${form.perCustomerUsageLimit} lượt`} />
                  {isBirthdayPromotion(form.type) && <Info label="Policy sinh nhật" value={`${form.birthdayRule} · năm ${yearOfInput(form.startAt)}`} />}
                  {form.type === "LEAP_DAY_BIRTHDAY" && <Info label="Năm không nhuận" value={form.leapDayPolicy || "Chưa chọn"} />}
                  {form.type === "MEMBER_TIER" && (
                    <Info
                      label="Hạng hội viên"
                      value={(form.eligibleMemberTiers || []).map((code) => {
                        const plan = membershipPlans.find((item) => item.code === code);
                        return plan ? `${plan.name} (${plan.code})` : code;
                      }).join(", ") || "Chưa chọn"}
                    />
                  )}
                  {form.type === "E_WALLET" && <Info label="Ví điện tử" value={form.walletPaymentMethod || "Chưa chọn"} />}
                </div>
              </FormSection>
            )}

            <div className="sticky -bottom-6 z-10 -mx-6 flex items-center justify-between gap-3 border-t bg-white/95 px-6 py-4 backdrop-blur">
              <p className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex">
                <CircleHelp size={15} /> Bước {formStep}/5 · dữ liệu được giữ khi chuyển bước.
              </p>
              <div className="ml-auto flex gap-2">
                <button type="button" onClick={formStep === 1 ? closeForm : goToPreviousStep} className="inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-50">
                  {formStep === 1 ? <X size={16} /> : <ChevronLeft size={16} />}{formStep === 1 ? "Hủy" : "Quay lại"}
                </button>
                {formStep < 5 ? (
                  <button type="button" onClick={goToNextStep} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-2.5 font-bold text-white hover:bg-slate-800">
                    Tiếp tục <ChevronRight size={16} />
                  </button>
                ) : (
                  <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-2.5 font-bold text-white hover:bg-slate-800 disabled:opacity-50">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} {editing ? "Lưu thay đổi" : "Tạo voucher"}
                  </button>
                )}
              </div>
            </div>
          </form>
        </Modal>
      )}

      {historyOpen && (
        <Modal title="Lịch sử sử dụng promotion" onClose={() => setHistoryOpen(false)} wide>
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <UsageStat label="Đang giữ" value={usageSummary.reserved} tone="amber" />
            <UsageStat label="Đã áp dụng" value={usageSummary.applied} tone="emerald" />
            <UsageStat label="Đã giải phóng" value={usageSummary.released} tone="slate" />
          </div>
          <div className="max-h-[55vh] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[820px] text-left text-sm text-slate-700">
              <thead className="sticky top-0 z-10 bg-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-500 shadow-[0_1px_0_#e2e8f0]">
                <tr>
                  <th className="px-4 py-3.5">Mã voucher</th>
                  <th className="px-4 py-3.5">Booking</th>
                  <th className="px-4 py-3.5">Khách hàng</th>
                  <th className="px-4 py-3.5">Kênh bán</th>
                  <th className="px-4 py-3.5">Số tiền giảm</th>
                  <th className="px-4 py-3.5">Trạng thái</th>
                  <th className="px-4 py-3.5">Thời gian cập nhật</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {usages.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">Chưa có lịch sử sử dụng promotion.</td>
                  </tr>
                ) : usages.map((usage) => (
                  <tr key={usage.promotionUsageId} className="bg-white transition even:bg-slate-50/70 hover:bg-amber-50/50">
                    <td className="px-4 py-3.5">
                      <code className="inline-flex rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 font-black tracking-wide text-amber-800">{usage.promotionCode}</code>
                    </td>
                    <td className="px-4 py-3.5 font-bold tabular-nums text-slate-700">#{usage.bookingId}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900">{usage.username}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-600">{usage.bookingChannel === "COUNTER" ? "Tại quầy" : "Online"}</td>
                    <td className="px-4 py-3.5 font-black tabular-nums text-emerald-700">−{money(usage.discountAmount)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${USAGE_STATUS_STYLES[usage.status]}`}>
                        {USAGE_STATUS_LABELS[usage.status]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-medium tabular-nums text-slate-600">{dateTime(usage.confirmedAt || usage.releasedAt || usage.reservedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs font-bold uppercase text-slate-400">{label}</div><div className="mt-1 font-black text-slate-800">{value}</div></div>;
}

function UsageStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "emerald" | "slate";
}) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    slate: "border-slate-200 bg-slate-100 text-slate-700",
  };
  return (
    <div className={`rounded-2xl border px-4 py-3.5 ${tones[tone]}`}>
      <p className="text-xs font-black uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: "slate" | "rose" | "emerald" | "amber";
}) {
  const tones = {
    slate: "bg-slate-900 text-white",
    rose: "bg-rose-50 text-rose-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</span>
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      </div>
      <p className="mt-3 text-xl font-black tabular-nums text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{hint}</p>
    </div>
  );
}

function SummaryButton({
  label,
  value,
  tone = "indigo",
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone?: "indigo" | "emerald" | "slate" | "amber" | "rose";
  active: boolean;
  onClick: () => void;
}) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-700",
    emerald: "bg-emerald-50 text-emerald-700",
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition hover:border-slate-400 ${active ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200"}`}
      aria-pressed={active}
    >
      <span className="truncate text-xs font-bold text-slate-600">{label}</span>
      <span className={`ml-2 rounded-lg px-2 py-1 text-sm font-black tabular-nums ${tones[tone]}`}>{value}</span>
    </button>
  );
}

function FormSection({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
          {icon}
        </div>
        <div>
          <h3 className="font-black text-slate-950">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function MoneyInput({
  value,
  onChange,
  placeholder,
  required,
}: {
  value?: number;
  onChange: (value?: number) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        required={required}
        value={formatMoneyInput(value)}
        onChange={(event) => onChange(parseMoneyInput(event.target.value))}
        placeholder={placeholder}
        className="!pr-16 tabular-nums"
      />
      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-black text-slate-500">
        VNĐ
      </span>
    </div>
  );
}

function PercentageInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        required
        value={value || ""}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "");
          onChange(digits ? Math.min(Number(digits), 100) : 0);
        }}
        placeholder="10"
        className="!pr-12 tabular-nums"
      />
      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-black text-slate-600">
        %
      </span>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  wide,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={wide ? "md:col-span-2" : ""}>
      <span className="mb-1.5 block text-sm font-black text-slate-800">{label}</span>
      <div className="[&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-slate-300 [&_input]:bg-white [&_input]:px-4 [&_input]:py-3 [&_input]:text-slate-950 [&_input]:outline-none [&_input]:transition [&_input]:focus:border-amber-500 [&_input]:focus:ring-2 [&_input]:focus:ring-amber-100 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-slate-300 [&_select]:bg-white [&_select]:px-4 [&_select]:py-3 [&_select]:text-slate-950 [&_select]:outline-none [&_select]:focus:border-amber-500 [&_select]:focus:ring-2 [&_select]:focus:ring-amber-100 [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-slate-300 [&_textarea]:px-4 [&_textarea]:py-3 [&_textarea]:text-slate-950 [&_textarea]:outline-none [&_textarea]:focus:border-amber-500 [&_textarea]:focus:ring-2 [&_textarea]:focus:ring-amber-100">
        {children}
      </div>
      {error && <span className="mt-1.5 block text-xs font-semibold leading-5 text-rose-600">{error}</span>}
      {hint && <span className="mt-1.5 block text-xs leading-5 text-slate-500">{hint}</span>}
    </label>
  );
}

function Modal({
  title,
  onClose,
  wide,
  formModal,
  children,
}: {
  title: string;
  onClose: () => void;
  wide?: boolean;
  formModal?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-5">
      <div className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-3xl bg-slate-50 shadow-2xl ${wide ? "max-w-6xl" : formModal ? "max-w-5xl" : "max-w-3xl"}`}>
        <div className="z-10 flex shrink-0 items-center justify-between border-b bg-white px-6 py-4">
          <div className="flex items-center gap-3 font-black text-slate-950">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Clock3 size={18} />
            </span>
            {title}
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border bg-white p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Đóng">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
