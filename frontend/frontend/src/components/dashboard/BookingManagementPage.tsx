import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { bookingApi } from "@/api/bookingApi";
import type { BookingAdminResponse, BookingChannel, BookingStatus } from "@/api/bookingApi";
import { Loader2, Ticket, CheckCircle2, XCircle, Clock, Filter, Search, RotateCcw } from "lucide-react";
import { toast } from "react-toastify";
import { formatPresentationLabelFromFields } from "@/utils/presentation";

type BookingFilters = {
  keyword: string;
  status: BookingStatus | "";
  showDateFrom: string;
  showDateTo: string;
  createdFrom: string;
  createdTo: string;
};

const EMPTY_FILTERS: BookingFilters = {
  keyword: "",
  status: "",
  showDateFrom: "",
  showDateTo: "",
  createdFrom: "",
  createdTo: "",
};

const BOOKING_STATUS_OPTIONS: { value: BookingFilters["status"]; label: string }[] = [
  { value: "", label: "Không lọc trạng thái" },
  { value: "PENDING", label: "Chờ thanh toán" },
  { value: "SUCCESS", label: "Thành công" },
  { value: "CANCELLED", label: "Đã hủy" },
];

type BookingManagementPageProps = {
  channel: BookingChannel;
};

export function BookingManagementPage({ channel }: BookingManagementPageProps) {
  const [bookings, setBookings] = useState<BookingAdminResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [filters, setFilters] = useState<BookingFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<BookingFilters>(EMPTY_FILTERS);
  const [requestVersion, setRequestVersion] = useState(0);

  const activeFilterCount = Object.values(appliedFilters).filter(Boolean).length;

  useEffect(() => {
    let active = true;
    bookingApi.getAllBookings({ page: currentPage, size: 10, channel, ...appliedFilters })
      .then((data) => {
        if (!active) return;
        setBookings(data.content);
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);
      })
      .catch((error) => {
        if (!active) return;
        console.error(error);
        toast.error("Lỗi tải danh sách vé");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [appliedFilters, channel, currentPage, requestVersion]);

  const updateFilter = <K extends keyof BookingFilters>(field: K, value: BookingFilters[K]) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const validateDateRanges = (nextFilters: BookingFilters) => {
    if (
      nextFilters.showDateFrom &&
      nextFilters.showDateTo &&
      nextFilters.showDateFrom > nextFilters.showDateTo
    ) {
      toast.error("Ngày chiếu bắt đầu không được sau ngày chiếu kết thúc");
      return false;
    }

    if (
      nextFilters.createdFrom &&
      nextFilters.createdTo &&
      nextFilters.createdFrom > nextFilters.createdTo
    ) {
      toast.error("Ngày tạo bắt đầu không được sau ngày tạo kết thúc");
      return false;
    }

    return true;
  };

  const handleApplyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateDateRanges(filters)) {
      return;
    }
    setLoading(true);
    setRequestVersion((version) => version + 1);
    setCurrentPage(1);
    setAppliedFilters({ ...filters, keyword: filters.keyword.trim() });
  };

  const handleResetFilters = () => {
    setLoading(true);
    setRequestVersion((version) => version + 1);
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    setLoading(true);
    setRequestVersion((version) => version + 1);
    setCurrentPage(page);
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("vi-VN") + " ₫";
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case "SUCCESS":
        return (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/10 text-green-600 border border-green-500/20 text-[11px] font-semibold whitespace-nowrap">
            <CheckCircle2 size={12} /> Thành công
          </div>
        );
      case "PENDING":
        return (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[11px] font-semibold whitespace-nowrap">
            <Clock size={12} /> Chờ thanh toán
          </div>
        );
      case "CANCELLED":
        return (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 border border-red-500/20 text-[11px] font-semibold whitespace-nowrap">
            <XCircle size={12} /> Đã hủy
          </div>
        );
      default:
        return <span className="text-gray-500 text-[11px] font-medium">{status}</span>;
    }
  };

  const isOnline = channel === "ONLINE";
  const pageTitle = isOnline ? "Đặt vé online" : "Đặt vé tại quầy";

  return (
    <div className="flex flex-col h-full bg-[#F4F5F7] p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Ticket size={22} className="text-primary-600" />
            {pageTitle}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {isOnline
              ? "Theo dõi các đơn do khách hàng đặt trên website."
              : "Theo dõi các đơn do nhân viên tạo trực tiếp tại quầy."}{" "}
            Tổng cộng: {totalElements} đơn
          </p>
        </div>
      </div>

      <form
        onSubmit={handleApplyFilters}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
            <Filter size={15} className="text-primary-600" />
            Bộ lọc đặt vé
            {activeFilterCount > 0 && (
              <span className="text-[11px] font-medium text-primary-700 bg-primary-50 border border-primary-100 rounded-full px-1.5 py-0.5">
                {activeFilterCount} bộ lọc
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="h-8 px-2.5 rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors text-xs font-medium flex items-center gap-1"
            >
              <RotateCcw size={13} />
              Đặt lại
            </button>
            <button
              type="submit"
              className="h-8 px-3 rounded-md bg-primary-600 text-white hover:bg-primary-700 transition-colors text-xs font-semibold flex items-center gap-1"
            >
              <Search size={13} />
              Lọc vé
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-2.5">
          <label className="xl:col-span-3">
            <span className="block text-[11px] font-semibold text-gray-500 mb-1">Từ khóa</span>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={filters.keyword}
                onChange={(event) => updateFilter("keyword", event.target.value)}
                placeholder="Mã vé, khách hàng, email, phim, phòng..."
                className="w-full h-8 pl-8 pr-2.5 rounded-md border border-gray-200 bg-white text-xs text-gray-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </label>

          <label className="xl:col-span-2">
            <span className="block text-[11px] font-semibold text-gray-500 mb-1">Trạng thái</span>
            <select
              value={filters.status}
              onChange={(event) => updateFilter("status", event.target.value as BookingFilters["status"])}
              className="w-full h-8 px-2.5 rounded-md border border-gray-200 bg-white text-xs text-gray-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            >
              {BOOKING_STATUS_OPTIONS.map((option) => (
                <option key={option.value || "NONE"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="xl:col-span-2">
            <span className="block text-[11px] font-semibold text-gray-500 mb-1">Ngày chiếu từ</span>
            <input
              type="date"
              value={filters.showDateFrom}
              onChange={(event) => updateFilter("showDateFrom", event.target.value)}
              className="w-full h-8 px-2.5 rounded-md border border-gray-200 bg-white text-xs text-gray-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </label>

          <label className="xl:col-span-2">
            <span className="block text-[11px] font-semibold text-gray-500 mb-1">Ngày chiếu đến</span>
            <input
              type="date"
              value={filters.showDateTo}
              onChange={(event) => updateFilter("showDateTo", event.target.value)}
              className="w-full h-8 px-2.5 rounded-md border border-gray-200 bg-white text-xs text-gray-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </label>

          <label className="xl:col-span-1">
            <span className="block text-[11px] font-semibold text-gray-500 mb-1">Tạo từ</span>
            <input
              type="date"
              value={filters.createdFrom}
              onChange={(event) => updateFilter("createdFrom", event.target.value)}
              className="w-full h-8 px-2 rounded-md border border-gray-200 bg-white text-xs text-gray-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </label>

          <label className="xl:col-span-2">
            <span className="block text-[11px] font-semibold text-gray-500 mb-1">Tạo đến</span>
            <input
              type="date"
              value={filters.createdTo}
              onChange={(event) => updateFilter("createdTo", event.target.value)}
              className="w-full h-8 px-2.5 rounded-md border border-gray-200 bg-white text-xs text-gray-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </label>
        </div>
      </form>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[11px] tracking-wide text-gray-500 font-semibold">
                <th className="px-4 py-2.5">Mã vé</th>
                <th className="px-4 py-2.5">{isOnline ? "Khách hàng" : "Nhân viên phụ trách"}</th>
                {!isOnline && <th className="px-4 py-2.5">Loại khách hàng</th>}
                <th className="px-4 py-2.5">Phim / suất chiếu</th>
                <th className="px-4 py-2.5">Ghế / bắp nước</th>
                <th className="px-4 py-2.5">Tổng tiền</th>
                <th className="px-4 py-2.5">Trạng thái</th>
                <th className="px-4 py-2.5">Thời gian tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={isOnline ? 7 : 8} className="px-4 py-10 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
                    <span className="text-xs text-gray-500">Đang tải dữ liệu...</span>
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={isOnline ? 7 : 8} className="px-4 py-10 text-center text-xs text-gray-500">
                    {activeFilterCount > 0
                      ? "Không tìm thấy đơn vé phù hợp bộ lọc."
                      : `Chưa có đơn đặt vé ${isOnline ? "online" : "tại quầy"}.`}
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => {
                  const concessionItems = [...(booking.combos || []), ...(booking.foodItems || [])];
                  const presentationLabel = formatPresentationLabelFromFields(booking);

                  return (
                    <tr key={booking.bookingId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                        #{booking.bookingId}
                      </td>
                      <td className="px-4 py-3 min-w-[150px]">
                        <div className="font-medium text-gray-900">
                          {isOnline ? booking.username : booking.staffUsername || "Chưa xác định"}
                        </div>
                        <div
                          className="text-[11px] text-gray-500 truncate max-w-[180px]"
                          title={isOnline ? booking.email : booking.staffEmail || undefined}
                        >
                          {isOnline ? booking.email : booking.staffEmail || "Không có thông tin nhân viên"}
                        </div>
                      </td>
                      {!isOnline && (
                        <td className="px-4 py-3 min-w-[170px]">
                          {booking.counterCustomerType === "ACCOUNT" ? (
                            <div>
                              <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                                Có tài khoản
                              </span>
                              <div className="mt-1 font-medium text-gray-900">{booking.username}</div>
                              <div className="max-w-[180px] truncate text-[11px] text-gray-500" title={booking.email}>
                                {booking.email}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                              Khách vãng lai
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 min-w-[210px]">
                        <div className="font-semibold text-gray-900 truncate max-w-[240px]" title={booking.movieTitle}>
                          {booking.movieTitle}
                        </div>
                        <div className="text-[11px] text-gray-600 mt-0.5">
                          {booking.cinemaRoomName} • {booking.startTime} ({new Date(booking.showDate).toLocaleDateString("vi-VN")})
                        </div>
                        {presentationLabel && (
                          <div className="mt-1 inline-flex rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                            {presentationLabel}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 min-w-[180px]">
                        <div className="text-gray-900 font-medium">
                          Ghế: <span className="text-primary-600">{booking.seatCodes.join(", ") || "N/A"}</span>
                        </div>
                        {concessionItems.length > 0 && (
                          <div className="text-[11px] text-gray-500 mt-0.5 truncate max-w-[190px]" title={concessionItems.join(", ")}>
                            Bắp nước: {concessionItems.join(", ")}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                        {formatCurrency(booking.totalAmount)}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(booking.status)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-[11px] whitespace-nowrap">
                        {new Date(booking.createdAt).toLocaleString("vi-VN")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Trang {currentPage} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || loading}
                className="px-2.5 py-1 border border-gray-300 rounded-md bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Trước
              </button>
              <button
                onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || loading}
                className="px-2.5 py-1 border border-gray-300 rounded-md bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Tiếp
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
