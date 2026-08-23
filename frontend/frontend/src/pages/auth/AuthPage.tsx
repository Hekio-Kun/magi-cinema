import * as React from "react";
import { Film, ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm, type RegisterData } from "@/components/auth/RegisterForm";
import { OtpView } from "@/components/auth/otp-view";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { ForgotPasswordSent } from "@/components/auth/ForgotPasswordSent";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

const CINEMA_BG =
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaW5lbWElMjB0aGVhdGVyJTIwZGFyayUyMGRyYW1hdGljJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzgyMjE1Nzc2fDA&ixlib=rb-4.1.0&q=80&w=1080";

type Step = "login" | "signup" | "otp" | "forgot" | "forgot-sent" | "reset-password";

function getInitialStep(mode: string | null): Step {
  if (mode === "register") {
    return "signup";
  }
  if (mode === "otp") {
    return "otp";
  }
  if (mode === "forgot") {
    return "forgot";
  }
  if (mode === "forgot-sent") {
    return "forgot-sent";
  }
  if (mode === "reset-password") {
    return "reset-password";
  }
  return "login";
}

function getModeForStep(step: Step): string {
  return step === "signup" ? "register" : step;
}

export function AuthFlow() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [registerData, setRegisterData] = React.useState<RegisterData | null>(null);
  const [forgotEmail, setForgotEmail] = React.useState<string>("");

  const requestedMode = searchParams.get("mode");
  const requestedStep = getInitialStep(requestedMode);
  const step =
    requestedStep === "otp" && !registerData
      ? "signup"
      : requestedStep === "forgot-sent" && !forgotEmail
        ? "forgot"
        : requestedStep;

  React.useEffect(() => {
    if (requestedMode !== getModeForStep(step)) {
      setSearchParams({ mode: getModeForStep(step) }, { replace: true });
    }
  }, [requestedMode, setSearchParams, step]);

  const setAuthStep = React.useCallback(
    (nextStep: Step) => {
      setSearchParams({ mode: getModeForStep(nextStep) }, { replace: true });
    },
    [setSearchParams],
  );

  const handleBack = () => {
    if (step === "login" || step === "signup") {
      navigate("/");
      return;
    }
    setAuthStep("login");
  };

  const showBackButton = step === "login" || step === "signup" || step === "forgot" || step === "forgot-sent" || step === "reset-password";

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        input::placeholder { color: rgba(17,24,39,0.32) !important; }
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: none;
          cursor: pointer;
          opacity: 0.5;
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(75,85,99,0.18); border-radius: 2px; }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes authBlobFloat {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.04); }
        }
      `}</style>

      <div
        style={{
          background: "#EEF1F4",
          minHeight: "100vh",
          display: "flex",
          fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* ===== LEFT PANEL — Cinema image (desktop only) ===== */}
        <div
          className="hidden lg:flex"
          style={{ flex: 1, flexDirection: "column", position: "relative", overflow: "hidden", minHeight: "100vh" }}
        >
          <img
            src={CINEMA_BG}
            alt="Cinema theater"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
          />
          {/* Overlay matching landing page hero style */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(238,241,244,0.18) 0%, rgba(238,241,244,0.5) 100%)" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(238,241,244,0.45) 0%, transparent 30%, transparent 55%, rgba(238,241,244,0.85) 100%)" }} />

          <div style={{ position: "relative", zIndex: 10, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "40px 44px" }}>
            {/* Logo — matches Header.tsx */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "linear-gradient(135deg, #4B5563, #374151)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 12px rgba(75,85,99,0.35)"
              }}>
                <Film size={18} color="white" />
              </div>
              <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.01em" }}>
                Magi<span style={{ color: "#4B5563" }}>Cinema</span>
              </span>
            </div>

            {/* Bottom text & stats — matches Hero.tsx style */}
            <div>
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5"
                style={{
                  background: "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(209,213,219,0.8)",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4B5563", display: "inline-block" }} />
                <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#4B5563", letterSpacing: "0.15em" }}>
                  Đang chiếu — Phim nổi bật
                </span>
              </div>
              <h2 style={{ color: "#111827", fontSize: 32, fontWeight: 800, lineHeight: 1.1, margin: "0 0 10px 0", letterSpacing: "-0.03em" }}>
                Trải nghiệm điện ảnh<br />
                <span style={{
                  color: "#4B5563",
                  background: "linear-gradient(135deg,#4B5563,#8B949E)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text"
                }}>
                  Chưa từng có
                </span>
              </h2>
              <p style={{ color: "#6B7280", fontSize: 14, marginTop: 10, lineHeight: 1.6, maxWidth: 340 }}>
                Đắm mình trong những câu chuyện kỳ diệu trên màn hình IMAX cao cấp với âm thanh vòm sống động.
              </p>
              <div style={{ display: "flex", gap: 32, marginTop: 28 }}>
                {[
                  { value: "50+", label: "Màn hình" },
                  { value: "4K", label: "Chiếu phim laser" },
                  { value: "Đa chiều", label: "Âm thanh sống động" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div style={{ color: "#111827", fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{stat.value}</div>
                    <div style={{ color: "#9CA3AF", fontSize: "0.72rem", letterSpacing: "0.1em", marginTop: 3 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ===== RIGHT PANEL ===== */}
        <div
          className="w-full lg:w-[500px]"
          style={{
            width: "100%",
            maxWidth: 500,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflowY: "auto",
            minHeight: "100vh",
            padding: "32px 24px",
            background: "#EEF1F4",
          }}
        >
          {/* Decorative blob — matches Hero.tsx */}
          <div
            style={{
              position: "absolute",
              top: -60,
              left: "50%",
              transform: "translateX(-50%)",
              width: 420,
              height: 420,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(139,148,158,0.12) 0%, transparent 65%)",
              pointerEvents: "none",
              animation: "authBlobFloat 7s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -40,
              right: -60,
              width: 300,
              height: 300,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(75,85,99,0.07) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          {showBackButton && (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Quay lại"
              style={{
                position: "absolute",
                top: 24,
                left: 24,
                zIndex: 3,
                width: 40,
                height: 40,
                borderRadius: 12,
                border: "1px solid rgba(209,213,219,0.9)",
                background: "rgba(255,255,255,0.78)",
                color: "#374151",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                backdropFilter: "blur(12px)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#ffffff";
                e.currentTarget.style.borderColor = "#9CA3AF";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.78)";
                e.currentTarget.style.borderColor = "rgba(209,213,219,0.9)";
              }}
            >
              <ArrowLeft size={18} />
            </button>
          )}

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2.5 mb-6 self-start" style={{ paddingLeft: 52 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: "linear-gradient(135deg, #4B5563, #374151)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(75,85,99,0.3)"
            }}>
              <Film size={17} color="white" />
            </div>
            <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.01em" }}>
              Magi<span style={{ color: "#4B5563" }}>Cinema</span>
            </span>
          </div>

          {/* Form container */}
          <div style={{ width: "100%", maxWidth: 460, position: "relative", zIndex: 1 }}>
            <div key={step} style={{ animation: "fadeSlideIn 0.3s ease" }}>
              {step === "login" && (
                <LoginForm
                  onSwitch={() => setAuthStep("signup")}
                  onForgotPassword={() => setAuthStep("forgot")}
                />
              )}

              {step === "signup" && (
                <RegisterForm
                  onSwitch={() => setAuthStep("login")}
                  onRegistered={(data) => {
                    setRegisterData(data);
                    setAuthStep("otp");
                  }}
                />
              )}

              {step === "otp" && registerData && (
                <OtpView
                  registerData={registerData}
                  onBack={() => setAuthStep("signup")}
                  onVerified={() => setAuthStep("login")}
                />
              )}

              {step === "forgot" && (
                <ForgotPasswordForm
                  onBack={() => setAuthStep("login")}
                  onEmailSent={(email) => {
                    setForgotEmail(email);
                    setAuthStep("forgot-sent");
                  }}
                />
              )}

              {step === "forgot-sent" && (
                <ForgotPasswordSent
                  email={forgotEmail}
                  onBack={() => setAuthStep("login")}
                  onBackToEmail={() => setAuthStep("forgot")}
                  onEnterToken={() => setAuthStep("reset-password")}
                />
              )}

              {step === "reset-password" && (
                <ResetPasswordForm
                  initialEmail={forgotEmail || searchParams.get("email") || ""}
                  initialToken={searchParams.get("token") || ""}
                  onBack={() => setAuthStep("login")}
                  onSuccess={() => setAuthStep("login")}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
