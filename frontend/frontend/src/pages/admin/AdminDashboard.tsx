import { lazy, Suspense, useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { AdminHeader } from "@/components/dashboard/AdminHeader";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  DASHBOARD_PAGE_ACCESS,
  canAccessDashboardPage,
  canManageDashboardData,
  getFirstAccessibleDashboardPage,
} from "@/utils/dashboardAccess";

const DashboardContent = lazy(() =>
  import("@/components/dashboard/DashboardContent").then((module) => ({ default: module.DashboardContent }))
);
const RolesPermissionsPage = lazy(() =>
  import("@/components/dashboard/RolesPermissionsPage").then((module) => ({ default: module.RolesPermissionsPage }))
);
const UserManagementPage = lazy(() =>
  import("@/components/dashboard/UserManagementPage").then((module) => ({ default: module.UserManagementPage }))
);
const MovieManagementPage = lazy(() =>
  import("@/components/dashboard/MovieManagementPage").then((module) => ({ default: module.MovieManagementPage }))
);
const GenreManagementPage = lazy(() =>
  import("@/components/dashboard/GenreManagementPage").then((module) => ({ default: module.GenreManagementPage }))
);
const CinemaRoomManagementPage = lazy(() =>
  import("@/components/dashboard/CinemaRoomManagementPage").then((module) => ({ default: module.CinemaRoomManagementPage }))
);
const ShowtimeManagementPage = lazy(() =>
  import("@/components/dashboard/ShowtimeManagementPage").then((module) => ({ default: module.ShowtimeManagementPage }))
);
const TicketPricingManagementPage = lazy(() =>
  import("@/components/dashboard/TicketPricingManagementPage").then((module) => ({ default: module.TicketPricingManagementPage }))
);
const BookingManagementPage = lazy(() =>
  import("@/components/dashboard/BookingManagementPage").then((module) => ({ default: module.BookingManagementPage }))
);
const StaffTicketSalesPage = lazy(() =>
  import("@/components/dashboard/StaffTicketSalesPage").then((module) => ({ default: module.StaffTicketSalesPage }))
);
const ComboManagementPage = lazy(() =>
  import("@/components/dashboard/ComboManagementPage").then((module) => ({ default: module.ComboManagementPage }))
);
const MembershipManagementPage = lazy(() =>
  import("@/components/dashboard/MembershipManagementPage").then((module) => ({ default: module.MembershipManagementPage }))
);
const ReportsPage = lazy(() =>
  import("@/components/dashboard/ReportsPage").then((module) => ({ default: module.ReportsPage }))
);
const PromotionManagementPage = lazy(() =>
  import("@/components/dashboard/PromotionManagementPage").then((module) => ({ default: module.PromotionManagementPage }))
);
const CustomerContactManagementPage = lazy(() =>
  import("@/components/dashboard/CustomerContactManagementPage").then((module) => ({ default: module.CustomerContactManagementPage }))
);
const DASHBOARD_PAGE_LABELS = Object.keys(DASHBOARD_PAGE_ACCESS);

const PlaceholderPage = ({ pageName }: { pageName: string }) => (
  <div
    style={{
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#F4F5F7",
      fontFamily: "Inter, sans-serif",
    }}
  >
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🚧</div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1A1A2E", margin: 0 }}>{pageName}</h1>
      <p style={{ fontSize: 13, color: "#6B7280", marginTop: 6 }}>Trang này đang được xây dựng.</p>
    </div>
  </div>
);

const AccessDeniedPage = ({ pageName }: { pageName: string }) => (
  <div
    style={{
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#F4F5F7",
      fontFamily: "Inter, sans-serif",
    }}
  >
    <div style={{ textAlign: "center", maxWidth: 420 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>Không có quyền truy cập</h1>
      <p style={{ fontSize: 14, color: "#6B7280", marginTop: 8 }}>
        Tài khoản hiện tại không được phép tương tác với mục "{pageName}".
      </p>
    </div>
  </div>
);

const DashboardPageFallback = () => (
  <div
    style={{
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#F4F5F7",
      color: "#6B7280",
      fontFamily: "Inter, sans-serif",
      fontSize: 14,
      fontWeight: 600,
    }}
  >
    Đang tải trang quản trị...
  </div>
);

export function AdminDashboard() {
  const [requestedPage, setRequestedPage] = useState("Tổng quan");
  const { roles, scopes } = useCurrentUser();
  const canManage = canManageDashboardData(roles, scopes);
  const activePage = canAccessDashboardPage(requestedPage, roles, scopes)
    ? requestedPage
    : getFirstAccessibleDashboardPage(DASHBOARD_PAGE_LABELS, roles, scopes);

  const renderContent = () => {
    if (!canAccessDashboardPage(activePage, roles, scopes)) {
      return <AccessDeniedPage pageName={activePage} />;
    }

    switch (activePage) {
      case "Tổng quan":
        return <DashboardContent />;
      case "Báo cáo & thống kê":
        return <ReportsPage />;
      case "Vai trò & quyền hạn":
        return <RolesPermissionsPage />;
      case "Nhân viên":
        return <UserManagementPage key="staff" type="staff" />;
      case "Khách hàng & thành viên":
        return <UserManagementPage key="customers" type="customers" />;
      case "Hội viên":
        return <MembershipManagementPage />;
      case "Quản lý phim":
        return <MovieManagementPage />;
      case "Thể loại":
        return <GenreManagementPage />;
      case "Phòng chiếu":
        return <CinemaRoomManagementPage canManage={canManage} />;
      case "Lịch chiếu & ghế":
        return <ShowtimeManagementPage canManage={canManage} />;
      case "Cấu hình giá vé":
        return <TicketPricingManagementPage />;
      case "Bán vé tại quầy":
        return <StaffTicketSalesPage />;
      case "Đặt vé online":
        return <BookingManagementPage key="online-bookings" channel="ONLINE" />;
      case "Đặt vé tại quầy":
        return <BookingManagementPage key="counter-bookings" channel="COUNTER" />;
      case "Combo & bắp nước":
        return <ComboManagementPage canManage={canManage} />;
      case "Khuyến mãi":
        return <PromotionManagementPage />;
      case "Góp ý & phản hồi":
        return <CustomerContactManagementPage />;
      default:
        return <PlaceholderPage pageName={activePage} />;
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100%",
        minWidth: 1280,
        fontFamily: "Inter, sans-serif",
        overflow: "hidden",
      }}
    >
      <Sidebar activePage={activePage} onNavigate={setRequestedPage} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <AdminHeader activePage={activePage} onNavigate={setRequestedPage} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Suspense fallback={<DashboardPageFallback />}>
            {renderContent()}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
