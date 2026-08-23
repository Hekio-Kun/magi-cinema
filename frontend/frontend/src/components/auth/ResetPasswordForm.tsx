import { useState, useRef } from "react";
import { Film, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2 } from "lucide-react";
import { authService } from "@/api/authApi";
import { getApiErrorMessage } from "@/api/errors";
import { isStrongPassword, PASSWORD_POLICY_MESSAGE, passwordRequirements } from "@/utils/passwordPolicy";

interface ResetPasswordFormProps {
  onBack: () => void;
  onSuccess: () => void;
  initialToken?: string;
  initialEmail?: string;
}

// ── Design tokens — matches landing page palette ──
const ACCENT_SLATE = "#4B5563";
const TEXT_PRIMARY = "#111827";
const TEXT_MUTED   = "#6B7280";

function PasswordField({
  label,
  placeholder,
  value,
  onChange,
  show,
  onToggle,
  disabled,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  return (
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
        {label}
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
          boxShadow: focused ? "0 0 0 3px rgba(75,85,99,0.12), 0 2px 8px rgba(0,0,0,0.04)" : "0 1px 4px rgba(0,0,0,0.04)",
          opacity: disabled ? 0.6 : 1,
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
          <Lock size={16} />
        </span>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
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
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          style={{
            color: "#9CA3AF",
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            padding: 4,
            flexShrink: 0,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = ACCENT_SLATE)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "#9CA3AF")
          }
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

export function ResetPasswordForm({ onBack, onSuccess, initialToken, initialEmail = "" }: ResetPasswordFormProps) {
  const OTP_LENGTH = 6;
  const [email, setEmail] = useState(initialEmail);
  const [digits, setDigits] = useState<string[]>(() => {
    if (initialToken && initialToken.length === OTP_LENGTH) {
      return initialToken.split("");
    }
    return Array(OTP_LENGTH).fill("");
  });
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [btnHovered, setBtnHovered] = useState(false);

  const focusInput = (i: number) => {
    inputsRef.current[i]?.focus();
    inputsRef.current[i]?.select();
  };

  const handleDigitChange = (i: number, value: string) => {
    const char = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[i] = char;
      return next;
    });
    if (char && i < OTP_LENGTH - 1) focusInput(i + 1);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      focusInput(i - 1);
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      focusInput(i - 1);
    } else if (e.key === "ArrowRight" && i < OTP_LENGTH - 1) {
      e.preventDefault();
      focusInput(i + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((c, idx) => (next[idx] = c));
    setDigits(next);
    focusInput(Math.min(pasted.length, OTP_LENGTH - 1));
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email.trim()) {
      setErrorMessage("Vui lòng nhập email của bạn.");
      return;
    }

    const tokenStr = digits.join("");
    if (tokenStr.length < OTP_LENGTH) {
      setErrorMessage("Vui lòng nhập đủ 6 số mã xác nhận.");
      return;
    }
    if (!isStrongPassword(newPassword)) {
      setErrorMessage(PASSWORD_POLICY_MESSAGE);
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(email.trim(), tokenStr, newPassword);
      setIsDone(true);
      setTimeout(() => onSuccess(), 2500);
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, "Token không hợp lệ hoặc đã hết hạn. Vui lòng thử lại."));
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
      {isDone ? (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(22,163,74,0.1)",
              border: "1.5px solid rgba(22,163,74,0.25)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              color: "#16A34A",
            }}
          >
            <CheckCircle2 size={28} />
          </div>
          <div>
            <h2
              style={{
                color: TEXT_PRIMARY,
                fontSize: 22,
                fontWeight: 800,
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              Đặt lại thành công!
            </h2>
            <p
              style={{
                color: TEXT_MUTED,
                fontSize: 14,
                marginTop: 8,
                lineHeight: 1.6,
              }}
            >
              Mật khẩu của bạn đã được cập nhật.
              <br />
              Đang chuyển sang trang đăng nhập...
            </p>
          </div>
        </div>
      ) : (
        <>
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
              Đặt lại mật khẩu
            </h1>
            <p
              style={{
                color: TEXT_MUTED,
                fontSize: 14,
                marginTop: 8,
                lineHeight: 1.6,
              }}
            >
              Nhập email, mã OTP từ email và mật khẩu mới của bạn.
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
                Email tài khoản
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "0 16px",
                  height: 52,
                  background: "rgba(255,255,255,0.75)",
                  border: "1.5px solid rgba(209,213,219,0.9)",
                  borderRadius: 12,
                  backdropFilter: "blur(8px)",
                }}
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email tài khoản của bạn"
                  disabled={isLoading}
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

            {/* OTP field */}
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
                Mã xác nhận (OTP)
              </label>
              <div
                style={{ display: "flex", justifyContent: "space-between", gap: 8 }}
                onPaste={handlePaste}
              >
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputsRef.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onFocus={(e) => e.target.select()}
                    disabled={isLoading}
                    style={{
                      width: "100%",
                      height: 52,
                      background: digit ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.65)",
                      border: digit ? "1.5px solid #4B5563" : "1.5px solid rgba(209,213,219,0.9)",
                      borderRadius: 12,
                      textAlign: "center",
                      fontSize: 20,
                      fontWeight: 600,
                      color: TEXT_PRIMARY,
                      transition: "all 0.2s ease",
                      boxShadow: digit ? "0 2px 8px rgba(0,0,0,0.04)" : "none",
                      outline: "none",
                      backdropFilter: "blur(8px)",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* New password */}
            <PasswordField
              label="Mật khẩu mới"
              placeholder="Tối thiểu 8 ký tự"
              value={newPassword}
              onChange={setNewPassword}
              show={showNew}
              onToggle={() => setShowNew(!showNew)}
              disabled={isLoading}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 10px", marginTop: -8 }}>
              {passwordRequirements(newPassword).map(({ label, met }) => (
                <span key={label} style={{ color: met ? "#16A34A" : "#9CA3AF", fontSize: 11 }}>
                  {met ? "✓" : "○"} {label}
                </span>
              ))}
            </div>

            {/* Confirm password */}
            <PasswordField
              label="Xác nhận mật khẩu mới"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirm}
              onToggle={() => setShowConfirm(!showConfirm)}
              disabled={isLoading}
            />

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
              {isLoading ? "Đang xử lý..." : "Xác nhận đặt lại mật khẩu"}
            </button>
          </form>

          {/* Back */}
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
              !isLoading &&
              (e.currentTarget.style.color = TEXT_PRIMARY)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = TEXT_MUTED)
            }
          >
            <ArrowLeft size={15} />
            Quay lại đăng nhập
          </button>
        </>
      )}
    </div>
  );
}
