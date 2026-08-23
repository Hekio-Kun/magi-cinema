import { useState } from "react";
import { Film, Mail, ArrowLeft, RefreshCw, Edit2 } from "lucide-react";
import { authService } from "@/api/authApi";

interface ForgotPasswordSentProps {
  email: string;
  onBack: () => void;
  onBackToEmail: () => void;
  onEnterToken: () => void;
}

// ── Design tokens — matches landing page palette ──
const ACCENT_SLATE = "#4B5563";
const TEXT_PRIMARY = "#111827";
const TEXT_MUTED   = "#6B7280";

export function ForgotPasswordSent({
  email,
  onBack,
  onBackToEmail,
  onEnterToken,
}: ForgotPasswordSentProps) {
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const handleResend = async () => {
    setIsResending(true);
    setResendMessage("");
    try {
      await authService.forgotPassword(email);
      setResendMessage("Mã xác nhận mới đã được gửi!");
    } catch {
      setResendMessage("Có lỗi xảy ra, vui lòng thử lại sau.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        background: "rgba(255,255,255,0.8)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        border: "1.5px solid rgba(209,213,219,0.9)",
        borderRadius: 24,
        padding: "40px 36px",
        boxShadow: "0 8px 40px rgba(0,0,0,0.07), 0 0 0 1px rgba(255,255,255,0.9)",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #4B5563, #374151)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(75,85,99,0.3)",
          }}
        >
          <Film size={18} color="white" />
        </div>
        <span style={{ fontSize: "1.1rem", fontWeight: 800, color: TEXT_PRIMARY, letterSpacing: "-0.01em" }}>
          Magi<span style={{ color: ACCENT_SLATE }}>Cinema</span>
        </span>
      </div>

      {/* Icon */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "rgba(75,85,99,0.08)",
          border: "1.5px solid rgba(209,213,219,0.9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          boxShadow: "0 4px 16px rgba(75,85,99,0.1)",
        }}
      >
        <Mail size={28} color={ACCENT_SLATE} />
      </div>

      {/* Heading */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            color: TEXT_PRIMARY,
            fontSize: 26,
            fontWeight: 800,
            lineHeight: 1.2,
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Kiểm tra email của bạn
        </h1>
        <p
          style={{
            color: TEXT_MUTED,
            fontSize: 14,
            marginTop: 10,
            lineHeight: 1.65,
          }}
        >
          Nếu{" "}
          <span style={{ color: TEXT_PRIMARY, fontWeight: 600 }}>
            {email}
          </span>{" "}
          tồn tại trong hệ thống, chúng tôi đã gửi email chứa mã xác nhận (OTP) đặt lại mật
          khẩu. Vui lòng kiểm tra hộp thư (kể cả thư mục Spam).
        </p>
      </div>

      {resendMessage && (
        <div style={{ marginTop: 16, textAlign: "center", color: resendMessage.includes("lỗi") ? "#DC2626" : "#16A34A", fontSize: 13, fontWeight: 500 }}>
          {resendMessage}
        </div>
      )}

      {/* Action: nhập token */}
      <button
        type="button"
        onClick={onEnterToken}
        style={{
          width: "100%",
          height: 52,
          background: "linear-gradient(135deg, #4B5563, #374151)",
          border: "none",
          borderRadius: 12,
          color: "#ffffff",
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "all 0.2s ease",
          boxShadow: "0 4px 16px rgba(75,85,99,0.3)",
          letterSpacing: "0.02em",
          marginTop: 8,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "0 8px 28px rgba(75,85,99,0.45)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(75,85,99,0.3)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        Tôi đã nhận được mã xác nhận
      </button>

      {/* Resend */}
      <button
        type="button"
        onClick={handleResend}
        disabled={isResending}
        style={{
          width: "100%",
          height: 52,
          background: "rgba(255,255,255,0.6)",
          border: "1.5px solid rgba(209,213,219,0.8)",
          borderRadius: 12,
          color: "#374151",
          fontSize: 15,
          fontWeight: 600,
          cursor: isResending ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          transition: "all 0.2s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginTop: 12,
        }}
        onMouseEnter={(e) => {
          if (!isResending) {
            e.currentTarget.style.background = "#ffffff";
            e.currentTarget.style.borderColor = "#9CA3AF";
          }
        }}
        onMouseLeave={(e) => {
          if (!isResending) {
            e.currentTarget.style.background = "rgba(255,255,255,0.6)";
            e.currentTarget.style.borderColor = "rgba(209,213,219,0.8)";
          }
        }}
      >
        <RefreshCw size={16} className={isResending ? "animate-spin" : ""} />
        {isResending ? "Đang gửi..." : "Gửi lại mã xác nhận"}
      </button>

      {/* Back to Email */}
      <button
        type="button"
        onClick={onBackToEmail}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          width: "100%",
          marginTop: 20,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: TEXT_MUTED,
          fontSize: 14,
          fontFamily: "inherit",
          fontWeight: 500,
          transition: "color 0.15s",
          padding: 0,
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.color = TEXT_PRIMARY)
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.color = TEXT_MUTED)
        }
      >
        <Edit2 size={15} />
        Nhập lại email khác
      </button>

      {/* Back to Login */}
      <button
        type="button"
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          width: "100%",
          marginTop: 16,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: TEXT_MUTED,
          fontSize: 14,
          fontFamily: "inherit",
          fontWeight: 500,
          transition: "color 0.15s",
          padding: 0,
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.color = TEXT_PRIMARY)
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.color = TEXT_MUTED)
        }
      >
        <ArrowLeft size={15} />
        Quay lại đăng nhập
      </button>
    </div>
  );
}
