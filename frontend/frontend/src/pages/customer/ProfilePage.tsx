import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Gift,
  Loader2,
  RotateCcw,
  Settings,
  Ticket,
  User,
  WalletCards,
  Crown,
  PackageCheck,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { bookingApi, BookingResponse } from "@/api/bookingApi";
import { paymentApi, type PaymentTransactionResponse } from "@/api/paymentApi";
import { getApiErrorMessage } from "@/api/errors";
import { userService, UpdateUserPayload, UserDetailResponse } from "@/api/userApi";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { UserInfoForm } from "@/components/profile/UserInfoForm";
import { AccountActivity } from "@/components/profile/AccountActivity";
import { MembershipProfile } from "@/components/profile/MembershipProfile";
import { MembershipGifts } from "@/components/profile/MembershipGifts";

type AccountTab = "profile" | "membership" | "membership-gifts" | "tickets" | "transactions" | "refunds" | "promotions";

const tabs: { key: AccountTab; label: string; description: string; icon: typeof User }[] = [
  { key: "profile", label: "Thông tin tài khoản", description: "Hồ sơ, ảnh đại diện, liên hệ", icon: User },
  { key: "membership", label: "Hội viên của tôi", description: "Gói, quyền lợi và thời hạn", icon: Crown },
  { key: "membership-gifts", label: "Quà đã đổi", description: "QR và mã nhận quà", icon: PackageCheck },
  { key: "tickets", label: "Vé của tôi", description: "Xem chi tiết vé và ghế", icon: Ticket },
  { key: "transactions", label: "Lịch sử giao dịch", description: "Vé, chi tiêu, thanh toán", icon: WalletCards },
  { key: "refunds", label: "Vé đã hủy", description: "Lịch sử booking đã hủy", icon: RotateCcw },
  { key: "promotions", label: "Ưu đãi đã dùng", description: "Mã ưu đãi đã áp dụng", icon: Gift },
];

const tabFromParam = (value: string | null): AccountTab => {
  if (value === "membership" || value === "membership-gifts" || value === "tickets" || value === "transactions" || value === "refunds" || value === "promotions") {
    return value;
  }
  return "profile";
};

