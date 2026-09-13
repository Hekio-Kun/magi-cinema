import { useState } from "react";
import { Mail, ArrowLeft } from "lucide-react";
import { authService } from "@/api/authApi";
import { getApiErrorMessage } from "@/api/errors";
import { BrandLogo } from "@/components/BrandLogo";

interface ForgotPasswordFormProps {
  onBack: () => void;
  onEmailSent: (email: string) => void;
}

// ── Design tokens — matches landing page palette ──
const ACCENT_SLATE = "#4B5563";
const TEXT_PRIMARY = "#111827";
const TEXT_MUTED   = "#6B7280";

export function ForgotPasswordForm({ onBack, onEmailSent }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [focused, setFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [btnHovered, setBtnHovered] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage("Vui lòng nhập địa chỉ email.");
      return;
    }
    setErrorMessage("");
    setIsLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      // API luôn trả 200 dù email có tồn tại hay không (bảo mật)
      onEmailSent(email.trim());
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, "Đã xảy ra lỗi. Vui lòng thử lại."));
      setIsLoading(false);
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
        <BrandLogo size="md" />
      </div>

      {/* Heading */}
      <div style={{ marginBottom: 28 }}>
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
          Quên mật khẩu?
        </h1>
        <p
          style={{
            color: TEXT_MUTED,
            fontSize: 14,
            marginTop: 8,
            lineHeight: 1.6,
          }}
        >
          Nhập email của bạn và chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        {/* Email field */}
        <div>
          <label
            style={{
              display: "block",
              color: "#374151",
              fontSize: 13,
              marginBottom: 7,
              fontWeight: 600,
              letterSpacing: "0.01em",
            }}
          >
            Địa chỉ email
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0 16px",
              height: 52,
              background: focused ? "#ffffff" : "rgba(255,255,255,0.75)",
              border: focused
                ? "1.5px solid #4B5563"
                : "1.5px solid rgba(209,213,219,0.9)",
              borderRadius: 12,
              transition: "all 0.2s ease",
              boxShadow: focused
                ? "0 0 0 3px rgba(75,85,99,0.12), 0 2px 8px rgba(0,0,0,0.04)"
                : "0 1px 4px rgba(0,0,0,0.04)",
              opacity: isLoading ? 0.6 : 1,
              backdropFilter: "blur(8px)",
            }}
          >
            <span
              style={{
                color: focused ? ACCENT_SLATE : "#9CA3AF",
                flexShrink: 0,
                display: "flex",
              }}
            >
              <Mail size={16} />
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="your@email.com"
              disabled={isLoading}
              autoComplete="email"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: TEXT_PRIMARY,
                fontSize: 14,
                fontFamily: "inherit",
              }}
            />
          </div>
        </div>

        {/* Error */}
        {errorMessage && (
          <div
            style={{
              background: "rgba(220,38,38,0.06)",
              border: "1.5px solid rgba(220,38,38,0.2)",
              borderRadius: 10,
              padding: "10px 14px",
              color: "#DC2626",
              fontSize: 13,
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          style={{
            width: "100%",
            height: 52,
            background: isLoading
              ? "rgba(75,85,99,0.45)"
              : "linear-gradient(135deg, #4B5563, #374151)",
            border: "none",
            borderRadius: 12,
            color: "#ffffff",
            fontSize: 15,
            fontWeight: 700,
            cursor: isLoading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            transition: "all 0.2s ease",
            boxShadow:
              btnHovered && !isLoading
                ? "0 8px 28px rgba(75,85,99,0.45)"
                : "0 4px 16px rgba(75,85,99,0.3)",
            marginTop: 4,
            letterSpacing: "0.02em",
            transform: btnHovered && !isLoading ? "translateY(-1px)" : "translateY(0)",
          }}
        >
          {isLoading ? "Đang gửi..." : "Gửi hướng dẫn"}
        </button>
      </form>

      {/* Back to login */}
      <button
        type="button"
        onClick={onBack}
        disabled={isLoading}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          width: "100%",
          marginTop: 20,
          background: "none",
          border: "none",
          cursor: isLoading ? "not-allowed" : "pointer",
          color: TEXT_MUTED,
          fontSize: 14,
          fontFamily: "inherit",
          fontWeight: 500,
          transition: "color 0.15s",
          padding: 0,
        }}
        onMouseEnter={(e) =>
          !isLoading && (e.currentTarget.style.color = TEXT_PRIMARY)
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
