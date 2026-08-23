import { useState } from "react";
import { Calendar, Eye, EyeOff, Film, Lock, Mail, Phone, User } from "lucide-react";
import { authService } from "@/api/authApi";
import { getApiErrorMessage } from "@/api/errors";
import { isStrongPassword, PASSWORD_POLICY_MESSAGE, passwordRequirements } from "@/utils/passwordPolicy";

export type RegisterData = {
  username: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  password: string;
  dateOfBirth: string;
};

interface RegisterFormProps {
  onSwitch: () => void;
  onRegistered: (data: RegisterData) => void;
}

const ACCENT_DARK = "#374151";
const ACCENT_SLATE = "#4B5563";
const TEXT_PRIMARY = "#111827";
const TEXT_MUTED = "#6B7280";

const inputBase: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: "0 14px",
  height: 46,
  borderRadius: 11,
  transition: "all 0.2s ease",
  backdropFilter: "blur(8px)",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", color: "#374151", fontSize: 12, marginBottom: 5, fontWeight: 600 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  type = "text",
  placeholder,
  icon,
  value,
  onChange,
  disabled,
  colorScheme,
}: {
  type?: string;
  placeholder: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  colorScheme?: React.CSSProperties["colorScheme"];
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      style={{
        ...inputBase,
        background: focused ? "#fff" : "rgba(255,255,255,0.75)",
        border: focused ? "1.5px solid #4B5563" : "1.5px solid rgba(209,213,219,0.9)",
        boxShadow: focused ? "0 0 0 3px rgba(75,85,99,0.12)" : "0 1px 3px rgba(0,0,0,0.04)",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {icon && <span style={{ color: focused ? ACCENT_SLATE : "#9CA3AF", display: "flex" }}>{icon}</span>}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          flex: 1,
          minWidth: 0,
          background: "transparent",
          border: "none",
          outline: "none",
          color: TEXT_PRIMARY,
          fontSize: 13.5,
          fontFamily: "inherit",
          colorScheme,
        }}
      />
    </div>
  );
}