const currency = (value = 0) => value.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [paymentTransactions, setPaymentTransactions] = useState<PaymentTransactionResponse[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [formData, setFormData] = useState<UpdateUserPayload>({});

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<AccountTab>(tabFromParam(searchParams.get("tab")));

  const paidBookings = useMemo(() => bookings.filter((booking) => booking.status === "SUCCESS"), [bookings]);
  const pendingBookings = useMemo(() => bookings.filter((booking) => booking.status === "PENDING"), [bookings]);
  const paidTicketCount = useMemo(
    () => paidBookings.reduce((sum, booking) => sum + (booking.ticketDetails?.length || booking.seatCodes?.length || 0), 0),
    [paidBookings]
  );
  const pendingTicketCount = useMemo(
    () => pendingBookings.reduce((sum, booking) => sum + (booking.ticketDetails?.length || booking.seatCodes?.length || 0), 0),
    [pendingBookings]
  );
  const totalSpending = useMemo(
    () => paidBookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0),
    [paidBookings]
  );
  const visibleTabs = useMemo(
    () => tabs.filter((tab) => !["membership", "membership-gifts"].includes(tab.key) || profile?.member === true),
    [profile?.member]
  );

  const syncAvatar = useCallback((avatarUrl?: string) => {
    if (avatarUrl) {
      const currentAvatar = localStorage.getItem("user_avatar");
      if (currentAvatar !== avatarUrl) {
        localStorage.setItem("user_avatar", avatarUrl);
        window.dispatchEvent(new Event("auth-change"));
      }
      return;
    }

    if (localStorage.getItem("user_avatar")) {
      localStorage.removeItem("user_avatar");
      window.dispatchEvent(new Event("auth-change"));
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      setLoadingBookings(true);
      const data = await bookingApi.getMyBookings();
      setBookings(data || []);
    } catch (error) {
      console.error("Failed to fetch bookings", error);
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  const fetchPaymentTransactions = useCallback(async () => {
    try {
      const data = await paymentApi.getMyTransactions();
      setPaymentTransactions(data || []);
    } catch (error) {
      console.error("Failed to fetch payment transactions", error);
    }
  }, []);

  const refreshActivity = useCallback(async () => {
    await Promise.all([fetchBookings(), fetchPaymentTransactions()]);
  }, [fetchBookings, fetchPaymentTransactions]);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await userService.getMyProfile();
      setProfile(data);
      if (data.member !== true) {
        setActiveTab((currentTab) => ["membership", "membership-gifts"].includes(currentTab) ? "profile" : currentTab);
      }
      syncAvatar(data.avatarUrl);
      setFormData({
        fullName: data.fullName || "",
        phoneNumber: data.phoneNumber || "",
        identityCard: data.identityCard || "",
        dateOfBirth: data.dateOfBirth || "",
        gender: data.gender || "",
        address: data.address || "",
      });
    } catch (error) {
      console.error("Failed to fetch profile", error);
    } finally {
      setIsLoading(false);
    }
  }, [syncAvatar]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      void fetchProfile();
      void fetchBookings();
      void fetchPaymentTransactions();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [fetchBookings, fetchPaymentTransactions, fetchProfile]);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (activeTab !== "profile") {
      nextParams.set("tab", activeTab);
    }
    setSearchParams(nextParams, { replace: true });
  }, [activeTab, setSearchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: "", text: "" });
    try {
      await userService.updateMyProfile(formData);
      setMessage({ type: "success", text: "Cập nhật thông tin thành công!" });
      fetchProfile();
    } catch (error: unknown) {
      setMessage({ type: "error", text: getApiErrorMessage(error, "Lỗi khi cập nhật thông tin.") });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Vui lòng chọn file hình ảnh." });
      return;
    }

    setIsUploading(true);
    try {
      const url = await userService.uploadMyAvatar(file);
      setProfile((prev) => (prev ? { ...prev, avatarUrl: url } : prev));
      localStorage.setItem("user_avatar", url);
      setMessage({ type: "success", text: "Cập nhật ảnh đại diện thành công!" });
      window.dispatchEvent(new Event("auth-change"));
    } catch {
      setMessage({ type: "error", text: "Lỗi tải ảnh lên." });
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Loader2 size={40} className="animate-spin text-rose-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f6f8] font-sans text-slate-900">
      <Header />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-12 pt-24 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          Quay lại
        </button>

        <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.username} className="h-full w-full object-cover" />
                ) : (
                  <User size={30} className="text-slate-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-rose-600">
                  <Settings size={14} />
                  Cài đặt tài khoản
                </div>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 md:text-3xl">
                  {profile?.fullName || profile?.username || "Tài khoản của tôi"}
                </h1>
                <p className="mt-1 text-sm text-slate-500">{profile?.email}</p>
                {profile?.member && (
                  <span className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-700">
                    Thành viên Magi Cinema
                  </span>
                )}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <QuickStat label="Vé đã mua" value={paidTicketCount.toString()} />
              <QuickStat label="Đang giữ" value={pendingTicketCount.toString()} />
              <QuickStat label="Tổng chi tiêu" value={currency(totalSpending)} />
              <QuickStat label="Điểm thành viên" value={(profile?.loyaltyPoints || 0).toLocaleString("vi-VN")} />
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`mb-1 flex w-full items-start gap-3 rounded-md px-3 py-3 text-left transition last:mb-0 ${
                      active ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className={`mt-0.5 ${active ? "text-white" : "text-rose-600"}`}>
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-extrabold">{tab.label}</span>
                      <span className={`mt-0.5 block text-xs ${active ? "text-slate-300" : "text-slate-500"}`}>
                        {tab.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section>
            {activeTab === "profile" ? (
              <UserInfoForm
                profile={profile}
                formData={formData}
                isSaving={isSaving}
                isUploading={isUploading}
                message={message}
                onInputChange={handleInputChange}
                onSave={handleSave}
                onAvatarChange={handleAvatarChange}
              />
            ) : activeTab === "membership" && profile?.member === true ? (
              <MembershipProfile />
            ) : activeTab === "membership-gifts" && profile?.member === true ? (
              <MembershipGifts />
            ) : (
              <AccountActivity
                bookings={bookings}
                paymentTransactions={paymentTransactions}
                isLoading={loadingBookings}
                initialTab={activeTab === "membership" || activeTab === "membership-gifts" ? "transactions" : activeTab}
                onRefresh={refreshActivity}
              />
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[140px] rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-bold tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-extrabold text-slate-950">{value}</div>
    </div>
  );
}
