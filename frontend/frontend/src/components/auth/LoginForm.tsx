import { useState } from "react";
import { Eye, EyeOff, Film, User, Lock } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { authService } from "@/api/authApi";
import { userService } from "@/api/userApi";
import { getTokenRoles } from "@/utils/index";
import { canAccessDashboardFromScopes } from "@/utils/dashboardAccess";
import { notifyAuthChange, setAuthToken } from "@/utils/authSession";

interface LoginFormProps {
  onSwitch: () => void;
  onForgotPassword: () => void;
}

// ── Design tokens — matches landing page palette ──
const ACCENT_DARK  = "#374151";
const ACCENT_SLATE = "#4B5563";
const TEXT_PRIMARY = "#111827";
const TEXT_MUTED   = "#6B7280";

function InputField({
  icon,
  type = "text",
  placeholder,
  label,
  rightElement,
  value,
  onChange,
  disabled,
}: {
  icon: React.ReactNode;
  type?: string;
  placeholder: string;
  label: string;
  rightElement?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
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
            ? `1.5px solid #4B5563`
            : "1.5px solid rgba(209,213,219,0.9)",
          borderRadius: 12,
          transition: "all 0.2s ease",
          boxShadow: focused ? "0 0 0 3px rgba(75,85,99,0.12), 0 2px 8px rgba(0,0,0,0.04)" : "0 1px 4px rgba(0,0,0,0.04)",
          opacity: disabled ? 0.55 : 1,
          backdropFilter: "blur(8px)",
        }}
      >
        <span style={{ color: focused ? ACCENT_SLATE : "#9CA3AF", flexShrink: 0, display: "flex" }}>
          {icon}
        </span>
        <input
          type={type}
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
        {rightElement}
      </div>
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  showPassword,
  onToggle,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  showPassword: boolean;
  onToggle: () => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 16px",
        height: 52,
        background: focused ? "#ffffff" : "rgba(255,255,255,0.75)",
        border: focused ? "1.5px solid #4B5563" : "1.5px solid rgba(209,213,219,0.9)",
        borderRadius: 12,
        transition: "all 0.2s ease",
        boxShadow: focused ? "0 0 0 3px rgba(75,85,99,0.12), 0 2px 8px rgba(0,0,0,0.04)" : "0 1px 4px rgba(0,0,0,0.04)",
        opacity: disabled ? 0.55 : 1,
        backdropFilter: "blur(8px)",
      }}
    >
      <span style={{ color: focused ? ACCENT_SLATE : "#9CA3AF", flexShrink: 0, display: "flex" }}>
        <Lock size={16} />
      </span>
      <input
        type={showPassword ? "text" : "password"}
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
        onMouseEnter={(e) => (e.currentTarget.style.color = ACCENT_SLATE)}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
      >
        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export function LoginForm({ onSwitch, onForgotPassword }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [signInHovered, setSignInHovered] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    if (!username.trim() || !password.trim()) {
      setErrorMessage("Vui lòng nhập tên đăng nhập và mật khẩu.");
      setIsLoading(false);
      return;
    }

    try {
      const data = await authService.login({ username, password });

      if (data.authenticated) {
        setSuccessMessage("Đăng nhập thành công! Đang chuyển hướng...");
        setAuthToken(data.token);
        localStorage.setItem("username", username);
        
        try {
          const profile = await userService.getMyProfile();
          if (profile.avatarUrl) {
            localStorage.setItem("user_avatar", profile.avatarUrl);
          } else {
            localStorage.removeItem("user_avatar");
          }
        } catch (err) {
          console.error("Failed to fetch profile during login", err);
        }

        notifyAuthChange();

        const routeState = location.state as { from?: unknown } | null;
        const requestedPath =
          typeof routeState?.from === "string"
          && routeState.from.startsWith("/")
          && !routeState.from.startsWith("//")
          && !routeState.from.startsWith("/auth")
            ? routeState.from
            : "/";

        if (canAccessDashboardFromScopes(getTokenRoles(data.token))) {
          navigate("/admin", { replace: true });
        } else {
          navigate(requestedPath, { replace: true });
        }
      } else {
        setErrorMessage("Đăng nhập không hợp lệ");
        setIsLoading(false);
      }
    } catch {
      setErrorMessage("Đăng nhập không hợp lệ");
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
      {/* Logo — matches Header.tsx */}
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

      {/* Heading */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: TEXT_PRIMARY, fontSize: 26, fontWeight: 800, lineHeight: 1.2, margin: 0, letterSpacing: "-0.02em" }}>
          Chào mừng trở lại
        </h1>
        <p style={{ color: TEXT_MUTED, fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>
          Đăng nhập để tiếp tục hành trình điện ảnh
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <InputField
          icon={<User size={16} />}
          type="text"
          label="Tên đăng nhập"
          placeholder="Nhập tên đăng nhập"
          value={username}
          onChange={setUsername}
          disabled={isLoading}
        />

        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
            <label style={{ color: "#374151", fontSize: 13, fontWeight: 600, letterSpacing: "0.01em" }}>
              Mật khẩu
            </label>
            <button
              type="button"
              onClick={onForgotPassword}
              style={{
                color: ACCENT_SLATE,
                fontSize: 13,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 500,
                padding: 0,
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = ACCENT_DARK)}
              onMouseLeave={(e) => (e.currentTarget.style.color = ACCENT_SLATE)}
            >
              Quên mật khẩu?
            </button>
          </div>
          <PasswordField
            value={password}
            onChange={setPassword}
            showPassword={showPassword}
            onToggle={() => setShowPassword(!showPassword)}
            placeholder="••••••••"
            disabled={isLoading}
          />
        </div>

        {errorMessage && (
          <div style={{ background: "rgba(220,38,38,0.06)", border: "1.5px solid rgba(220,38,38,0.2)", borderRadius: 10, padding: "10px 14px", color: "#DC2626", fontSize: 13 }}>
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div style={{ background: "rgba(22,163,74,0.07)", border: "1.5px solid rgba(22,163,74,0.22)", borderRadius: 10, padding: "10px 14px", color: "#16A34A", fontSize: 13 }}>
            {successMessage}
          </div>
        )}

        {/* Sign in button */}
        <button
          type="submit"
          disabled={isLoading}
          onMouseEnter={() => setSignInHovered(true)}
          onMouseLeave={() => setSignInHovered(false)}
          style={{
            width: "100%",
            height: 52,
            background: isLoading
              ? "rgba(75,85,99,0.45)"
              : signInHovered
              ? "#374151"
              : "linear-gradient(135deg, #4B5563, #374151)",
            border: "none",
            borderRadius: 12,
            color: "#ffffff",
            fontSize: 15,
            fontWeight: 700,
            cursor: isLoading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            transition: "all 0.2s ease",
            boxShadow: signInHovered && !isLoading
              ? "0 8px 28px rgba(75,85,99,0.45)"
              : "0 4px 16px rgba(75,85,99,0.3)",
            marginTop: 4,
            letterSpacing: "0.02em",
            transform: signInHovered && !isLoading ? "translateY(-1px)" : "translateY(0)",
          }}
        >
          {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>


      </form>

      {/* Footer */}
      <p style={{ textAlign: "center", marginTop: 24, color: TEXT_MUTED, fontSize: 14 }}>
        Chưa có tài khoản?{" "}
        <button
          type="button"
          onClick={onSwitch}
          disabled={isLoading}
          style={{
            color: ACCENT_SLATE,
            fontWeight: 700,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 14,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = ACCENT_DARK)}
          onMouseLeave={(e) => (e.currentTarget.style.color = ACCENT_SLATE)}
        >
          Đăng ký
        </button>
      </p>
    </div>
  );
}