function PasswordInput({
  placeholder,
  value,
  onChange,
  show,
  onToggle,
  disabled,
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      style={{
        ...inputBase,
        background: focused ? "#fff" : "rgba(255,255,255,0.75)",
        border: focused ? "1.5px solid #4B5563" : "1.5px solid rgba(209,213,219,0.9)",
        boxShadow: focused ? "0 0 0 3px rgba(75,85,99,0.12)" : "0 1px 3px rgba(0,0,0,0.04)",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <span style={{ color: focused ? ACCENT_SLATE : "#9CA3AF", display: "flex" }}><Lock size={15} /></span>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        disabled={disabled}
        style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: TEXT_PRIMARY, fontSize: 13.5 }}
      />
      <button type="button" onClick={onToggle} tabIndex={-1} style={{ color: "#9CA3AF", background: "none", border: "none", display: "flex", padding: 2 }}>
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

export function RegisterForm({ onSwitch, onRegistered }: RegisterFormProps) {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!username.trim() || !fullName.trim() || !dateOfBirth || !phoneNumber.trim() || !email.trim() || !password || !confirmPassword) {
      setErrorMessage("Vui lòng nhập đầy đủ thông tin.");
      return;
    }
    if (!/^0\d{9}$/.test(phoneNumber.trim())) {
      setErrorMessage("Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.");
      return;
    }
    if (!isStrongPassword(password)) {
      setErrorMessage(PASSWORD_POLICY_MESSAGE);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (new Date(dateOfBirth).getTime() >= new Date().setHours(0, 0, 0, 0)) {
      setErrorMessage("Ngày sinh phải trước ngày hiện tại.");
      return;
    }

    const registerData: RegisterData = {
      username: username.trim(),
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email.trim(),
      password,
      dateOfBirth,
    };

    setIsLoading(true);
    try {
      await authService.checkRegistrationStep1(registerData.username, registerData.email);
      await authService.register(registerData);
      setSuccessMessage("Mã OTP đã được gửi đến email của bạn!");
      window.setTimeout(() => onRegistered(registerData), 1000);
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, "Đăng ký thất bại. Vui lòng thử lại."));
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      width: "100%",
      background: "rgba(255,255,255,0.8)",
      backdropFilter: "blur(28px)",
      border: "1.5px solid rgba(209,213,219,0.9)",
      borderRadius: 24,
      padding: "28px 28px 24px",
      boxShadow: "0 8px 40px rgba(0,0,0,0.07)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg, #4B5563, #374151)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Film size={17} color="white" />
        </div>
        <span style={{ fontSize: "1.05rem", fontWeight: 800, color: TEXT_PRIMARY }}>MagiCinema</span>
      </div>

      <div style={{ marginBottom: 18 }}>
        <h1 style={{ color: TEXT_PRIMARY, fontSize: 22, fontWeight: 800, margin: 0 }}>Tạo tài khoản</h1>
        <p style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 5 }}>Tham gia MagiCinema và bắt đầu xem phim ngay hôm nay</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Tên đăng nhập">
          <TextInput icon={<User size={15} />} placeholder="your_username" value={username} onChange={setUsername} disabled={isLoading} />
        </Field>

        <Field label="Họ và tên">
          <TextInput icon={<User size={15} />} placeholder="Nguyễn Văn A" value={fullName} onChange={setFullName} disabled={isLoading} />
        </Field>

        <Field label="Ngày sinh">
          <TextInput type="date" icon={<Calendar size={15} />} placeholder="" value={dateOfBirth} onChange={setDateOfBirth} colorScheme="light" disabled={isLoading} />
        </Field>

        <Field label="Số điện thoại">
          <TextInput
            type="tel"
            icon={<Phone size={15} />}
            placeholder="0912 345 678"
            value={phoneNumber}
            onChange={(value) => setPhoneNumber(value.replace(/\D/g, "").slice(0, 10))}
            disabled={isLoading}
          />
        </Field>

        <Field label="Địa chỉ email">
          <TextInput type="email" icon={<Mail size={15} />} placeholder="your@email.com" value={email} onChange={setEmail} disabled={isLoading} />
        </Field>

        <Field label="Mật khẩu">
          <PasswordInput placeholder="Tối thiểu 8 ký tự" value={password} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword(!showPassword)} disabled={isLoading} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 10px", marginTop: 7 }}>
            {passwordRequirements(password).map(({ label, met }) => (
              <span key={label} style={{ color: met ? "#16A34A" : "#9CA3AF", fontSize: 10.5 }}>
                {met ? "✓" : "○"} {label}
              </span>
            ))}
          </div>
        </Field>

        <Field label="Xác nhận mật khẩu">
          <PasswordInput placeholder="Nhập lại mật khẩu" value={confirmPassword} onChange={setConfirmPassword} show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} disabled={isLoading} />
        </Field>

        {errorMessage && <div style={{ background: "rgba(220,38,38,0.06)", border: "1.5px solid rgba(220,38,38,0.2)", borderRadius: 10, padding: "9px 13px", color: "#DC2626", fontSize: 13 }}>{errorMessage}</div>}
        {successMessage && <div style={{ background: "rgba(22,163,74,0.07)", border: "1.5px solid rgba(22,163,74,0.22)", borderRadius: 10, padding: "9px 13px", color: "#16A34A", fontSize: 13 }}>{successMessage}</div>}

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: "100%",
            height: 48,
            background: isLoading ? "rgba(75,85,99,0.45)" : "linear-gradient(135deg, #4B5563, #374151)",
            border: "none",
            borderRadius: 12,
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            cursor: isLoading ? "not-allowed" : "pointer",
            boxShadow: "0 4px 16px rgba(75,85,99,0.3)",
          }}
        >
          {isLoading ? "Đang gửi OTP..." : "Tạo tài khoản"}
        </button>
      </form>

      <p style={{ textAlign: "center", marginTop: 16, color: TEXT_MUTED, fontSize: 13 }}>
        Đã có tài khoản?{" "}
        <button type="button" onClick={onSwitch} disabled={isLoading} style={{ color: ACCENT_DARK, fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}>
          Đăng nhập
        </button>
      </p>
    </div>
  );
}
