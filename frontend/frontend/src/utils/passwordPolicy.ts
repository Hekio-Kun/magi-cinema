export const PASSWORD_POLICY_MESSAGE =
  "Mật khẩu phải có ít nhất 8 ký tự, gồm ít nhất 1 chữ in hoa, 1 chữ số và 1 ký tự đặc biệt.";

export const isStrongPassword = (password: string): boolean =>
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9\s]/.test(password);

export const passwordRequirements = (password: string) => [
  { label: "Tối thiểu 8 ký tự", met: password.length >= 8 },
  { label: "Ít nhất 1 chữ in hoa", met: /[A-Z]/.test(password) },
  { label: "Ít nhất 1 chữ số", met: /\d/.test(password) },
  { label: "Ít nhất 1 ký tự đặc biệt", met: /[^A-Za-z0-9\s]/.test(password) },
];
