import React, { useEffect, useMemo, useRef, useState } from "react";

type TimeRulerPickerProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  minTime?: string;
};

export function TimeRulerPicker({ value, onChange, disabled, minTime }: TimeRulerPickerProps) {
  const safeValue = value || "00:00";
  const [hour = "00", min = "00"] = safeValue.split(":");
  const [activePart, setActivePart] = useState<"hour" | "minute" | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const [minH, minM] = minTime ? minTime.split(":").map(Number) : [0, 0];
  const currentHour = parseInt(hour, 10);
  const hourOptions = useMemo(
    () => Array.from({ length: 24 }, (_, index) => index).filter((h) => !minTime || h >= minH),
    [minH, minTime]
  );
  const minuteOptions = useMemo(
    () => Array.from({ length: 12 }, (_, index) => index * 5).filter((m) => !minTime || currentHour !== minH || m >= minM),
    [currentHour, minH, minM, minTime]
  );

  const selectHour = (newHour: number) => {
    let newMin = parseInt(min, 10);
    if (minTime && newHour === minH && newMin < minM) {
      newMin = Math.ceil(minM / 5) * 5;
      if (newMin >= 60) newMin = 55;
    }
    onChange(`${String(newHour).padStart(2, "0")}:${String(newMin).padStart(2, "0")}`);
  };

  const selectMinute = (newMinute: number) => {
    onChange(`${hour.padStart(2, "0")}:${String(newMinute).padStart(2, "0")}`);
  };

  useEffect(() => {
    if (!activePart) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setActivePart(null);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [activePart]);

  const renderOptionStrip = () => {
    if (!activePart || disabled) return null;

    const isHour = activePart === "hour";
    const options = isHour ? hourOptions : minuteOptions;
    const selectedValue = isHour ? parseInt(hour, 10) : parseInt(min, 10);
    const selectedIndex = Math.max(0, options.indexOf(selectedValue));

    const selectByPointer = (clientX: number, element: HTMLDivElement) => {
      const rect = element.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const nextIndex = Math.round(ratio * (options.length - 1));
      const nextValue = options[nextIndex];
      if (nextValue === undefined) return;

      if (isHour) selectHour(nextValue);
      else selectMinute(nextValue);
    };

    const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
      if (options.length <= 1) return;
      const target = event.currentTarget;
      target.setPointerCapture(event.pointerId);
      selectByPointer(event.clientX, target);
    };

    const drag = (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.buttons !== 1 || options.length <= 1) return;
      selectByPointer(event.clientX, event.currentTarget);
    };

    return (
      <div style={timeRulerPopoverStyle}>
        <div style={timeRulerHeaderStyle}>
          <span>{isHour ? "Kéo mũi tên để chọn giờ" : "Kéo mũi tên để chọn phút"}</span>
          <strong>{String(selectedValue).padStart(2, "0")}</strong>
        </div>
        <div style={timeRulerTrackStyle} onPointerDown={startDrag} onPointerMove={drag}>
          <div style={timeRulerRailStyle} />
          <div style={timeRulerPointerWrapStyle(selectedIndex, options.length)}>
            <div style={timeRulerPointerLabelStyle}>{String(selectedValue).padStart(2, "0")}</div>
            <div style={timeRulerPointerStyle} />
          </div>
          {options.map((option, index) => {
            const selected = option === selectedValue;
            const label = String(option).padStart(2, "0");
            const isMajorTick = isHour ? option % 2 === 0 : option % 15 === 0;

            return (
              <button
                key={label}
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => {
                  if (isHour) selectHour(option);
                  else selectMinute(option);
                }}
                style={timeRulerTickButtonStyle(index, options.length)}
              >
                <span style={timeRulerTickLineStyle(selected, isMajorTick)} />
                <span style={timeRulerTickLabelStyle(selected, isMajorTick)}>{label}</span>
              </button>
            );
          })}
        </div>
        <div style={timeRulerHintStyle}>Có thể bấm trực tiếp vào vạch hoặc kéo mũi tên qua lại.</div>
      </div>
    );
  };

  return (
    <div ref={pickerRef} style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setActivePart((current) => current === "hour" ? null : "hour")}
          style={timeSelectStyle(disabled, activePart === "hour")}
        >
          {hour.padStart(2, "0")}
        </button>
        <span style={{ fontWeight: 800, color: "#cbd5e1" }}>:</span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setActivePart((current) => current === "minute" ? null : "minute")}
          style={timeSelectStyle(disabled, activePart === "minute")}
        >
          {min.padStart(2, "0")}
        </button>
      </div>
      {renderOptionStrip()}
    </div>
  );
}

