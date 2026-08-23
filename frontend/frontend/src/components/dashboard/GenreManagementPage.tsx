import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Edit, Trash2, Loader2, X, Clapperboard, Search, Tags, FileText, AlertTriangle, RefreshCw,
} from "lucide-react";
import { toast } from "react-toastify";
import { genreService } from "@/api/genreApi";
import { getApiErrorMessage } from "@/api/errors";
import { Genre, GenreRequest } from "@/types/genre";

const FONT = "'Inter', sans-serif";

const EMPTY_FORM: GenreRequest = {
  name: "",
  description: "",
};

const INPUT_CLS =
  "w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500";
const LABEL_CLS = "block text-xs font-semibold text-slate-500 mb-1 tracking-wide";
const TEXTAREA_CLS =
  "w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 resize-none";

const palette = [
  { bg: "#fee2e2", color: "#b91c1c" },
  { bg: "#dbeafe", color: "#1d4ed8" },
  { bg: "#dcfce7", color: "#15803d" },
  { bg: "#fef3c7", color: "#b45309" },
  { bg: "#ede9fe", color: "#6d28d9" },
  { bg: "#cffafe", color: "#0e7490" },
  { bg: "#fce7f3", color: "#be185d" },
];

export function GenreManagementPage() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<Genre | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Genre | null>(null);

  const [form, setForm] = useState<GenreRequest>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const fetchGenres = useCallback(async () => {
    setLoading(true);
    try {
      const data = await genreService.getAllGenres();
      setGenres(data);
    } catch (err) {
      console.error("Failed to fetch genres", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const requestTimer = window.setTimeout(fetchGenres, 0);
    return () => window.clearTimeout(requestTimer);
  }, [fetchGenres]);

  const sortedGenres = useMemo(
    () => [...genres].sort((a, b) => a.name.localeCompare(b.name, "vi")),
    [genres]
  );

  const filteredGenres = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return sortedGenres;
    return sortedGenres.filter(g =>
      g.name.toLowerCase().includes(keyword) ||
      (g.description ?? "").toLowerCase().includes(keyword)
    );
  }, [search, sortedGenres]);

  const withDescriptionCount = genres.filter(g => Boolean(g.description?.trim())).length;
  const autoCreatedCount = genres.filter(g => g.description === "Tự động tạo từ TMDB").length;

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setShowCreateModal(true);
  };

  const openEdit = (genre: Genre) => {
    setSelectedGenre(genre);
    setForm({
      name: genre.name,
      description: genre.description ?? "",
    });
    setFormError("");
    setShowEditModal(true);
  };

  const validateName = (currentGenreId?: number) => {
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setFormError("Tên thể loại là bắt buộc.");
      return null;
    }

    if (genres.some(g => g.genreId !== currentGenreId && g.name.toLowerCase() === trimmedName.toLowerCase())) {
      setFormError(`Thể loại "${trimmedName}" đã tồn tại.`);
      return null;
    }

    return trimmedName;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const trimmedName = validateName();
    if (!trimmedName) return;

    setFormLoading(true);
    try {
      await genreService.createGenre({ ...form, name: trimmedName });
      setShowCreateModal(false);
      fetchGenres();
    } catch (err: unknown) {
      setFormError(getApiErrorMessage(err, "Tạo thể loại thất bại."));
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGenre) return;
    setFormError("");
    const trimmedName = validateName(selectedGenre.genreId);
    if (!trimmedName) return;

    setFormLoading(true);
    try {
      await genreService.updateGenre(selectedGenre.genreId, { ...form, name: trimmedName });
      setShowEditModal(false);
      fetchGenres();
    } catch (err: unknown) {
      setFormError(getApiErrorMessage(err, "Cập nhật thể loại thất bại."));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.genreId);
    try {
      await genreService.deleteGenre(confirmDelete.genreId);
      setConfirmDelete(null);
      fetchGenres();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Xóa thể loại thất bại."));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", background: "#F4F5F7", fontFamily: FONT }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 28px 40px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 22 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(230,57,70,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Clapperboard size={15} color="#E63946" />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em" }}>
                Genre Management
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1.25 }}>
              Thể loại phim
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
              Quản lý nhóm thể loại dùng cho phim, lịch chiếu và dữ liệu nhập từ TMDB.
            </p>
          </div>
          <button
            onClick={openCreate}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 18px", borderRadius: 10, flexShrink: 0,
              background: "linear-gradient(135deg,#E63946,#c1121f)",
              color: "#fff", fontFamily: FONT, fontSize: 13, fontWeight: 700,
              border: "none", cursor: "pointer",
              boxShadow: "0 4px 14px rgba(230,57,70,0.35)", whiteSpace: "nowrap",
            }}
          >
            <Plus size={16} /> Thêm thể loại
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginBottom: 18 }}>
          <StatItem icon={<Tags size={17} />} label="Tổng thể loại" value={genres.length} tone="#E63946" />
          <StatItem icon={<FileText size={17} />} label="Có mô tả" value={withDescriptionCount} tone="#2563eb" />
          <StatItem icon={<RefreshCw size={17} />} label="Tạo từ TMDB" value={autoCreatedCount} tone="#059669" />
        </div>

        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Tìm theo tên hoặc mô tả thể loại..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%", padding: "10px 12px 10px 38px",
                  borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc",
                  fontFamily: FONT, fontSize: 13, color: "#1e293b", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
            <button
              onClick={fetchGenres}
              disabled={loading}
              title="Tải lại danh sách"
              style={{
                width: 40, height: 40, borderRadius: 10, border: "1px solid #e2e8f0",
                background: "#fff", color: "#64748b", display: "flex", alignItems: "center",
                justifyContent: "center", cursor: loading ? "not-allowed" : "pointer", flexShrink: 0,
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            </button>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>Danh sách thể loại</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                Hiển thị {filteredGenres.length} / {genres.length} thể loại
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", color: "#94a3b8" }}>
              <Loader2 size={30} style={{ color: "#E63946", marginBottom: 12 }} className="animate-spin" />
              <span style={{ fontSize: 14 }}>Đang tải danh sách thể loại...</span>
            </div>
          ) : filteredGenres.length === 0 ? (
            <EmptyState search={search} onCreate={openCreate} />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 12, padding: 14 }}>
              {filteredGenres.map((genre, index) => (
                <GenreCard
                  key={genre.genreId}
                  genre={genre}
                  tone={palette[index % palette.length]}
                  deleting={deletingId === genre.genreId}
                  onEdit={() => openEdit(genre)}
                  onDelete={() => setConfirmDelete(genre)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <GenreFormModal
          title="Thêm thể loại"
          form={form} setForm={setForm} formError={formError} formLoading={formLoading}
          onClose={() => setShowCreateModal(false)} onSubmit={handleCreateSubmit} submitLabel="Tạo"
        />
      )}
      {showEditModal && selectedGenre && (
        <GenreFormModal
          title="Chỉnh sửa thể loại"
          form={form} setForm={setForm} formError={formError} formLoading={formLoading}
          onClose={() => setShowEditModal(false)} onSubmit={handleEditSubmit} submitLabel="Lưu"
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          genre={confirmDelete}
          loading={deletingId === confirmDelete.genreId}
          onClose={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

function StatItem({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${tone}14`, color: tone, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em" }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>{value}</div>
      </div>
    </div>
  );
}

function GenreCard({
  genre, tone, deleting, onEdit, onDelete,
}: {
  genre: Genre;
  tone: { bg: string; color: string };
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const autoCreated = genre.description === "Tự động tạo từ TMDB";

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, minHeight: 138, display: "flex", flexDirection: "column", background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: tone.bg, color: tone.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
            {genre.name.trim().charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{genre.name}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <ActionBtn title="Chỉnh sửa" onClick={onEdit}><Edit size={15} /></ActionBtn>
          <ActionBtn title="Xóa" disabled={deleting} onClick={onDelete}>
            {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
          </ActionBtn>
        </div>
      </div>

      <p style={{ margin: "14px 0 0", fontSize: 13, color: "#475569", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {genre.description || "Chưa có mô tả cho thể loại này."}
      </p>

      <div style={{ marginTop: "auto", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: autoCreated ? "#059669" : "#64748b", background: autoCreated ? "rgba(5,150,105,0.1)" : "#f1f5f9", borderRadius: 999, padding: "4px 9px" }}>
          {autoCreated ? "TMDB" : "Thủ công"}
        </span>
      </div>
    </div>
  );
}

function EmptyState({ search, onCreate }: { search: string; onCreate: () => void }) {
  return (
    <div style={{ padding: "64px 20px", textAlign: "center", color: "#64748b" }}>
      <div style={{ width: 46, height: 46, borderRadius: 12, background: "#f1f5f9", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
        <Tags size={22} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>
        {search.trim() ? "Không tìm thấy thể loại" : "Chưa có thể loại"}
      </div>
      <div style={{ fontSize: 13, marginBottom: 16 }}>
        {search.trim() ? "Thử đổi từ khóa tìm kiếm hoặc thêm thể loại mới." : "Tạo thể loại đầu tiên để phân loại phim trong hệ thống."}
      </div>
      <button onClick={onCreate} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 9, border: "none", background: "#E63946", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
        <Plus size={15} /> Thêm thể loại
      </button>
    </div>
  );
}

function ActionBtn({ title, onClick, disabled, children }: { title: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button title={title} onClick={onClick} disabled={disabled}
      style={{
        width: 32, height: 32, borderRadius: 8, border: "none", cursor: disabled ? "not-allowed" : "pointer",
        background: "transparent", display: "flex", alignItems: "center", justifyContent: "center",
        color: "#94a3b8", opacity: disabled ? 0.4 : 1, transition: "background 0.15s, color 0.15s",
      }}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#475569"; } }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}
    >
      {children}
    </button>
  );
}

function ModalBtn({ variant, type = "button", onClick, disabled, children }: {
  variant: "primary" | "cancel"; type?: "button" | "submit"; onClick?: () => void; disabled?: boolean; children: React.ReactNode;
}) {
  const isPrimary = variant === "primary";
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{
        padding: "9px 18px", borderRadius: 8, border: "none", cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 13, fontWeight: 700, fontFamily: FONT, opacity: disabled ? 0.6 : 1,
        background: isPrimary ? "#E63946" : "#f1f5f9",
        color: isPrimary ? "#fff" : "#475569",
        display: "flex", alignItems: "center", gap: 6,
      }}
    >{children}</button>
  );
}

function GenreFormModal({ title, form, setForm, formError, formLoading, onClose, onSubmit, submitLabel }: {
  title: string; form: GenreRequest; setForm: React.Dispatch<React.SetStateAction<GenreRequest>>;
  formError: string; formLoading: boolean; onClose: () => void; onSubmit: (e: React.FormEvent) => void; submitLabel: string;
}) {
  return (
    <div 
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(15,23,42,0.48)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div 
        style={{ position: "relative", background: "#fff", borderRadius: 16, width: "100%", maxWidth: 460, boxShadow: "0 24px 64px rgba(0,0,0,0.18)", fontFamily: FONT, overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{title}</h3>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>Tên thể loại nên ngắn, dễ lọc và không trùng nhau.</p>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              width: 30, height: 30, borderRadius: "50%", 
              background: "rgba(0,0,0,0.05)", border: "none", cursor: "pointer", 
              color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#E63946";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(0,0,0,0.05)";
              e.currentTarget.style.color = "#94a3b8";
            }}
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit} style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className={LABEL_CLS}>Tên thể loại *</label>
              <input type="text" required className={INPUT_CLS} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Hành động, Hài hước, Tâm lý..." />
            </div>
            <div>
              <label className={LABEL_CLS}>Mô tả</label>
              <textarea rows={4} className={TEXTAREA_CLS} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả ngắn để nhân sự dễ chọn đúng thể loại..." />
            </div>
          </div>
          {formError && (
            <div style={{ marginTop: 14, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13 }}>
              {formError}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
            <ModalBtn variant="cancel" type="button" onClick={onClose}>Hủy</ModalBtn>
            <ModalBtn variant="primary" type="submit" disabled={formLoading}>
              {formLoading && <Loader2 size={14} className="animate-spin" />}
              {formLoading ? "Đang xử lý..." : submitLabel}
            </ModalBtn>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDialog({ genre, loading, onClose, onConfirm }: {
  genre: Genre; loading: boolean; onClose: () => void; onConfirm: () => void;
}) {
  return (
    <div 
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div 
        style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 24px 64px rgba(0,0,0,0.18)", fontFamily: FONT }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(245,158,11,0.12)", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <AlertTriangle size={21} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Xóa thể loại?</h3>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#475569", lineHeight: 1.55 }}>
              Bạn đang xóa thể loại <strong>{genre.name}</strong>. Thao tác này có thể ảnh hưởng tới phim đang gắn với thể loại này.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
          <ModalBtn variant="cancel" onClick={onClose} disabled={loading}>Hủy</ModalBtn>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#dc2626", color: "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, opacity: loading ? 0.65 : 1 }}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? "Đang xóa..." : "Xóa"}
          </button>
        </div>
      </div>
    </div>
  );
}
