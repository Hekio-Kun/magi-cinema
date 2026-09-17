import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  ArrowUpDown,
  Ban,
  CheckCircle2,
  Edit3,
  Film,
  FilterX,
  FolderKanban,
  Loader2,
  Palette,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Tags,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { genreService } from "@/api/genreApi";
import { getApiErrorMessage } from "@/api/errors";
import type { Genre, GenreRequest, GenreSource, GenreStatus } from "@/types/genre";

type StatusFilter = "ALL" | GenreStatus;
type SourceFilter = "ALL" | GenreSource;
type SortMode = "ORDER" | "NAME" | "USAGE" | "UPDATED";

const DEFAULT_COLOR = "#E63946";
const COLOR_PRESETS = ["#E63946", "#F97316", "#EAB308", "#16A34A", "#0891B2", "#2563EB", "#7C3AED", "#DB2777"];
const EMPTY_FORM: GenreRequest = { name: "", description: "", colorCode: DEFAULT_COLOR, displayOrder: 0, status: "ACTIVE" };

const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100";
const labelClass = "text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500";

const normalizedText = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/đ/g, "d")
  .replace(/Đ/g, "D")
  .toLocaleLowerCase("vi")
  .trim();

const slugify = (value: string) => normalizedText(value)
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "") || "the-loai";

const genreStatus = (genre: Genre): GenreStatus => genre.status ?? "ACTIVE";
const genreSource = (genre: Genre): GenreSource => genre.source ?? (genre.description === "Tự động tạo từ TMDB" ? "TMDB" : "MANUAL");
const genreColor = (genre: Genre) => /^#[0-9A-Fa-f]{6}$/.test(genre.colorCode || "") ? genre.colorCode : DEFAULT_COLOR;
const genreMovieCount = (genre: Genre) => Number(genre.movieCount || 0);

const formatUpdatedAt = (value?: string | null) => {
  if (!value) return "Chưa ghi nhận";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Chưa ghi nhận" : date.toLocaleDateString("vi-VN");
};

