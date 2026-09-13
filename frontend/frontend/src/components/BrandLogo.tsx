import type { CSSProperties } from "react";

type BrandLogoSize = "sm" | "md" | "lg";

interface BrandLogoProps {
  /** Controls the rendered height of the generated Magi wordmark. */
  size?: BrandLogoSize;
  /** Adds the Cinema descriptor beside the Magi wordmark. */
  showCinema?: boolean;
  /** Use the light descriptor color for dark navigation surfaces. */
  dark?: boolean;
  className?: string;
}

const SIZE_STYLES: Record<BrandLogoSize, { height: number; fontSize: string }> = {
  sm: { height: 28, fontSize: "0.95rem" },
  md: { height: 34, fontSize: "1.1rem" },
  lg: { height: 42, fontSize: "1.25rem" },
};

export function BrandLogo({ size = "md", showCinema = true, dark = false, className = "" }: BrandLogoProps) {
  const { height, fontSize } = SIZE_STYLES[size];
  const imageStyle: CSSProperties = {
    display: "block",
    flexShrink: 0,
    width: height * 2,
    height,
    objectFit: "contain",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} aria-label="Magi Cinema">
      <img src="/magi-logo.png" alt="Magi" style={imageStyle} />
      {showCinema && (
        <span
          style={{
            color: dark ? "#E5E7EB" : "#4B5563",
            fontSize,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          Cinema
        </span>
      )}
    </span>
  );
}