const timeSelectStyle = (disabled?: boolean, active?: boolean): React.CSSProperties => ({
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: active ? "#0f172a" : disabled ? "#f8fafc" : "#fff",
  outline: "none",
  boxShadow: active ? "0 8px 20px rgba(15,23,42,0.18)" : "none",
  color: active ? "#fff" : disabled ? "#94a3b8" : "#0f172a",
  fontSize: 14,
  fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer",
  appearance: "none",
  minWidth: 54,
  textAlign: "center",
});

const timeRulerPopoverStyle: React.CSSProperties = {
  position: "absolute",
  left: 0,
  top: "calc(100% + 8px)",
  zIndex: 60,
  width: 360,
  maxWidth: "min(360px, 86vw)",
  padding: "12px 14px 10px",
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  background: "#fff",
  boxShadow: "0 18px 45px rgba(15,23,42,0.16)",
};

const timeRulerHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 12,
  color: "#64748b",
  fontSize: 12,
  fontWeight: 700,
};

const timeRulerTrackStyle: React.CSSProperties = {
  position: "relative",
  height: 82,
  marginTop: 4,
  userSelect: "none",
  touchAction: "none",
  cursor: "pointer",
};

const timeRulerRailStyle: React.CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  top: 34,
  height: 2,
  borderRadius: 999,
  background: "#cbd5e1",
};

const timeRulerPointerWrapStyle = (selectedIndex: number, total: number): React.CSSProperties => ({
  position: "absolute",
  left: total <= 1 ? "0%" : `${(selectedIndex / (total - 1)) * 100}%`,
  top: 0,
  transform: "translateX(-50%)",
  zIndex: 3,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  pointerEvents: "none",
});

const timeRulerPointerLabelStyle: React.CSSProperties = {
  minWidth: 34,
  height: 22,
  padding: "0 8px",
  borderRadius: 999,
  background: "#E63946",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 900,
  boxShadow: "0 8px 18px rgba(230,57,70,0.28)",
};

const timeRulerPointerStyle: React.CSSProperties = {
  width: 0,
  height: 0,
  marginTop: 3,
  borderLeft: "8px solid transparent",
  borderRight: "8px solid transparent",
  borderTop: "13px solid #E63946",
};

const timeRulerTickButtonStyle = (index: number, total: number): React.CSSProperties => ({
  position: "absolute",
  left: total <= 1 ? "0%" : `${(index / (total - 1)) * 100}%`,
  top: 28,
  transform: "translateX(-50%)",
  width: 28,
  height: 50,
  border: "none",
  background: "transparent",
  padding: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  cursor: "pointer",
});

const timeRulerTickLineStyle = (selected: boolean, major: boolean): React.CSSProperties => ({
  width: selected ? 3 : 2,
  height: selected ? 28 : major ? 22 : 13,
  borderRadius: 999,
  background: selected ? "#E63946" : major ? "#475569" : "#94a3b8",
  transition: "height 0.12s ease, background 0.12s ease",
});

const timeRulerTickLabelStyle = (selected: boolean, major: boolean): React.CSSProperties => ({
  marginTop: 6,
  fontSize: selected ? 12 : major ? 11 : 10,
  lineHeight: 1,
  fontWeight: selected ? 900 : major ? 800 : 700,
  color: selected ? "#E63946" : major ? "#334155" : "#94a3b8",
});

const timeRulerHintStyle: React.CSSProperties = {
  marginTop: 4,
  color: "#94a3b8",
  fontSize: 11,
  fontWeight: 600,
};