export function GenreManagementPage({ canCreate = true, canUpdate = true }: { canCreate?: boolean; canUpdate?: boolean }) {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("ORDER");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Genre | null>(null);
  const [form, setForm] = useState<GenreRequest>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Genre | null>(null);

  const fetchGenres = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setGenres(await genreService.getAllGenresForAdmin());
    } catch (error) {
      const message = getApiErrorMessage(error, "Không thể tải danh sách thể loại.");
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchGenres(), 0);
    return () => window.clearTimeout(timer);
  }, [fetchGenres]);

  const stats = useMemo(() => ({
    total: genres.length,
    active: genres.filter((genre) => genreStatus(genre) === "ACTIVE").length,
    inUse: genres.filter((genre) => genreMovieCount(genre) > 0).length,
    assignments: genres.reduce((sum, genre) => sum + genreMovieCount(genre), 0),
  }), [genres]);

  const visibleGenres = useMemo(() => {
    const keyword = normalizedText(query);
    const result = genres.filter((genre) => {
      const matchesKeyword = !keyword || [genre.name, genre.description || "", genre.slug || ""]
        .some((value) => normalizedText(value).includes(keyword));
      return matchesKeyword
        && (statusFilter === "ALL" || genreStatus(genre) === statusFilter)
        && (sourceFilter === "ALL" || genreSource(genre) === sourceFilter);
    });

    return [...result].sort((left, right) => {
      if (sortMode === "NAME") return left.name.localeCompare(right.name, "vi");
      if (sortMode === "USAGE") return genreMovieCount(right) - genreMovieCount(left) || left.name.localeCompare(right.name, "vi");
      if (sortMode === "UPDATED") return new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime();
      return Number(left.displayOrder || 0) - Number(right.displayOrder || 0) || left.name.localeCompare(right.name, "vi");
    });
  }, [genres, query, sourceFilter, sortMode, statusFilter]);

  const hasFilters = Boolean(query.trim()) || statusFilter !== "ALL" || sourceFilter !== "ALL" || sortMode !== "ORDER";

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (genre: Genre) => {
    setEditing(genre);
    setForm({
      name: genre.name,
      description: genre.description || "",
      colorCode: genreColor(genre),
      displayOrder: Number(genre.displayOrder || 0),
      status: genreStatus(genre),
    });
    setFormError("");
    setFormOpen(true);
  };

  const validateForm = () => {
    const name = form.name.trim().replace(/\s+/g, " ");
    if (!name) return "Tên thể loại là bắt buộc.";
    if (name.length > 100) return "Tên thể loại không được vượt quá 100 ký tự.";
    if ((form.description || "").trim().length > 1000) return "Mô tả không được vượt quá 1000 ký tự.";
    if (!/^#[0-9A-Fa-f]{6}$/.test(form.colorCode || "")) return "Màu nhận diện không hợp lệ.";
    const order = Number(form.displayOrder ?? 0);
    if (!Number.isInteger(order) || order < 0 || order > 9999) return "Thứ tự hiển thị phải từ 0 đến 9999.";
    const duplicate = genres.some((genre) => genre.genreId !== editing?.genreId && normalizedText(genre.name) === normalizedText(name));
    if (duplicate) return `Thể loại “${name}” đã tồn tại.`;
    return "";
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }

    const payload: GenreRequest = {
      ...form,
      name: form.name.trim().replace(/\s+/g, " "),
      description: form.description?.trim() || null,
      colorCode: (form.colorCode || DEFAULT_COLOR).toUpperCase(),
      displayOrder: Number(form.displayOrder || 0),
    };
    setSaving(true);
    setFormError("");
    try {
      if (editing) {
        await genreService.updateGenre(editing.genreId, payload);
        toast.success("Đã cập nhật thể loại.");
      } else {
        await genreService.createGenre(payload);
        toast.success("Đã tạo thể loại mới.");
      }
      setFormOpen(false);
      await fetchGenres();
    } catch (saveError) {
      setFormError(getApiErrorMessage(saveError, editing ? "Cập nhật thể loại thất bại." : "Tạo thể loại thất bại."));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (genre: Genre, status: GenreStatus) => {
    setStatusUpdatingId(genre.genreId);
    try {
      const updated = await genreService.updateStatus(genre.genreId, status);
      setGenres((current) => current.map((item) => item.genreId === genre.genreId ? { ...item, ...updated } : item));
      toast.success(status === "ACTIVE" ? `Đã khôi phục “${genre.name}”.` : `Đã ngừng sử dụng “${genre.name}”.`);
      if (status === "INACTIVE") setArchiveTarget(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể cập nhật trạng thái thể loại."));
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const resetFilters = () => {
    setQuery("");
    setStatusFilter("ALL");
    setSourceFilter("ALL");
    setSortMode("ORDER");
  };

  return (
    <main className="flex-1 overflow-y-auto bg-[#f5f7fa]">
      <div className="mx-auto max-w-[1380px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
              <FolderKanban size={15} className="text-rose-500" /> Danh mục nội dung <span className="text-slate-300">/</span> Phân loại phim
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Quản lý thể loại</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Chuẩn hóa danh mục dùng khi nhập phim, theo dõi mức độ sử dụng và kiểm soát thể loại xuất hiện trong các biểu mẫu vận hành.</p>
          </div>
          {canCreate && (
            <button type="button" onClick={openCreate} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-extrabold text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-rose-600">
              <Plus size={17} /> Thêm thể loại
            </button>
          )}
        </header>

        <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={<Tags size={19} />} label="Tổng danh mục" value={stats.total} note={`${genres.length - stats.active} đang ngừng dùng`} tone="rose" />
          <StatCard icon={<CheckCircle2 size={19} />} label="Đang hoạt động" value={stats.active} note="Có thể chọn cho phim mới" tone="emerald" />
          <StatCard icon={<Film size={19} />} label="Đang được dùng" value={stats.inUse} note="Thể loại có phim liên kết" tone="blue" />
          <StatCard icon={<FolderKanban size={19} />} label="Lượt gắn với phim" value={stats.assignments} note="Tổng liên kết phim – thể loại" tone="violet" />
        </section>

        {!canCreate && !canUpdate && <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">Bạn đang xem dữ liệu ở chế độ chỉ đọc.</div>}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-base font-black text-slate-950">Danh sách thể loại</h2>
                <p className="mt-1 text-xs text-slate-500">Ngừng dùng để ẩn khỏi lựa chọn phim mới; dữ liệu phim cũ luôn được giữ lại.</p>
              </div>
              <button type="button" onClick={() => void fetchGenres()} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 px-3.5 text-xs font-extrabold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 xl:self-auto">
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Làm mới
              </button>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_180px_210px]">
              <label className="relative block">
                <span className="sr-only">Tìm thể loại</span>
                <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên, mô tả hoặc slug..." className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100" />
              </label>
              <FilterSelect value={statusFilter} onChange={(value) => setStatusFilter(value as StatusFilter)} ariaLabel="Lọc trạng thái">
                <option value="ALL">Tất cả trạng thái</option><option value="ACTIVE">Đang hoạt động</option><option value="INACTIVE">Ngừng sử dụng</option>
              </FilterSelect>
              <FilterSelect value={sourceFilter} onChange={(value) => setSourceFilter(value as SourceFilter)} ariaLabel="Lọc nguồn">
                <option value="ALL">Tất cả nguồn</option><option value="MANUAL">Tạo thủ công</option><option value="TMDB">Đồng bộ TMDB</option>
              </FilterSelect>
              <label className="relative block">
                <ArrowUpDown size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} aria-label="Sắp xếp thể loại" className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold text-slate-700 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100">
                  <option value="ORDER">Thứ tự hiển thị</option><option value="NAME">Tên A → Z</option><option value="USAGE">Dùng nhiều nhất</option><option value="UPDATED">Mới cập nhật</option>
                </select>
              </label>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
              <span>Hiển thị <b className="text-slate-800">{visibleGenres.length}</b> / {genres.length} thể loại</span>
              {hasFilters && <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1.5 font-bold text-rose-600 hover:text-rose-700"><FilterX size={14} /> Xóa bộ lọc</button>}
            </div>
          </div>

          {loading ? <LoadingState /> : loadError ? <ErrorState message={loadError} onRetry={fetchGenres} /> : visibleGenres.length === 0 ? <EmptyState hasFilters={hasFilters} canCreate={canCreate} onCreate={openCreate} onReset={resetFilters} /> : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[960px] text-left">
                  <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-black uppercase tracking-[0.1em] text-slate-400"><tr><th className="px-5 py-3.5">Thể loại</th><th className="px-4 py-3.5">Nguồn</th><th className="px-4 py-3.5">Mức sử dụng</th><th className="px-4 py-3.5">Trạng thái</th><th className="px-4 py-3.5">Cập nhật</th><th className="px-5 py-3.5 text-right">Thao tác</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{visibleGenres.map((genre) => <GenreRow key={genre.genreId} genre={genre} canUpdate={canUpdate} updating={statusUpdatingId === genre.genreId} onEdit={() => openEdit(genre)} onArchive={() => setArchiveTarget(genre)} onRestore={() => void changeStatus(genre, "ACTIVE")} />)}</tbody>
                </table>
              </div>
              <div className="grid gap-3 p-3 md:hidden">{visibleGenres.map((genre) => <GenreMobileCard key={genre.genreId} genre={genre} canUpdate={canUpdate} updating={statusUpdatingId === genre.genreId} onEdit={() => openEdit(genre)} onArchive={() => setArchiveTarget(genre)} onRestore={() => void changeStatus(genre, "ACTIVE")} />)}</div>
            </>
          )}
        </section>
      </div>

      {formOpen && (editing ? canUpdate : canCreate) && <GenreFormModal editing={editing} form={form} setForm={setForm} error={formError} saving={saving} onClose={() => !saving && setFormOpen(false)} onSubmit={handleSubmit} />}
      {archiveTarget && canUpdate && <ArchiveDialog genre={archiveTarget} loading={statusUpdatingId === archiveTarget.genreId} onClose={() => statusUpdatingId === null && setArchiveTarget(null)} onConfirm={() => void changeStatus(archiveTarget, "INACTIVE")} />}
    </main>
  );
}

function StatCard({ icon, label, value, note, tone }: { icon: ReactNode; label: string; value: number; note: string; tone: "rose" | "emerald" | "blue" | "violet" }) {
  const styles = { rose: "bg-rose-50 text-rose-600", emerald: "bg-emerald-50 text-emerald-600", blue: "bg-blue-50 text-blue-600", violet: "bg-violet-50 text-violet-600" };
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400">{label}</p><p className="mt-1 text-2xl font-black text-slate-950">{value.toLocaleString("vi-VN")}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles[tone]}`}>{icon}</span></div><p className="mt-3 text-xs text-slate-500">{note}</p></article>;
}

function FilterSelect({ value, onChange, ariaLabel, children }: { value: string; onChange: (value: string) => void; ariaLabel: string; children: ReactNode }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={ariaLabel} className="h-11 appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-700 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100">{children}</select>;
}

type GenreActionProps = { genre: Genre; canUpdate: boolean; updating: boolean; onEdit: () => void; onArchive: () => void; onRestore: () => void };

function GenreRow({ genre, canUpdate, updating, onEdit, onArchive, onRestore }: GenreActionProps) {
  const active = genreStatus(genre) === "ACTIVE";
  return <tr className="group transition hover:bg-slate-50/80"><td className="px-5 py-4"><GenreIdentity genre={genre} /></td><td className="px-4 py-4"><SourceBadge source={genreSource(genre)} /></td><td className="px-4 py-4"><div className="font-extrabold text-slate-800">{genreMovieCount(genre)} phim</div><div className="mt-1 text-xs text-slate-400">Thứ tự #{Number(genre.displayOrder || 0)}</div></td><td className="px-4 py-4"><StatusBadge active={active} /></td><td className="px-4 py-4 text-xs font-semibold text-slate-500">{formatUpdatedAt(genre.updatedAt)}</td><td className="px-5 py-4"><div className="flex justify-end gap-1.5">{canUpdate && <><IconButton label="Chỉnh sửa thể loại" onClick={onEdit}><Edit3 size={15} /></IconButton>{active ? <IconButton label="Ngừng sử dụng" onClick={onArchive} disabled={updating}>{updating ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />}</IconButton> : <IconButton label="Khôi phục thể loại" onClick={onRestore} disabled={updating}>{updating ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}</IconButton>}</>}</div></td></tr>;
}

function GenreMobileCard({ genre, canUpdate, updating, onEdit, onArchive, onRestore }: GenreActionProps) {
  const active = genreStatus(genre) === "ACTIVE";
  return <article className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><GenreIdentity genre={genre} /><StatusBadge active={active} /></div><div className="mt-4 grid grid-cols-2 gap-2"><MiniMetric label="Phim liên kết" value={`${genreMovieCount(genre)} phim`} /><MiniMetric label="Thứ tự" value={`#${Number(genre.displayOrder || 0)}`} /></div><div className="mt-4 flex items-center justify-between"><SourceBadge source={genreSource(genre)} />{canUpdate && <div className="flex gap-1"><IconButton label="Chỉnh sửa" onClick={onEdit}><Edit3 size={15} /></IconButton>{active ? <IconButton label="Ngừng dùng" onClick={onArchive} disabled={updating}><Ban size={15} /></IconButton> : <IconButton label="Khôi phục" onClick={onRestore} disabled={updating}><RotateCcw size={15} /></IconButton>}</div>}</div></article>;
}

function GenreIdentity({ genre }: { genre: Genre }) {
  const color = genreColor(genre);
  return <div className="flex min-w-0 items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-base font-black" style={{ color, borderColor: `${color}35`, backgroundColor: `${color}12` }}>{genre.name.trim().charAt(0).toUpperCase()}</span><div className="min-w-0"><div className="truncate font-extrabold text-slate-900">{genre.name}</div><div className="mt-0.5 max-w-[360px] truncate text-xs text-slate-400">{genre.description || "Chưa có mô tả"}</div><div className="mt-1 font-mono text-[10px] text-slate-400">/{genre.slug || slugify(genre.name)}</div></div></div>;
}

function SourceBadge({ source }: { source: GenreSource }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${source === "TMDB" ? "bg-sky-50 text-sky-700" : "bg-slate-100 text-slate-600"}`}>{source === "TMDB" ? "TMDB" : "Thủ công"}</span>;
}

function StatusBadge({ active }: { active: boolean }) {
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}><span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />{active ? "Hoạt động" : "Ngừng dùng"}</span>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 px-3 py-2"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div><div className="mt-0.5 text-sm font-extrabold text-slate-800">{value}</div></div>;
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50">{children}</button>;
}

function GenreFormModal({ editing, form, setForm, error, saving, onClose, onSubmit }: { editing: Genre | null; form: GenreRequest; setForm: React.Dispatch<React.SetStateAction<GenreRequest>>; error: string; saving: boolean; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm" onMouseDown={onClose}><div className="max-h-[94vh] w-full max-w-[620px] overflow-y-auto rounded-2xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-6"><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-rose-500">Cấu hình danh mục</p><h2 className="mt-1 text-xl font-black text-slate-950">{editing ? "Chỉnh sửa thể loại" : "Tạo thể loại mới"}</h2><p className="mt-1 text-xs text-slate-500">Tên rõ ràng giúp nhân viên chọn đúng khi nhập phim.</p></div><button type="button" aria-label="Đóng" onClick={onClose} disabled={saving} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"><X size={18} /></button></header><form onSubmit={onSubmit} className="space-y-5 p-5 sm:p-6"><div><label className={labelClass}>Tên thể loại *</label><input autoFocus value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} maxLength={100} placeholder="Ví dụ: Khoa học viễn tưởng" className={inputClass} /><div className="mt-1.5 flex justify-between text-[11px] text-slate-400"><span>Slug dự kiến: /{slugify(form.name)}</span><span>{form.name.length}/100</span></div></div><div><label className={labelClass}>Mô tả nội bộ</label><textarea value={form.description || ""} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} maxLength={1000} rows={4} placeholder="Nêu đặc điểm để nhân viên phân loại phim thống nhất..." className={`${inputClass} h-auto resize-none py-3 leading-6`} /><div className="mt-1 text-right text-[11px] text-slate-400">{(form.description || "").length}/1000</div></div><div className="grid gap-4 sm:grid-cols-2"><div><label className={labelClass}>Màu nhận diện</label><div className="mt-2 flex flex-wrap items-center gap-2">{COLOR_PRESETS.map((color) => <button key={color} type="button" aria-label={`Chọn màu ${color}`} onClick={() => setForm((current) => ({ ...current, colorCode: color }))} className={`h-8 w-8 rounded-lg border-2 transition ${form.colorCode?.toUpperCase() === color ? "scale-110 border-slate-900 shadow" : "border-white ring-1 ring-slate-200"}`} style={{ backgroundColor: color }} />)}<label className="relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-500"><Palette size={15} /><input type="color" value={form.colorCode || DEFAULT_COLOR} onChange={(event) => setForm((current) => ({ ...current, colorCode: event.target.value }))} className="absolute inset-0 cursor-pointer opacity-0" /></label></div><input value={form.colorCode || ""} onChange={(event) => setForm((current) => ({ ...current, colorCode: event.target.value }))} maxLength={7} className={`${inputClass} font-mono uppercase`} /></div><div><label className={labelClass}>Thứ tự hiển thị</label><input type="number" min={0} max={9999} value={form.displayOrder ?? 0} onChange={(event) => setForm((current) => ({ ...current, displayOrder: Number(event.target.value) }))} className={inputClass} /><p className="mt-1.5 text-[11px] leading-4 text-slate-400">Số nhỏ xuất hiện trước trong danh sách chọn.</p></div></div>{editing && <div><label className={labelClass}>Trạng thái</label><div className="mt-2 grid grid-cols-2 gap-2"><StatusChoice active={form.status === "ACTIVE"} title="Hoạt động" description="Có thể chọn cho phim mới" onClick={() => setForm((current) => ({ ...current, status: "ACTIVE" }))} /><StatusChoice active={form.status === "INACTIVE"} title="Ngừng dùng" description="Ẩn khỏi lựa chọn mới" onClick={() => setForm((current) => ({ ...current, status: "INACTIVE" }))} /></div></div>}{error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}<footer className="flex justify-end gap-2 border-t border-slate-100 pt-5"><button type="button" onClick={onClose} disabled={saving} className="h-10 rounded-xl bg-slate-100 px-4 text-sm font-extrabold text-slate-600 hover:bg-slate-200">Hủy</button><button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-extrabold text-white hover:bg-rose-700 disabled:opacity-60">{saving && <Loader2 size={15} className="animate-spin" />}{editing ? "Lưu thay đổi" : "Tạo thể loại"}</button></footer></form></div></div>;
}

function StatusChoice({ active, title, description, onClick }: { active: boolean; title: string; description: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`rounded-xl border p-3 text-left transition ${active ? "border-rose-400 bg-rose-50 ring-2 ring-rose-100" : "border-slate-200 bg-white hover:bg-slate-50"}`}><div className={`text-sm font-extrabold ${active ? "text-rose-700" : "text-slate-700"}`}>{title}</div><div className="mt-0.5 text-[11px] text-slate-500">{description}</div></button>;
}

function ArchiveDialog({ genre, loading, onClose, onConfirm }: { genre: Genre; loading: boolean; onClose: () => void; onConfirm: () => void }) {
  const count = genreMovieCount(genre);
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={onClose}><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><Ban size={22} /></span><h3 className="mt-4 text-lg font-black text-slate-950">Ngừng sử dụng “{genre.name}”?</h3><p className="mt-2 text-sm leading-6 text-slate-600">Thể loại sẽ bị ẩn khỏi danh sách chọn cho phim mới. {count > 0 ? `${count} phim đang liên kết vẫn giữ nguyên dữ liệu và tiếp tục hiển thị thể loại này.` : "Không có phim nào đang liên kết."}</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} disabled={loading} className="h-10 rounded-xl bg-slate-100 px-4 text-sm font-extrabold text-slate-600">Hủy</button><button type="button" onClick={onConfirm} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-extrabold text-white hover:bg-amber-600 disabled:opacity-60">{loading && <Loader2 size={15} className="animate-spin" />}Ngừng sử dụng</button></div></div></div>;
}

function LoadingState() { return <div className="flex min-h-[330px] flex-col items-center justify-center gap-3 text-sm font-semibold text-slate-500"><Loader2 size={28} className="animate-spin text-rose-500" />Đang tải danh mục thể loại...</div>; }
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="flex min-h-[330px] flex-col items-center justify-center px-6 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500"><X size={22} /></span><h3 className="mt-4 font-black text-slate-900">Không tải được dữ liệu</h3><p className="mt-1 max-w-md text-sm text-slate-500">{message}</p><button type="button" onClick={onRetry} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-extrabold text-white"><RefreshCw size={14} /> Thử lại</button></div>; }
function EmptyState({ hasFilters, canCreate, onCreate, onReset }: { hasFilters: boolean; canCreate: boolean; onCreate: () => void; onReset: () => void }) { return <div className="flex min-h-[330px] flex-col items-center justify-center px-6 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Tags size={25} /></span><h3 className="mt-4 font-black text-slate-900">{hasFilters ? "Không tìm thấy thể loại phù hợp" : "Chưa có thể loại"}</h3><p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{hasFilters ? "Hãy đổi từ khóa hoặc bỏ bớt điều kiện lọc." : "Tạo danh mục đầu tiên để bắt đầu phân loại phim."}</p>{hasFilters ? <button type="button" onClick={onReset} className="mt-5 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-extrabold text-white">Xóa bộ lọc</button> : canCreate && <button type="button" onClick={onCreate} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-extrabold text-white"><Plus size={14} /> Tạo thể loại đầu tiên</button>}</div>; }
