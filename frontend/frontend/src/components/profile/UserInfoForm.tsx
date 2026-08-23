import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Camera,
  CheckCircle2,
  CreditCard,
  Edit3,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  User,
  UserCircle,
} from 'lucide-react';
import { UpdateUserPayload, UserDetailResponse, userService } from '@/api/userApi';
import { getApiErrorMessage } from '@/api/errors';
import { isStrongPassword, PASSWORD_POLICY_MESSAGE, passwordRequirements } from '@/utils/passwordPolicy';

interface UserInfoFormProps {
  profile: UserDetailResponse | null;
  formData: UpdateUserPayload;
  isSaving: boolean;
  isUploading: boolean;
  message: { type: string; text: string };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSave: (e: React.FormEvent) => void;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const inputWrapStyle =
  'flex min-h-11 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/10';
const inputBaseStyle = 'w-full border-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400';
const readonlyStyle = 'border-slate-200 bg-slate-50 text-slate-500';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold tracking-wide text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function StatusMessage({ message }: { message: { type: string; text: string } }) {
  if (!message.text) return null;

  const isError = message.type === 'error';
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${
        isError ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
      }`}
    >
      <Icon size={17} className="mt-0.5 shrink-0" />
      <span>{message.text}</span>
    </div>
  );
}

export function UserInfoForm({
  profile,
  formData,
  isSaving,
  isUploading,
  message,
  onInputChange,
  onSave,
  onAvatarChange,
}: UserInfoFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-5 duration-500">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-950">Hồ sơ cá nhân</h2>
            <p className="mt-1 text-sm text-slate-500">Cập nhật thông tin cá nhân và ảnh đại diện của tài khoản.</p>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            Đang hoạt động
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="flex flex-col items-center rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
            <button
              type="button"
              onClick={handleAvatarClick}
              className="group relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-sm"
              aria-label="Thay đổi ảnh đại diện"
            >
              {isUploading ? (
                <Loader2 size={30} className="animate-spin text-red-600" />
              ) : profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.username || 'Avatar'}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src =
                      'https://ui-avatars.com/api/?name=' +
                      encodeURIComponent(profile?.username || 'User') +
                      '&background=9ca3af&color=fff';
                  }}
                />
              ) : (
                <UserCircle size={70} className="text-slate-400" />
              )}

              {!isUploading && (
                <span className="absolute inset-0 flex items-center justify-center bg-slate-950/45 text-white opacity-0 transition group-hover:opacity-100">
                  <Camera size={22} />
                </span>
              )}
            </button>

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                onAvatarChange(e);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            />

            <p className="mt-3 text-sm font-bold text-slate-800">{profile?.fullName || profile?.username}</p>
            <p className="mt-1 max-w-full truncate text-xs text-slate-500">{profile?.email}</p>
            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={isUploading}
              className="mt-4 inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-red-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploading ? <Loader2 size={15} className="animate-spin" /> : <Edit3 size={15} />}
              {isUploading ? 'Đang tải...' : 'Đổi ảnh'}
            </button>
          </div>

          <form onSubmit={onSave} className="space-y-4">
            <StatusMessage message={message} />

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Tên đăng nhập">
                <div className={`${inputWrapStyle} ${readonlyStyle}`}>
                  <User size={16} className="shrink-0 text-slate-400" />
                  <span className="truncate">{profile?.username || 'Chưa có dữ liệu'}</span>
                </div>
              </Field>

              <Field label="Email">
                <div className={`${inputWrapStyle} ${readonlyStyle}`}>
                  <Mail size={16} className="shrink-0 text-slate-400" />
                  <span className="truncate">{profile?.email || 'Chưa có dữ liệu'}</span>
                </div>
              </Field>
            </div>

            <Field label="Họ và tên">
              <div className={inputWrapStyle}>
                <User size={16} className="shrink-0 text-slate-400" />
                <input
                  className={inputBaseStyle}
                  name="fullName"
                  value={formData.fullName || ''}
                  onChange={onInputChange}
                  placeholder="Nhập họ và tên"
                />
              </div>
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Số điện thoại">
                <div className={inputWrapStyle}>
                  <Phone size={16} className="shrink-0 text-slate-400" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    required
                    pattern="0[0-9]{9}"
                    maxLength={10}
                    title="Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0"
                    className={inputBaseStyle}
                    name="phoneNumber"
                    value={formData.phoneNumber || ''}
                    onChange={(event) => {
                      event.currentTarget.value = event.currentTarget.value.replace(/\D/g, '').slice(0, 10);
                      onInputChange(event);
                    }}
                    placeholder="Nhập số điện thoại"
                  />
                </div>
              </Field>

              <Field label="CCCD/CMND">
                <div className={inputWrapStyle}>
                  <CreditCard size={16} className="shrink-0 text-slate-400" />
                  <input
                    className={inputBaseStyle}
                    name="identityCard"
                    value={formData.identityCard || ''}
                    onChange={onInputChange}
                    placeholder="Nhập số CCCD/CMND"
                  />
                </div>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Ngày sinh">
                <div className={inputWrapStyle}>
                  <Calendar size={16} className="shrink-0 text-slate-400" />
                  <input
                    type="date"
                    className={inputBaseStyle}
                    name="dateOfBirth"
                    value={formData.dateOfBirth || ''}
                    onChange={onInputChange}
                  />
                </div>
              </Field>

              <Field label="Giới tính">
                <div className={inputWrapStyle}>
                  <select
                    className={`${inputBaseStyle} cursor-pointer appearance-none`}
                    name="gender"
                    value={formData.gender || ''}
                    onChange={onInputChange}
                  >
                    <option value="">Chọn giới tính</option>
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
              </Field>
            </div>

            <Field label="Địa chỉ">
              <div className={inputWrapStyle}>
                <MapPin size={16} className="shrink-0 text-slate-400" />
                <input
                  className={inputBaseStyle}
                  name="address"
                  value={formData.address || ''}
                  onChange={onInputChange}
                  placeholder="Nhập địa chỉ"
                />
              </div>
            </Field>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex min-h-11 min-w-[170px] items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                <span>{isSaving ? 'Đang lưu...' : 'Cập nhật'}</span>
              </button>
            </div>
          </form>
        </div>
      </section>

      <ChangePasswordForm />
    </div>
  );
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Vui lòng nhập đầy đủ thông tin mật khẩu.' });
      return;
    }
    if (!isStrongPassword(newPassword)) {
      setMessage({ type: 'error', text: PASSWORD_POLICY_MESSAGE });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' });
      return;
    }
    if (currentPassword === newPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu mới phải khác mật khẩu hiện tại.' });
      return;
    }

    setIsSaving(true);
    try {
      await userService.changeMyPassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' });
    } catch (error: unknown) {
      setMessage({
        type: 'error',
        text: getApiErrorMessage(error, 'Không thể đổi mật khẩu.'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-slate-950">Bảo mật tài khoản</h2>
          <p className="mt-1 text-sm text-slate-500">Đổi mật khẩu định kỳ để bảo vệ tài khoản đặt vé của bạn.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <StatusMessage message={message} />

        <div className="grid gap-4 md:grid-cols-2">
          <PasswordField
            label="Mật khẩu hiện tại"
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showCurrent}
            onToggle={() => setShowCurrent((value) => !value)}
            autoComplete="current-password"
          />

          <PasswordField
            label="Mật khẩu mới"
            value={newPassword}
            onChange={setNewPassword}
            show={showNew}
            onToggle={() => setShowNew((value) => !value)}
            autoComplete="new-password"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
          <PasswordField
            label="Xác nhận mật khẩu mới"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showConfirm}
            onToggle={() => setShowConfirm((value) => !value)}
            autoComplete="new-password"
          />

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-bold tracking-wide text-slate-500">Điều kiện mật khẩu</p>
            <div className="grid gap-1.5">
              {passwordRequirements(newPassword).map(({ label, met }) => (
                <span key={label} className={`flex items-center gap-1.5 text-xs ${met ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <CheckCircle2 size={13} className={met ? 'opacity-100' : 'opacity-35'} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex min-h-11 min-w-[170px] items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
            <span>{isSaving ? 'Đang đổi...' : 'Đổi mật khẩu'}</span>
          </button>
        </div>
      </form>
    </section>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete: string;
}) {
  return (
    <Field label={label}>
      <div className={inputWrapStyle}>
        <Lock size={16} className="shrink-0 text-slate-400" />
        <input
          type={show ? 'text' : 'password'}
          className={inputBaseStyle}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder="Nhập mật khẩu"
        />
        <button
          type="button"
          onClick={onToggle}
          className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </Field>
  );
}
