"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { AuthShell } from "@/components/auth/auth-shell"
import { authService } from "@/api/authApi"
import { getApiErrorMessage } from "@/api/errors"

const OTP_LENGTH = 6
const RESEND_SECONDS = 30

function OtpView({
                   registerData,
                   onBack,
                   onVerified,
                 }: {
  registerData: Record<string, unknown>
  onBack: () => void
  onVerified: () => void
}) {
  const [digits, setDigits] = React.useState<string[]>(Array(OTP_LENGTH).fill(""))
  const [countdown, setCountdown] = React.useState(RESEND_SECONDS)
  const [errorMessage, setErrorMessage] = React.useState("")
  const [successMessage, setSuccessMessage] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [isResending, setIsResending] = React.useState(false)

  const inputsRef = React.useRef<Array<HTMLInputElement | null>>([])
  const redirectTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  React.useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current)
      }
    }
  }, [])

  const focusInput = (i: number) => {
    inputsRef.current[i]?.focus()
    inputsRef.current[i]?.select()
  }

  const handleChange = (i: number, value: string) => {
    const char = value.replace(/\D/g, "").slice(-1)
    setDigits((prev) => {
      const next = [...prev]
      next[i] = char
      return next
    })
    if (char && i < OTP_LENGTH - 1) focusInput(i + 1)
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      focusInput(i - 1)
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault()
      focusInput(i - 1)
    } else if (e.key === "ArrowRight" && i < OTP_LENGTH - 1) {
      e.preventDefault()
      focusInput(i + 1)
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH)
    if (!pasted) return
    const next = Array(OTP_LENGTH).fill("")
    pasted.split("").forEach((c, idx) => (next[idx] = c))
    setDigits(next)
    focusInput(Math.min(pasted.length, OTP_LENGTH - 1))
  }

  const email = registerData.email as string
  const isComplete = digits.every((d) => d !== "")

  const handleResendOtp = async () => {
    setIsResending(true)
    setErrorMessage("")
    setSuccessMessage("")
    try {
      await authService.resendOtp(email)
      setDigits(Array(OTP_LENGTH).fill(""))
      setCountdown(RESEND_SECONDS)
      setSuccessMessage("Đã gửi mã OTP mới. Vui lòng kiểm tra email.")
      focusInput(0)
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, "Không thể gửi lại OTP. Vui lòng thử lại."))
    } finally {
      setIsResending(false)
    }
  }

  const handleVerifyOtp = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (!isComplete) return

    setErrorMessage("")
    setSuccessMessage("")
    setIsLoading(true)

    const otpCode = digits.join("")

    try {
      await authService.verifyOtp(registerData, otpCode)
      setSuccessMessage("Xác thực thành công! Đang chuyển đến trang đăng nhập...")

      redirectTimerRef.current = setTimeout(() => {
        onVerified()
      }, 1200)

    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, "Mã OTP không hợp lệ hoặc đã hết hạn."))
      setIsLoading(false)
    }
  }

  return (
      <AuthShell title="Xác thực email" subtitle="Chúng tôi đã gửi mã xác thực 6 chữ số đến email của bạn.">
        <form className="flex flex-col gap-6" onSubmit={handleVerifyOtp}>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/50 px-3.5 py-3">
            <span className="truncate text-sm text-foreground" aria-readonly>{email}</span>
          </div>

          <div className="flex justify-between gap-2" onPaste={handlePaste}>
            {digits.map((digit, i) => (
                <input
                    key={i}
                    ref={(el) => { inputsRef.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onFocus={(e) => e.target.select()}
                    disabled={isLoading}
                    aria-label={`Chữ số OTP thứ ${i + 1}`}
                    className={cn(
                        "h-14 w-full rounded-lg border bg-input/40 text-center text-xl font-semibold text-foreground transition-all outline-none",
                        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40",
                        digit ? "border-accent/60" : "border-border"
                    )}
                />
            ))}
          </div>

          {/* THẺ ALERT BÁO LỖI */}
          {errorMessage && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm font-medium text-destructive">
                <span>{errorMessage}</span>
              </div>
          )}

          {/* THẺ ALERT THÀNH CÔNG */}
          {successMessage && (
              <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm font-medium text-emerald-500">
                <span>{successMessage}</span>
              </div>
          )}

          <Button type="submit" size="lg" disabled={!isComplete || isLoading} className="h-11 text-sm font-semibold">
            {isLoading ? "Đang xác thực..." : "Xác thực & kích hoạt"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Không nhận được mã?{" "}
          {countdown > 0 ? (
              <span className="font-medium text-foreground">Gửi lại sau {countdown}s</span>
          ) : (
              <button type="button" onClick={handleResendOtp} className="font-medium text-accent transition-colors hover:text-accent/80" disabled={isLoading || isResending}>
                {isResending ? "Đang gửi..." : "Gửi lại OTP"}
              </button>
          )}
        </p>

        <button
          type="button"
          onClick={onBack}
          disabled={isLoading || isResending}
          className="mt-3 w-full text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          Quay lại đăng ký
        </button>
      </AuthShell>
  )
}

export { OtpView }
