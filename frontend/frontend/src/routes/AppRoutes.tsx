import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import { MainLayout } from "@/layouts/MainLayout";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { DASHBOARD_ENTRY_SCOPES } from "@/utils/dashboardAccess";
import { useAuthToken } from "@/hooks/useAuthToken";

const LandingPage = lazy(() => import("@/pages/customer/LandingPage"));
const MovieDetailPage = lazy(() => import("@/pages/customer/MovieDetailPage"));
const NowShowingPage = lazy(() => import("@/pages/customer/NowShowingPage"));
const ComingSoonPage = lazy(() => import("@/pages/customer/ComingSoonPage"));
const ScreeningDatePage = lazy(() => import("@/pages/customer/ScreeningDatePage"));
const CustomerPromotionsPage = lazy(() => import("@/pages/customer/CustomerPromotionsPage").then(module => ({ default: module.CustomerPromotionsPage })));
const BookingPage = lazy(() => import("@/pages/customer/BookingPage"));
const ProfilePage = lazy(() => import("@/pages/customer/ProfilePage"));
const ZaloPayPaymentPage = lazy(() => import("@/pages/customer/ZaloPayPaymentPage"));
const ZaloPayReturnPage = lazy(() => import("@/pages/customer/ZaloPayReturnPage"));
const MomoReturnPage = lazy(() => import("@/pages/customer/MomoReturnPage"));
const TicketVerificationPage = lazy(() => import("@/pages/customer/TicketVerificationPage"));
const RewardVerificationPage = lazy(() => import("@/pages/staff/RewardVerificationPage"));
const AuthFlow = lazy(() =>
    import("@/pages/auth/AuthPage").then((module) => ({ default: module.AuthFlow }))
);
const AdminDashboard = lazy(() =>
    import("@/pages/admin/AdminDashboard").then((module) => ({ default: module.AdminDashboard }))
);

function RouteFallback() {
    return (
        <div
            role="status"
            aria-live="polite"
            style={{
                minHeight: "45vh",
                display: "grid",
                placeItems: "center",
                color: "#64748b",
                fontWeight: 600,
            }}
        >
            Đang tải trang…
        </div>
    );
}

function AppRoutes() {
    const isAuthenticated = useAuthToken() !== null;
    const location = useLocation();

    return (
        <RouteErrorBoundary resetKey={location.key}>
            <Suspense fallback={<RouteFallback />}>
                <Routes>
                    <Route element={<MainLayout />}>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/movies/now-showing" element={<NowShowingPage />} />
                        <Route path="/movies/coming-soon" element={<ComingSoonPage />} />
                        <Route path="/screening-date" element={<ScreeningDatePage />} />
                        <Route path="/promotions" element={<CustomerPromotionsPage />} />
                        <Route path="/movies/:id" element={<MovieDetailPage />} />
                        <Route path="/tickets/:token" element={<TicketVerificationPage />} />
                        <Route path="/rewards/:code" element={<RewardVerificationPage />} />
                        <Route path="/booking/:showtimeId" element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
                        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                        <Route path="/payment/zalopay/return" element={<ZaloPayReturnPage />} />
                        <Route path="/payment/momo/return" element={<MomoReturnPage />} />
                        <Route path="/payment/zalopay/:bookingId" element={<ProtectedRoute><ZaloPayPaymentPage /></ProtectedRoute>} />
                    </Route>

                    <Route
                        path="/auth"
                        element={isAuthenticated ? <Navigate to="/" replace /> : <AuthFlow />}
                    />

                    <Route element={<ProtectedRoute allowedScopes={DASHBOARD_ENTRY_SCOPES} />}>
                        <Route path="/admin" element={<AdminDashboard />} />
                    </Route>
                </Routes>
            </Suspense>
        </RouteErrorBoundary>
    );
}

export default AppRoutes;
