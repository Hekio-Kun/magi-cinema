import * as React from "react"
import { Film } from "lucide-react"

const THEATER_NAME = "MagiCinema"

function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-5 flex items-center gap-2.5">
          <span
            className="flex size-10 items-center justify-center rounded-xl text-white shadow-lg"
            style={{ background: "linear-gradient(135deg, #4B5563, #374151)", boxShadow: "0 4px 12px rgba(75,85,99,0.3)" }}
          >
            <Film className="size-5" />
          </span>
          <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.01em" }}>
            Magi<span style={{ color: "#4B5563" }}>Cinema</span>
          </span>
        </div>
        <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>

      <div
        className="rounded-2xl p-6 sm:p-8"
        style={{
          background: "rgba(255,255,255,0.8)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          border: "1.5px solid rgba(209,213,219,0.9)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.07), 0 0 0 1px rgba(255,255,255,0.9)",
        }}
      >
        {children}
      </div>
    </div>
  )
}

export { AuthShell, THEATER_NAME }
