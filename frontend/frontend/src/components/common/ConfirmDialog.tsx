import { AlertTriangle, Loader2, X } from "lucide-react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  tone?: "danger" | "warning";
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Đồng ý",
  cancelLabel = "Hủy",
  loading = false,
  tone = "danger",
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  if (!open) return null;

  const toneColor = tone === "warning" ? "#d97706" : "#dc2626";
  const toneBg = tone === "warning" ? "rgba(245,158,11,0.12)" : "rgba(220,38,38,0.1)";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (!loading && event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-white/70 bg-white text-slate-900 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ background: toneBg, color: toneColor }}
            >
              <AlertTriangle size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="m-0 text-lg font-extrabold text-slate-950">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{message}</p>
            </div>
          </div>
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 bg-slate-100 hover:bg-[#E63946] hover:text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
          title="Đóng"
        >
          <X size={18} />
        </button>
        </div>

        <div className="flex justify-end gap-3 bg-slate-50/70 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-70"
            style={{ background: toneColor }}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
