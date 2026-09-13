import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import {
  Search, Plus, Edit, Loader2, X, MonitorPlay, ChevronLeft, ChevronRight, RefreshCw, Eye, Armchair, AlertTriangle, Ban, Rows3, Settings2, Wand2
} from "lucide-react";
import {
  cinemaRoomService,
  type GetCinemaRoomsParams,
} from "@/api/cinemaRoomApi";
import { getApiErrorMessage } from "@/api/errors";
import { seatService } from "@/api/seatApi";
import { CinemaRoom, CinemaRoomCreationRequest, CinemaRoomOperationalSummary, CinemaRoomSeatSummary, CinemaRoomUpdateRequest, RoomStatus, RoomType, SeatLayoutRequest } from "@/types/cinemaRoom";
import type { Seat, SeatStatus, SeatType, SeatUpdateRequest } from "@/types/seat";

const FONT = "'Inter', sans-serif";

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  ACTIVE:   { label: "Hoạt động",   bg: "rgba(16,185,129,0.1)",  color: "#059669" },
  INACTIVE: { label: "Vô hiệu", bg: "rgba(239,68,68,0.1)",   color: "#dc2626" },
  MAINTENANCE: { label: "Bảo trì", bg: "rgba(245,158,11,0.12)", color: "#d97706" },
};

const ROOM_TYPE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  STANDARD: { label: "Standard", bg: "#dbeafe", color: "#1d4ed8" },
  IMAX: { label: "IMAX", bg: "#ede9fe", color: "#6d28d9" },
  "4DX": { label: "4DX", bg: "#dcfce7", color: "#15803d" },
  BED: { label: "Bed", bg: "#fce7f3", color: "#be185d" },
  VIP: { label: "VIP", bg: "#fee2e2", color: "#b91c1c" },
};

const ROOM_TYPES: RoomType[] = ['STANDARD', 'IMAX', '4DX'];
const ROOM_STATUSES: RoomStatus[] = ['ACTIVE', 'INACTIVE', 'MAINTENANCE'];
const SEAT_TYPES: SeatType[] = ['NORMAL', 'VIP', 'COUPLE', 'DISABLED'];
const SEAT_STATUSES: SeatStatus[] = ['ACTIVE', 'INACTIVE', 'MAINTENANCE'];

const SEAT_STATUS_CONFIG: Record<SeatStatus, { label: string; bg: string; color: string; border: string }> = {
  ACTIVE: { label: "Hoạt động", bg: "#ecfdf5", color: "#047857", border: "#10b981" },
  INACTIVE: { label: "Vô hiệu", bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1" },
  MAINTENANCE: { label: "Bảo trì", bg: "#fffbeb", color: "#b45309", border: "#f59e0b" },
};

const SEAT_TYPE_CONFIG: Record<SeatType, { label: string; color: string }> = {
  NORMAL: { label: "Thường", color: "#2563eb" },
  VIP: { label: "VIP", color: "#7c3aed" },
  COUPLE: { label: "Đôi", color: "#db2777" },
  DISABLED: { label: "Hỗ trợ", color: "#0f766e" },
};

type CinemaRoomFormState = CinemaRoomUpdateRequest;

const EMPTY_FORM: CinemaRoomFormState = {
  cinemaRoomName: "",
  seatQuantity: 50,
  seatsPerRow: 10,
  type: "STANDARD",
  status: "ACTIVE",
};

const PAGE_SIZE = 10;

const INPUT_CLS =
  "w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500";
const LABEL_CLS = "block text-xs font-semibold text-slate-500 mb-1 tracking-wide";

// ── Main Component ────────────────────────────────────────────────────────────
export function CinemaRoomManagementPage({ canManage = true }: { canManage?: boolean }) {
  const [rooms, setRooms] = useState<CinemaRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [operationalSummary, setOperationalSummary] = useState<CinemaRoomOperationalSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<RoomStatus>("ACTIVE");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<CinemaRoom | null>(null);
  const [seatViewRoom, setSeatViewRoom] = useState<CinemaRoom | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const [form, setForm] = useState<CinemaRoomFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState({ open: false, message: "", onConfirm: () => {} });
  const closeConfirm = () => setConfirmDialog(p => ({ ...p, open: false }));

  const fetchRooms = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const params: GetCinemaRoomsParams = { page, size: PAGE_SIZE };
      if (search.trim()) params.keyword = search.trim();
      params.status = statusFilter;
      const data = await cinemaRoomService.getCinemaRooms(params);
      setRooms(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
      setCurrentPage(data.page);
      void cinemaRoomService.getOperationalSummary()
        .then(setOperationalSummary)
        .catch(() => setOperationalSummary(null));
    } catch (err) {
      console.error("Failed to fetch cinema rooms", err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const requestTimer = window.setTimeout(() => fetchRooms(0), 0);
    return () => window.clearTimeout(requestTimer);
  }, [fetchRooms]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRooms(0);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setShowCreateModal(true);
  };

  const openEdit = (room: CinemaRoom) => {
    setSelectedRoom(room);
    setForm({
      cinemaRoomName: room.cinemaRoomName,
      seatQuantity: room.seatQuantity,
      seatsPerRow: room.seatsPerRow,
      type: room.type,
      status: room.status,
    });
    setFormError("");
    setShowEditModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const trimmedName = form.cinemaRoomName.trim();
    if (!trimmedName) { setFormError("Tên phòng chiếu là bắt buộc."); return; }
    if (!Number.isInteger(form.seatQuantity) || form.seatQuantity < 50 || form.seatQuantity > 200) { setFormError("Số lượng ghế phải là số nguyên từ 50 đến 200."); return; }
    if (form.seatsPerRow !== undefined && (form.seatsPerRow < 5 || form.seatsPerRow > 20)) { setFormError("Số ghế mỗi hàng phải từ 5 đến 20."); return; }
    
    // Validate duplicates
    if (rooms.some(r => r.cinemaRoomName.toLowerCase() === trimmedName.toLowerCase())) {
      setFormError(`Phòng chiếu "${trimmedName}" đã tồn tại.`); return;
    }

    setFormLoading(true);
    try {
      const payload: CinemaRoomCreationRequest = {
        cinemaRoomName: trimmedName,
        seatQuantity: form.seatQuantity,
        seatsPerRow: form.seatsPerRow,
        type: form.type,
      };
      await cinemaRoomService.create(payload);
      setShowCreateModal(false);
      fetchRooms(0);
    } catch (err: unknown) {
      setFormError(getApiErrorMessage(err, "Tạo phòng chiếu thất bại."));
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    setFormError("");
    const trimmedName = form.cinemaRoomName.trim();
    if (!trimmedName) { setFormError("Tên phòng chiếu là bắt buộc."); return; }
    if (!Number.isInteger(form.seatQuantity) || form.seatQuantity < 50 || form.seatQuantity > 200) { setFormError("Số lượng ghế phải là số nguyên từ 50 đến 200."); return; }
    if (form.seatsPerRow !== undefined && (form.seatsPerRow < 5 || form.seatsPerRow > 20)) { setFormError("Số ghế mỗi hàng phải từ 5 đến 20."); return; }

    // Validate duplicates (excluding the current one)
    if (rooms.some(r => r.cinemaRoomId !== selectedRoom.cinemaRoomId && r.cinemaRoomName.toLowerCase() === trimmedName.toLowerCase())) {
      setFormError(`Phòng chiếu "${trimmedName}" đã tồn tại.`); return;
    }

    setFormLoading(true);
    try {
      await cinemaRoomService.update(selectedRoom.cinemaRoomId, {
        ...form,
        cinemaRoomName: trimmedName,
      });
      setShowEditModal(false);
      fetchRooms(currentPage);
    } catch (err: unknown) {
      setFormError(getApiErrorMessage(err, "Cập nhật phòng chiếu thất bại."));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (room: CinemaRoom) => {
    setConfirmDialog({
      open: true,
      message: `Vô hiệu hóa phòng chiếu "${room.cinemaRoomName}"?`,
      onConfirm: async () => {
        closeConfirm();
        setDeletingId(room.cinemaRoomId);
        try {
          await cinemaRoomService.delete(room.cinemaRoomId);
          setRooms((prev) =>
            statusFilter === "ACTIVE"
              ? prev.filter((item) => item.cinemaRoomId !== room.cinemaRoomId)
              : prev.map((item) =>
                  item.cinemaRoomId === room.cinemaRoomId ? { ...item, status: "INACTIVE" } : item
                )
          );
          fetchRooms(currentPage);
          toast.success("Vô hiệu hóa phòng chiếu thành công.");
        } catch (err: unknown) {
          toast.error(getApiErrorMessage(err, "Vô hiệu hóa phòng chiếu thất bại."));
        } finally {
          setDeletingId(null);
        }
      }
    });
  };

  const handleRestore = (room: CinemaRoom) => {
    setConfirmDialog({
      open: true,
      message: `Khôi phục phòng chiếu "${room.cinemaRoomName}" về trạng thái hoạt động?`,
      onConfirm: async () => {
        closeConfirm();
        setRestoringId(room.cinemaRoomId);
        try {
          const restoredRoom = await cinemaRoomService.restore(room.cinemaRoomId);
          setRooms((prev) =>
            statusFilter === "ACTIVE"
              ? prev.map((item) => item.cinemaRoomId === room.cinemaRoomId ? restoredRoom : item)
              : prev.filter((item) => item.cinemaRoomId !== room.cinemaRoomId)
          );
          fetchRooms(currentPage);
          toast.success("Khôi phục phòng chiếu thành công.");
        } catch (err: unknown) {
          toast.error(getApiErrorMessage(err, "Khôi phục phòng chiếu thất bại."));
        } finally {
          setRestoringId(null);
        }
      }
    });
  };

  const activeRooms = rooms.filter(room => room.status === "ACTIVE").length;
  const maintenanceRooms = rooms.filter(room => room.status === "MAINTENANCE").length;
  const currentPageSeats = rooms.reduce((sum, room) => sum + (room.seatQuantity || 0), 0);
  const roomTypeSummary = useMemo(() => {
    const counts = new Map<RoomType, number>();
    rooms.forEach(room => counts.set(room.type, (counts.get(room.type) ?? 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [rooms]);

  return (
    <div style={{ flex: 1, overflowY: "auto", background: "#F4F5F7", fontFamily: FONT }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 28px 40px" }}>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 22 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(230,57,70,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MonitorPlay size={15} color="#E63946" />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em" }}>
                Cinema Rooms
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1.25 }}>
              Quản lý phòng chiếu
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
              Quản lý cấu hình phòng chiếu, loại phòng, trạng thái vận hành và sơ đồ ghế.
            </p>
          </div>
          {canManage && statusFilter === "ACTIVE" && (
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
              <Plus size={16} /> Thêm phòng chiếu
            </button>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 18 }}>
          <RoomStat icon={<MonitorPlay size={17} />} label="Tổng phòng" value={operationalSummary?.totalRooms ?? totalElements} tone="#E63946" />
          <RoomStat icon={<Rows3 size={17} />} label="Đang hoạt động" value={operationalSummary?.activeRooms ?? activeRooms} tone="#059669" />
          <RoomStat icon={<Armchair size={17} />} label="Tổng ghế" value={operationalSummary?.totalSeats ?? currentPageSeats} tone="#2563eb" />
          <RoomStat icon={<Settings2 size={17} />} label="Phòng bảo trì" value={operationalSummary?.maintenanceRooms ?? maintenanceRooms} tone="#d97706" />
        </div>

        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 14, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <form onSubmit={handleSearch} style={{ position: "relative", flex: "1 1 280px" }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Tìm theo tên phòng chiếu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%", padding: "10px 12px 10px 38px",
                  borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc",
                  fontFamily: FONT, fontSize: 13, color: "#1e293b", outline: "none", boxSizing: "border-box",
                }}
              />
            </form>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {roomTypeSummary.map(([type, count]) => {
                const cfg = ROOM_TYPE_CONFIG[type] ?? ROOM_TYPE_CONFIG.STANDARD;
                return (
                  <span key={type} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 10px", borderRadius: 999, background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 700 }}>
                    {cfg.label} <span style={{ opacity: 0.75 }}>{count}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>Danh sách phòng chiếu</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                Trang {currentPage + 1} hiển thị {rooms.length} phòng
              </div>
            </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RoomStatus)}
              style={{ height: 40, padding: "0 12px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", fontFamily: FONT, fontSize: 13, color: "#334155", outline: "none", cursor: "pointer" }}
            >
              {ROOM_STATUSES.map((status) => (
                <option key={status} value={status}>{STATUS_CONFIG[status].label}</option>
              ))}
            </select>
            <button
              onClick={() => fetchRooms(currentPage)}
              title="Làm mới"
              disabled={loading}
              style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", flexShrink: 0 }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            </button>
          </div>
        </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", color: "#94a3b8" }}>
              <Loader2 size={30} style={{ color: "#E63946", marginBottom: 12 }} className="animate-spin" />
              <span style={{ fontSize: 14 }}>Đang tải danh sách phòng chiếu...</span>
            </div>
          ) : rooms.length === 0 ? (
            <RoomEmptyState canManage={canManage} search={search} onCreate={openCreate} />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, padding: 14 }}>
              {rooms.map((room) => (
                <RoomCard
                  key={room.cinemaRoomId}
                  room={room}
                  canManage={canManage}
                  deleting={deletingId === room.cinemaRoomId}
                  restoring={restoringId === room.cinemaRoomId}
                  onViewSeats={() => setSeatViewRoom(room)}
                  onEdit={() => openEdit(room)}
                  onDelete={() => handleDelete(room)}
                  onRestore={() => handleRestore(room)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, padding: "0 4px" }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>
              Tổng cộng <b>{totalElements}</b> phòng
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <PagBtn disabled={currentPage === 0} onClick={() => fetchRooms(currentPage - 1)}><ChevronLeft size={16} /></PagBtn>
              <span style={{ fontSize: 13, color: "#334155", fontWeight: 600 }}>Trang {currentPage + 1} / {totalPages}</span>
              <PagBtn disabled={currentPage >= totalPages - 1} onClick={() => fetchRooms(currentPage + 1)}><ChevronRight size={16} /></PagBtn>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────────── */}
      {canManage && showCreateModal && (
        <CinemaRoomFormModal
          title="Thêm phòng chiếu mới"
          isEdit={false}
          form={form} setForm={setForm} formError={formError} formLoading={formLoading}
          onClose={() => setShowCreateModal(false)} onSubmit={handleCreateSubmit} submitLabel="Tạo"
        />
      )}
      {canManage && showEditModal && selectedRoom && (
        <CinemaRoomFormModal
          title="Chỉnh sửa phòng chiếu"
          isEdit={true}
          form={form} setForm={setForm} formError={formError} formLoading={formLoading}
          onClose={() => setShowEditModal(false)} onSubmit={handleEditSubmit} submitLabel="Lưu"
        />
      )}
      {seatViewRoom && (
        <CinemaRoomSeatsModal
          room={seatViewRoom}
          canManage={canManage}
          onClose={() => setSeatViewRoom(null)}
        />
      )}
      <ConfirmDialog
        open={confirmDialog.open}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onClose={closeConfirm}
      />
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function RoomStat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
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

function RoomCard({
  room, canManage, deleting, restoring, onViewSeats, onEdit, onDelete, onRestore,
}: {
  room: CinemaRoom;
  canManage: boolean;
  deleting: boolean;
  restoring: boolean;
  onViewSeats: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRestore: () => void;
}) {
  const status = STATUS_CONFIG[room.status] ?? STATUS_CONFIG.INACTIVE;
  const type = ROOM_TYPE_CONFIG[room.type] ?? ROOM_TYPE_CONFIG.STANDARD;
  const seatsPerRow = room.seatsPerRow || 10;
  const rowCount = Math.ceil((room.seatQuantity || 0) / seatsPerRow);

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, background: "#fff", minHeight: 174, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: type.bg, color: type.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <MonitorPlay size={18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{room.cinemaRoomName}</div>
          </div>
        </div>
        <span style={{ padding: "4px 9px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: status.bg, color: status.color, whiteSpace: "nowrap", flexShrink: 0 }}>
          {status.label}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginTop: 16 }}>
        <RoomMetric label="Loại" value={type.label} />
        <RoomMetric label="Hàng" value={String(rowCount)} />
      </div>

      <div style={{ marginTop: "auto", paddingTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <button
          onClick={onViewSeats}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
        >
          <Eye size={14} /> Sơ đồ ghế
        </button>
        {canManage && (
          <div style={{ display: "flex", gap: 4 }}>
            <ActionBtn title="Chỉnh sửa" onClick={onEdit}><Edit size={15} /></ActionBtn>
            {room.status === "INACTIVE" ? (
              <ActionBtn title="Khôi phục" disabled={restoring} onClick={onRestore}>
                {restoring ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              </ActionBtn>
            ) : (
              <ActionBtn title="Vô hiệu hóa" disabled={deleting} onClick={onDelete}>
                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />}
              </ActionBtn>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RoomMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 8, padding: "8px 9px", minWidth: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#334155", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}

function RoomEmptyState({ search, canManage, onCreate }: { search: string; canManage: boolean; onCreate: () => void }) {
  return (
    <div style={{ padding: "64px 20px", textAlign: "center", color: "#64748b" }}>
      <div style={{ width: 46, height: 46, borderRadius: 12, background: "#f1f5f9", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
        <MonitorPlay size={22} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>
        {search.trim() ? "Không tìm thấy phòng chiếu" : "Chưa có phòng chiếu"}
      </div>
      <div style={{ fontSize: 13, marginBottom: canManage ? 16 : 0 }}>
        {search.trim() ? "Thử đổi từ khóa tìm kiếm hoặc tạo phòng chiếu mới." : "Tạo phòng chiếu để bắt đầu cấu hình sơ đồ ghế và lịch chiếu."}
      </div>
      {canManage && (
        <button onClick={onCreate} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 9, border: "none", background: "#E63946", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          <Plus size={15} /> Thêm phòng chiếu
        </button>
      )}
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

function PagBtn({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: disabled ? "#f8fafc" : "#fff",
        cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        color: disabled ? "#cbd5e1" : "#475569",
      }}
    >{children}</button>
  );
}

function ModalBtn({ variant, type = "button", onClick, disabled, children }: {
  variant: "primary" | "cancel"; type?: "button" | "submit"; onClick?: () => void; disabled?: boolean; children: React.ReactNode;
}) {
  const isPrimary = variant === "primary";
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{
        padding: "9px 20px", borderRadius: 8, border: "none", cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 13, fontWeight: 600, fontFamily: FONT, opacity: disabled ? 0.6 : 1,
        background: isPrimary ? "#E63946" : "#f1f5f9",
        color: isPrimary ? "#fff" : "#475569",
        display: "flex", alignItems: "center", gap: 6,
      }}
    >{children}</button>
  );
}

function CinemaRoomFormModal({ title, isEdit, form, setForm, formError, formLoading, onClose, onSubmit, submitLabel }: {
  title: string; isEdit: boolean;
  form: CinemaRoomFormState;
  setForm: React.Dispatch<React.SetStateAction<CinemaRoomFormState>>;
  formError: string; formLoading: boolean; onClose: () => void; onSubmit: (e: React.FormEvent) => void; submitLabel: string;
}) {
  return (
    <div 
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(15,23,42,0.48)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div 
        style={{ position: "relative", background: "#fff", borderRadius: 16, width: "100%", maxWidth: 520, boxShadow: "0 24px 64px rgba(0,0,0,0.18)", fontFamily: FONT, overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{title}</h3>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>Cấu hình số ghế, hàng ghế và định dạng phòng chiếu.</p>
          </div>
          <button 
            type="button"
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
              <label className={LABEL_CLS}>Tên phòng chiếu *</label>
              <input type="text" required className={INPUT_CLS} value={form.cinemaRoomName} onChange={(e) => setForm({ ...form, cinemaRoomName: e.target.value })} placeholder="Phòng 1, phòng IMAX..." />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label className={LABEL_CLS}>Số lượng ghế *</label>
                <input type="number" min={50} max={200} required className={INPUT_CLS} value={form.seatQuantity} onChange={(e) => setForm({ ...form, seatQuantity: +e.target.value })} />
              </div>
              <div>
                <label className={LABEL_CLS}>Ghế / hàng</label>
                <input type="number" min={5} max={20} placeholder="10" className={INPUT_CLS} value={form.seatsPerRow || ""} onChange={(e) => setForm({ ...form, seatsPerRow: +e.target.value || undefined })} />
              </div>
              <div>
                <label className={LABEL_CLS}>Loại phòng</label>
                <select className={INPUT_CLS} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as RoomType })}>
                  {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            {isEdit && (
              <div>
                <label className={LABEL_CLS}>Trạng thái</label>
                <select className={INPUT_CLS} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as RoomStatus })}>
                  {ROOM_STATUSES.map(status => <option key={status} value={status}>{STATUS_CONFIG[status].label}</option>)}
                </select>
              </div>
            )}
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

function CinemaRoomSeatsModal({ room, canManage, onClose }: { room: CinemaRoom; canManage: boolean; onClose: () => void }) {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [summary, setSummary] = useState<CinemaRoomSeatSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [selectedRowLabel, setSelectedRowLabel] = useState<string | null>(null);
  
  // Single edit state
  const [editForm, setEditForm] = useState<SeatUpdateRequest | null>(null);
  // Bulk edit state
  const [bulkType, setBulkType] = useState<SeatType | "">("");
  const [bulkStatus, setBulkStatus] = useState<SeatStatus | "">("");
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showLayoutWizard, setShowLayoutWizard] = useState(false);
  const [layoutSaving, setLayoutSaving] = useState(false);
  const [layoutError, setLayoutError] = useState("");

  const fetchSeats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await seatService.getSeats({
        cinemaRoomId: room.cinemaRoomId,
        page: 0,
        size: Math.max(room.seatQuantity + 20, 400), // Get all seats
      });
      const sorted = [...data.content].sort(compareSeats);
      setSeats(sorted);
      // The summary is a separate endpoint so the cards remain accurate even
      // when a room has more seats than the page-size fallback above.
      void cinemaRoomService.getSeatSummary(room.cinemaRoomId)
        .then(setSummary)
        .catch(() => setSummary(null));
      
      // Refresh selections
      setSelectedSeats(prev => {
        if (prev.length === 0) return [];
        const newSel = prev.map(p => sorted.find(s => s.seatId === p.seatId)).filter(Boolean) as Seat[];
        setSelectedRowLabel(label => label && newSel.every(s => s.seatRow === label) ? label : null);
        if (newSel.length === 1) {
          setEditForm(toSeatForm(newSel[0]));
        }
        return newSel;
      });
    } catch (err) {
      console.error("Failed to fetch seats", err);
    } finally {
      setLoading(false);
    }
  }, [room.cinemaRoomId, room.seatQuantity]);

  useEffect(() => {
    const requestTimer = window.setTimeout(fetchSeats, 0);
    return () => window.clearTimeout(requestTimer);
  }, [fetchSeats]);

  const rows = useMemo(() => {
    const grouped = new Map<string, Seat[]>();
    seats.forEach(s => {
      if (!grouped.has(s.seatRow)) grouped.set(s.seatRow, []);
      grouped.get(s.seatRow)!.push(s);
    });
    return Array.from(grouped.entries()).sort((a,b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
  }, [seats]);
  const couplePlacementRowLabel = useMemo(() => {
    const availableRows = rows.filter(([, rowSeats]) =>
      rowSeats.some(isSeatInCurrentLayout)
    );
    return availableRows.length > 0 ? availableRows[availableRows.length - 1][0] : "";
  }, [rows]);

  const toggleSeat = (seat: Seat) => {
    if (!canManage) return;
    setSelectedRowLabel(null);
    setSelectedSeats(prev => {
      const isSelected = prev.some(s => s.seatId === seat.seatId);
      let newSel;
      if (isSelected) {
        newSel = prev.filter(s => s.seatId !== seat.seatId);
      } else {
        newSel = [...prev, seat];
      }
      if (newSel.length === 1) {
        setEditForm(toSeatForm(newSel[0]));
      } else {
        setEditForm(null);
        setBulkType("");
        setBulkStatus("");
      }
      setError("");
      return newSel;
    });
  };

  const handleSeatHover = (e: React.MouseEvent, seat: Seat) => {
    if (!canManage) return;
    if (e.shiftKey || e.buttons === 1) {
      setSelectedRowLabel(null);
      setSelectedSeats(prev => {
        if (prev.some(s => s.seatId === seat.seatId)) return prev;
        const newSel = [...prev, seat];
        if (newSel.length === 1) {
          setEditForm(toSeatForm(newSel[0]));
        } else {
          setEditForm(null);
          setBulkType("");
          setBulkStatus("");
        }
        setError("");
        return newSel;
      });
    }
  };

  const toggleRow = (rowLabel: string, rowSeats: Seat[]) => {
    if (!canManage) return;
    setSelectedSeats(prev => {
      const allSelected = rowSeats.length > 0 && rowSeats.every(rs => prev.some(p => p.seatId === rs.seatId));
      const newSel = allSelected && selectedRowLabel === rowLabel ? [] : [...rowSeats].sort(compareSeats);
      setSelectedRowLabel(newSel.length > 0 ? rowLabel : null);
      setEditForm(null);
      setBulkType("");
      setBulkStatus("");
      setError("");
      return newSel;
    });
  };

  const clearSelection = () => {
    setSelectedSeats([]);
    setSelectedRowLabel(null);
    setEditForm(null);
    setBulkType("");
    setBulkStatus("");
    setError("");
  };

  const handleSaveSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    if (selectedSeats.length !== 1 || !editForm) return;
    if (!editForm.seatRow.trim() || !editForm.seatCode.trim() || editForm.seatNumber <= 0) {
      setError("Vui lòng nhập đầy đủ hàng, số và mã ghế.");
      return;
    }
    if (editForm.type === "COUPLE") {
      setError("Ghế couple phải được cấu hình theo cặp liền kề. Hãy chọn 2 ghế cạnh nhau hoặc chọn cả hàng rồi đổi loại ghế.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await seatService.update(selectedSeats[0].seatId, {
        ...editForm,
        cinemaRoomId: room.cinemaRoomId,
        seatRow: editForm.seatRow.trim().toUpperCase(),
        seatCode: editForm.seatCode.trim().toUpperCase(),
        seatNumber: Number(editForm.seatNumber),
      });
      fetchSeats(); // Refresh all to keep layout in sync
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Cập nhật ghế thất bại."));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    if (selectedSeats.length < 2) return;
    if (!bulkType && !bulkStatus) {
      setError("Vui lòng chọn loại ghế hoặc trạng thái để cập nhật.");
      return;
    }
    if (bulkType === "COUPLE") {
      const coupleError = validateCoupleSelection(selectedSeats, couplePlacementRowLabel);
      if (coupleError) {
        setError(coupleError);
        return;
      }
    }

    setSaving(true);
    setError("");
    try {
      await seatService.bulkUpdate({
        seatIds: selectedSeats.map(s => s.seatId),
        type: bulkType || undefined,
        status: bulkStatus || undefined,
      });
      fetchSeats();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Cập nhật nhiều ghế thất bại."));
    } finally {
      setSaving(false);
    }
  };

  const handleQuickBulkStatus = async (status: SeatStatus) => {
    if (!canManage || selectedSeats.length === 0 || saving) return;
    setSaving(true);
    setError("");
    setBulkStatus(status);
    try {
      await seatService.bulkUpdate({
        seatIds: selectedSeats.map(s => s.seatId),
        status,
      });
      toast.success(`Đã cập nhật trạng thái ${selectedSeats.length} ghế.`);
      fetchSeats();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Cập nhật trạng thái ghế thất bại."));
    } finally {
      setSaving(false);
    }
  };

  const handleApplyLayout = async (request: SeatLayoutRequest) => {
    if (!canManage || layoutSaving) return;
    setLayoutSaving(true);
    setLayoutError("");
    try {
      await cinemaRoomService.applySeatLayout(room.cinemaRoomId, request);
      toast.success("Đã tạo lại sơ đồ ghế theo mẫu.");
      setShowLayoutWizard(false);
      clearSelection();
      await fetchSeats();
    } catch (err: unknown) {
      setLayoutError(getApiErrorMessage(err, "Không thể tạo lại sơ đồ ghế."));
    } finally {
      setLayoutSaving(false);
    }
  };

  const activeCount = seats.filter((seat) => seat.status === "ACTIVE").length;
  const maintenanceCount = seats.filter((seat) => seat.status === "MAINTENANCE").length;

  const DARK_INPUT = {
    width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 12px",
    color: "#f8fafc", fontSize: 14, outline: "none", boxSizing: "border-box" as const, transition: "border 0.2s"
  };
  const LABEL_STYLES = {
    display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6, letterSpacing: "0.05em"
  };

  const getSeatStyle = (seat: Seat, isSelected: boolean) => {
    if (isSelected) return { bg: "rgba(244,63,94,0.15)", border: "#f43f5e", color: "#f43f5e", shadow: "0 0 15px rgba(244,63,94,0.4)" };
    if (seat.status === "INACTIVE") return { bg: "transparent", border: "#334155", color: "#475569", shadow: "none" };
    if (seat.status === "MAINTENANCE") return { bg: "rgba(245,158,11,0.1)", border: "#f59e0b", color: "#fcd34d", shadow: "0 0 10px rgba(245,158,11,0.2)" };
    
    switch (seat.type) {
      case "VIP": return { bg: "rgba(139,92,246,0.15)", border: "#8b5cf6", color: "#ddd6fe", shadow: "0 0 12px rgba(139,92,246,0.3)" };
      case "COUPLE": return { bg: "rgba(236,72,153,0.15)", border: "#ec4899", color: "#fbcfe8", shadow: "0 0 12px rgba(236,72,153,0.3)" };
      case "DISABLED": return { bg: "rgba(14,116,144,0.15)", border: "#06b6d4", color: "#67e8f9", shadow: "0 0 12px rgba(14,116,144,0.3)" };
      default: return { bg: "rgba(59,130,246,0.1)", border: "#3b82f6", color: "#bfdbfe", shadow: "0 0 10px rgba(59,130,246,0.2)" };
    }
  };

  return (
    <div 
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}
    >
      <div 
        style={{ position: "relative", background: "#0f172a", borderRadius: 20, width: "100%", maxWidth: 1280, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.4)", fontFamily: FONT, overflow: "hidden", border: "1px solid #1e293b" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(56,189,248,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Armchair size={15} color="#38bdf8" />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.15em" }}>Sơ đồ ghế ngồi</span>
            </div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#f8fafc" }}>{room.cinemaRoomName}</h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
              Tổng {summary?.totalSeats ?? seats.length} ghế · <span style={{ color: "#10b981" }}>{summary?.activeSeats ?? activeCount} hoạt động</span> · <span style={{ color: "#f59e0b" }}>{summary?.maintenanceSeats ?? maintenanceCount} bảo trì</span>
            </p>
            {summary && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                <SummaryPill label="Thường" value={summary.normalSeats} color="#60a5fa" />
                <SummaryPill label="VIP" value={summary.vipSeats} color="#c4b5fd" />
                <SummaryPill label="Đôi" value={summary.coupleSeats} color="#f9a8d4" />
                <SummaryPill label="Hỗ trợ" value={summary.accessibleSeats} color="#67e8f9" />
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {canManage && (
              <button
                type="button"
                onClick={() => { setLayoutError(""); setShowLayoutWizard(true); }}
                style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 34, padding: "0 12px", borderRadius: 9, border: "1px solid rgba(56,189,248,0.35)", background: "rgba(56,189,248,0.1)", color: "#7dd3fc", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                title="Tạo lại sơ đồ theo mẫu"
              >
                <Wand2 size={14} /> Bố trí tự động
              </button>
            )}
            <button
            onClick={onClose}
            style={{ 
              width: 32, height: 32, borderRadius: "50%", 
              background: "rgba(255,255,255,0.05)", border: "none", cursor: "pointer", 
              color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#E63946";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              e.currentTarget.style.color = "#94a3b8";
            }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 0, minHeight: 0, flex: 1, userSelect: "none" }}>
          <div style={{ padding: "32px 12px", overflow: "auto", background: "#0b0f19", display: "flex", flexDirection: "column", alignItems: "center" }}>
            
            {/* Glowing Screen Design */}
            <div style={{
              height: 48, width: "100%", maxWidth: 640, margin: "0 auto 64px",
              background: "linear-gradient(to bottom, rgba(56,189,248,0.2), transparent)",
              boxShadow: "0 10px 40px rgba(56,189,248,0.1)",
              borderRadius: "50% 50% 0 0 / 100% 100% 0 0",
              borderTop: "3px solid rgba(56,189,248,0.6)",
              position: "relative", display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <span style={{ color: "rgba(56,189,248,0.5)", fontSize: 12, letterSpacing: "0.5em", fontWeight: 800 }}>Màn hình</span>
            </div>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, color: "#64748b" }}>
                <Loader2 size={32} style={{ color: "#38bdf8", marginBottom: 16 }} className="animate-spin" />
                <span style={{ fontSize: 14, letterSpacing: "0.05em" }}>Đang khởi tạo sơ đồ ghế...</span>
              </div>
            ) : seats.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#64748b", fontSize: 14 }}>
                Chưa có ghế nào cho phòng chiếu này.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center", width: "100%", maxWidth: 1000 }}>
                {rows.map(([rowLabel, rowSeats]) => {
                  const allSelected = rowSeats.length > 0 && rowSeats.every(rs => selectedSeats.some(s => s.seatId === rs.seatId));
                  return (
                    <div key={rowLabel} style={{ display: "flex", alignItems: "center", position: "relative", paddingLeft: 46, minHeight: 42, width: "100%" }}>
                      <button 
                        onClick={() => toggleRow(rowLabel, rowSeats)} 
                        title={`Chọn hàng ${rowLabel} để đổi nhanh trạng thái ghế`}
                        style={{ 
                          position: "absolute", left: 0,
                          width: 38, height: 42, flexShrink: 0, fontWeight: 900, fontSize: 15, 
                          color: allSelected ? "#fecdd3" : "#cbd5e1",
                          background: allSelected ? "rgba(244,63,94,0.18)" : "rgba(30,41,59,0.85)",
                          border: allSelected ? "1px solid rgba(244,63,94,0.65)" : "1px solid #334155",
                          borderRadius: 10,
                          cursor: "pointer", 
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.2s",
                          boxShadow: allSelected ? "0 0 16px rgba(244,63,94,0.25)" : "none"
                        }}
                      >
                        {rowLabel}
                      </button>
                      <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", flex: 1 }}>
                        {rowSeats.sort((a, b) => a.seatNumber - b.seatNumber).map(seat => {
                          const selected = selectedSeats.some(s => s.seatId === seat.seatId);
                          const sStyle = getSeatStyle(seat, selected);
                          
                          return (
                            <button
                              key={seat.seatId}
                              type="button"
                              onClick={() => toggleSeat(seat)}
                              onMouseEnter={(e) => handleSeatHover(e, seat)}
                              title={`${seat.seatCode} · ${SEAT_TYPE_CONFIG[seat.type]?.label} · ${SEAT_STATUS_CONFIG[seat.status]?.label}`}
                              style={{
                                width: 38, height: 38,
                                borderRadius: "8px 8px 4px 4px",
                                border: `1px solid ${sStyle.border}`,
                                borderBottom: `4px solid ${sStyle.border}`,
                                background: sStyle.bg,
                                color: sStyle.color,
                                cursor: "pointer",
                                fontSize: 11, fontWeight: 800,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                                transform: selected ? "translateY(-3px)" : "none",
                                boxShadow: sStyle.shadow,
                                outline: "none", position: "relative",
                                opacity: seat.status === "INACTIVE" ? 0.4 : 1
                              }}
                            >
                              {seat.seatCode}
                              {seat.type === "VIP" && seat.status !== "INACTIVE" && (
                                <div style={{ position: "absolute", top: -5, right: -5, width: 12, height: 12, borderRadius: "50%", background: "#8b5cf6", border: "2px solid #0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <span style={{ fontSize: 7, color: "#fff" }}>★</span>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Legend inside map */}
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", marginTop: 60, padding: "16px 28px", background: "rgba(30,41,59,0.7)", borderRadius: 16, border: "1px solid #1e293b", backdropFilter: "blur(4px)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: "rgba(59,130,246,0.15)", border: "1px solid #3b82f6", borderBottom: "3px solid #3b82f6" }} />
                Thường
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: "rgba(139,92,246,0.15)", border: "1px solid #8b5cf6", borderBottom: "3px solid #8b5cf6" }} />
                VIP
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: "rgba(236,72,153,0.15)", border: "1px solid #ec4899", borderBottom: "3px solid #ec4899" }} />
                Couple
              </div>
              <div style={{ width: 1, height: 18, background: "#334155", margin: "0 4px" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: "rgba(244,63,94,0.15)", border: "1px solid #f43f5e", borderBottom: "3px solid #f43f5e" }} />
                Đang chọn
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: "rgba(245,158,11,0.1)", border: "1px solid #f59e0b", borderBottom: "3px solid #f59e0b" }} />
                Bảo trì
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: "transparent", border: "1px solid #334155", borderBottom: "3px solid #334155", opacity: 0.5 }} />
                Vô hiệu
              </div>
            </div>
          </div>

          <aside style={{ borderLeft: "1px solid #1e293b", padding: 28, overflowY: "auto", background: "#1e293b" }}>
            {selectedSeats.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, textAlign: "center", color: "#64748b" }}>
                <Armchair size={48} style={{ marginBottom: 16, color: "#334155" }} />
                <div style={{ fontSize: 16, fontWeight: 700, color: "#94a3b8" }}>Chưa chọn ghế nào</div>
                <div style={{ fontSize: 13, marginTop: 8, maxWidth: 240, lineHeight: 1.6 }}>Nhấp vào ghế để chỉnh sửa.<br/>Bấm nhãn hàng bên trái để chọn nguyên hàng và đổi nhanh trạng thái.</div>
              </div>
            ) : selectedSeats.length === 1 && editForm ? (
              <form onSubmit={handleSaveSingle} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", background: "#0f172a", padding: 16, borderRadius: 12, border: "1px solid #334155" }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.08em" }}>Đang chỉnh sửa</div>
                    <div style={{ marginTop: 4, fontSize: 26, fontWeight: 900, color: "#38bdf8" }}>{selectedSeats[0].seatCode}</div>
                  </div>
                  <button type="button" onClick={clearSelection} style={{ fontSize: 12, color: "#f43f5e", background: "rgba(244,63,94,0.1)", border: "none", cursor: "pointer", fontWeight: 700, padding: "6px 12px", borderRadius: 6 }}>Bỏ chọn</button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ ...LABEL_STYLES }}>Hàng</label>
                    <input style={{ ...DARK_INPUT }} value={editForm.seatRow} maxLength={5} onChange={(e) => setEditForm({ ...editForm, seatRow: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ ...LABEL_STYLES }}>Số</label>
                    <input type="number" min={1} style={{ ...DARK_INPUT }} value={editForm.seatNumber} onChange={(e) => setEditForm({ ...editForm, seatNumber: Number(e.target.value) })} />
                  </div>
                </div>

                <div>
                  <label style={{ ...LABEL_STYLES }}>Mã ghế (Hiển thị)</label>
                  <input style={{ ...DARK_INPUT }} value={editForm.seatCode} maxLength={10} onChange={(e) => setEditForm({ ...editForm, seatCode: e.target.value })} />
                </div>

                <div style={{ height: 1, background: "#334155", margin: "4px 0" }} />

                <div>
                  <label style={{ ...LABEL_STYLES }}>Loại ghế</label>
                  <select style={{ ...DARK_INPUT }} value={editForm.type ?? "NORMAL"} onChange={(e) => setEditForm({ ...editForm, type: e.target.value as SeatType })}>
                    {SEAT_TYPES.map((type) => <option key={type} value={type} style={{ background: "#1e293b" }}>{SEAT_TYPE_CONFIG[type].label}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ ...LABEL_STYLES }}>Trạng thái</label>
                  <select style={{ ...DARK_INPUT }} value={editForm.status ?? "ACTIVE"} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as SeatStatus })}>
                    {SEAT_STATUSES.map((status) => <option key={status} value={status} style={{ background: "#1e293b" }}>{SEAT_STATUS_CONFIG[status].label}</option>)}
                  </select>
                </div>

                {error && (
                  <div style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: 10, padding: "12px", color: "#f43f5e", fontSize: 13, fontWeight: 500 }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  style={{ marginTop: 12, height: 46, borderRadius: 12, border: "none", background: saving ? "#475569" : "#38bdf8", color: saving ? "#94a3b8" : "#0f172a", fontSize: 14, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: saving ? "none" : "0 6px 20px rgba(56,189,248,0.3)", transition: "all 0.2s" }}
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSaveBulk} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", background: "#0f172a", padding: 16, borderRadius: 12, border: "1px solid #334155" }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.08em" }}>
                      {selectedRowLabel ? `Cập nhật hàng ${selectedRowLabel}` : "Cập nhật hàng loạt"}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 20, fontWeight: 900, color: "#38bdf8" }}>
                      {selectedSeats.length} ghế{selectedRowLabel ? " trong hàng" : ""}
                    </div>
                  </div>
                  <button type="button" onClick={clearSelection} style={{ fontSize: 12, color: "#f43f5e", background: "rgba(244,63,94,0.1)", border: "none", cursor: "pointer", fontWeight: 700, padding: "6px 12px", borderRadius: 6 }}>Bỏ chọn tất cả</button>
                </div>
                
                <div style={{ padding: 14, background: "#0f172a", borderRadius: 10, border: "1px solid #334155", maxHeight: 120, overflowY: "auto", fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>
                  {selectedSeats.map(s => s.seatCode).join(", ")}
                </div>

                <div style={{ height: 1, background: "#334155", margin: "4px 0" }} />

                <div>
                  <label style={{ ...LABEL_STYLES }}>Đổi nhanh trạng thái</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                    {SEAT_STATUSES.map((status) => {
                      const cfg = SEAT_STATUS_CONFIG[status];
                      return (
                        <button
                          key={status}
                          type="button"
                          disabled={saving}
                          onClick={() => handleQuickBulkStatus(status)}
                          style={{
                            minHeight: 38,
                            borderRadius: 9,
                            border: `1px solid ${cfg.border}`,
                            background: saving ? "#334155" : cfg.bg,
                            color: saving ? "#64748b" : cfg.color,
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: saving ? "not-allowed" : "pointer",
                            padding: "6px 8px",
                          }}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label style={{ ...LABEL_STYLES }}>Đổi loại ghế thành</label>
                  <select style={{ ...DARK_INPUT }} value={bulkType} onChange={(e) => setBulkType(e.target.value as SeatType)}>
                    <option value="" style={{ background: "#1e293b" }}>-- Không thay đổi --</option>
                    {SEAT_TYPES.map((type) => <option key={type} value={type} style={{ background: "#1e293b" }}>{SEAT_TYPE_CONFIG[type].label}</option>)}
                  </select>
                  {bulkType === "COUPLE" && (
                    <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.5, color: "#f9a8d4" }}>
                      Ghế couple chỉ đặt ở hàng cuối còn hoạt động {couplePlacementRowLabel ? `(${couplePlacementRowLabel})` : ""} và phải chọn theo cặp liền kề, ví dụ {couplePlacementRowLabel || "A"}1-{couplePlacementRowLabel || "A"}2.
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ ...LABEL_STYLES }}>Đổi trạng thái thành</label>
                  <select style={{ ...DARK_INPUT }} value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as SeatStatus)}>
                    <option value="" style={{ background: "#1e293b" }}>-- Không thay đổi --</option>
                    {SEAT_STATUSES.map((status) => <option key={status} value={status} style={{ background: "#1e293b" }}>{SEAT_STATUS_CONFIG[status].label}</option>)}
                  </select>
                </div>

                {error && (
                  <div style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: 10, padding: "12px", color: "#f43f5e", fontSize: 13, fontWeight: 500 }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving || (!bulkType && !bulkStatus)}
                  style={{ marginTop: 12, height: 46, borderRadius: 12, border: "none", background: (saving || (!bulkType && !bulkStatus)) ? "#334155" : "#38bdf8", color: (saving || (!bulkType && !bulkStatus)) ? "#64748b" : "#0f172a", fontSize: 14, fontWeight: 800, cursor: (saving || (!bulkType && !bulkStatus)) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: (saving || (!bulkType && !bulkStatus)) ? "none" : "0 6px 20px rgba(56,189,248,0.3)", transition: "all 0.2s" }}
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {saving ? "Đang xử lý..." : "Áp dụng cho tất cả"}
                </button>
              </form>
            )}
          </aside>
        </div>
      </div>
      {showLayoutWizard && canManage && (
        <SeatLayoutWizard
          room={room}
          saving={layoutSaving}
          error={layoutError}
          onClose={() => setShowLayoutWizard(false)}
          onSubmit={handleApplyLayout}
        />
      )}
    </div>
  );
}

function SummaryPill({ label, value, color }: { label: string; value: number; color: string }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 7px", borderRadius: 999, background: "rgba(15,23,42,0.8)", color, fontSize: 10, fontWeight: 800 }}>{label} {value}</span>;
}

function SeatLayoutWizard({
  room,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  room: CinemaRoom;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (request: SeatLayoutRequest) => void;
}) {
  const [form, setForm] = useState<SeatLayoutRequest>({
    seatQuantity: room.seatQuantity || 50,
    seatsPerRow: room.seatsPerRow || 10,
    vipRowsFromBack: 2,
    coupleSeatsOnLastRow: 0,
    accessibleSeatsOnFirstRow: 2,
  });
  const rowCount = Math.ceil(form.seatQuantity / Math.max(1, form.seatsPerRow));
  const lastRowCapacity = form.seatQuantity - ((rowCount - 1) * form.seatsPerRow);
  const coupleCount = form.coupleSeatsOnLastRow || 0;
  const invalidCouple = coupleCount % 2 !== 0 || coupleCount > lastRowCapacity;
  const invalidVip = (form.vipRowsFromBack || 0) > rowCount;
  const invalidAccessible = (form.accessibleSeatsOnFirstRow || 0) > Math.min(form.seatsPerRow, form.seatQuantity);
  const invalid = !Number.isInteger(form.seatQuantity) || !Number.isInteger(form.seatsPerRow) || form.seatQuantity < 50 || form.seatQuantity > 200 || form.seatsPerRow < 5 || form.seatsPerRow > 20 || invalidCouple || invalidVip || invalidAccessible;

  const updateNumber = (key: keyof SeatLayoutRequest, value: string) => {
    const parsed = Number(value);
    setForm(prev => ({ ...prev, [key]: Number.isFinite(parsed) ? parsed : 0 }));
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(2,6,23,0.72)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 500, background: "#fff", borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,0.35)", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#0369a1", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em" }}><Wand2 size={15} /> MẪU BỐ TRÍ NHANH</div>
            <h3 style={{ margin: "7px 0 0", fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Tạo lại sơ đồ {room.cinemaRoomName}</h3>
            <p style={{ margin: "4px 0 0", fontSize: 12, lineHeight: 1.5, color: "#64748b" }}>Dùng cho phòng chưa phát hành suất chiếu. Ghế cũ sẽ được sắp xếp lại theo thứ tự hàng.</p>
          </div>
          <button type="button" onClick={onClose} style={{ width: 30, height: 30, border: "none", borderRadius: "50%", background: "#f1f5f9", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (!invalid) onSubmit(form); }} style={{ padding: 22 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <WizardNumber label="Tổng số ghế" min={50} max={200} value={form.seatQuantity} onChange={v => updateNumber("seatQuantity", v)} />
            <WizardNumber label="Ghế mỗi hàng" min={5} max={20} value={form.seatsPerRow} onChange={v => updateNumber("seatsPerRow", v)} />
            <WizardNumber label="Hàng VIP (từ sau)" min={0} max={5} value={form.vipRowsFromBack || 0} onChange={v => updateNumber("vipRowsFromBack", v)} />
            <WizardNumber label="Ghế đôi hàng cuối" min={0} max={12} step={2} value={form.coupleSeatsOnLastRow || 0} onChange={v => updateNumber("coupleSeatsOnLastRow", v)} />
            <WizardNumber label="Ghế hỗ trợ hàng đầu" min={0} max={6} value={form.accessibleSeatsOnFirstRow || 0} onChange={v => updateNumber("accessibleSeatsOnFirstRow", v)} />
          </div>
          <div style={{ marginTop: 16, padding: 14, borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#475569", fontSize: 13, lineHeight: 1.65 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Số hàng dự kiến</span><strong style={{ color: "#0f172a" }}>{rowCount}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Sức chứa hàng cuối</span><strong style={{ color: "#0f172a" }}>{lastRowCapacity}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Phân loại</span><strong style={{ color: "#0f172a" }}>{Math.max(0, form.seatQuantity - (form.coupleSeatsOnLastRow || 0) - (form.accessibleSeatsOnFirstRow || 0))} thường/VIP + {form.coupleSeatsOnLastRow || 0} đôi + {form.accessibleSeatsOnFirstRow || 0} hỗ trợ</strong></div>
          </div>
          {(invalidCouple || invalidVip || invalidAccessible) && <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 9, background: "#fff7ed", border: "1px solid #fed7aa", color: "#c2410c", fontSize: 12, lineHeight: 1.5 }}>{invalidCouple ? "Ghế đôi phải là số chẵn và không vượt quá hàng cuối. " : ""}{invalidVip ? "Số hàng VIP vượt quá số hàng phòng. " : ""}{invalidAccessible ? "Ghế hỗ trợ vượt quá hàng đầu. " : ""}</div>}
          {error && <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 9, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontSize: 12, lineHeight: 1.5 }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
            <button type="button" onClick={onClose} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontWeight: 700, cursor: "pointer" }}>Hủy</button>
            <button type="submit" disabled={saving || invalid} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: saving || invalid ? "#cbd5e1" : "#0284c7", color: "#fff", fontWeight: 800, cursor: saving || invalid ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7 }}>{saving && <Loader2 size={14} className="animate-spin" />}{saving ? "Đang áp dụng..." : "Áp dụng sơ đồ"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WizardNumber({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: string) => void }) {
  return <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, fontWeight: 800, color: "#64748b" }}>{label}<input type="number" min={min} max={max} step={step} value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8, color: "#0f172a", fontSize: 14, fontWeight: 700, outline: "none" }} /></label>;
}

function compareSeats(a: Seat, b: Seat) {
  return a.seatRow.localeCompare(b.seatRow, undefined, { numeric: true })
    || a.seatNumber - b.seatNumber
    || a.seatId - b.seatId;
}

function validateCoupleSelection(selectedSeats: Seat[], couplePlacementRowLabel: string) {
  if (selectedSeats.some((seat) => !isSeatInCurrentLayout(seat))) {
    return "Không thể đổi ghế đã vô hiệu thành ghế couple. Hãy chọn các ghế còn trong layout hiện tại.";
  }

  const seatsByRow = new Map<string, Seat[]>();
  selectedSeats.forEach((seat) => {
    const rowSeats = seatsByRow.get(seat.seatRow) ?? [];
    rowSeats.push(seat);
    seatsByRow.set(seat.seatRow, rowSeats);
  });

  for (const [row, rowSeats] of seatsByRow.entries()) {
    if (couplePlacementRowLabel && row !== couplePlacementRowLabel) {
      return `Ghế couple chỉ được đặt ở hàng cuối cùng còn hoạt động (${couplePlacementRowLabel}). Hàng ${row} không hợp lệ.`;
    }

    const sortedSeats = [...rowSeats].sort((a, b) => a.seatNumber - b.seatNumber || a.seatId - b.seatId);
    if (sortedSeats.length % 2 !== 0) {
      return `Hàng ${row} đang chọn lẻ ghế. Ghế couple phải đi theo từng cặp.`;
    }

    for (let i = 0; i < sortedSeats.length; i += 2) {
      const leftSeat = sortedSeats[i];
      const rightSeat = sortedSeats[i + 1];
      if (rightSeat.seatNumber !== leftSeat.seatNumber + 1) {
        return `Ghế couple phải là 2 ghế liền kề trong cùng hàng. Cặp gần ${leftSeat.seatCode} chưa hợp lệ.`;
      }
    }
  }

  return "";
}

function isSeatInCurrentLayout(seat: Seat) {
  return seat.status !== "INACTIVE";
}

function toSeatForm(seat: Seat): SeatUpdateRequest {
  return {
    cinemaRoomId: seat.cinemaRoomId,
    seatRow: seat.seatRow,
    seatNumber: seat.seatNumber,
    seatCode: seat.seatCode,
    type: seat.type,
    status: seat.status,
  };
}

function ConfirmDialog({ open, message, onConfirm, onClose }: {
  open: boolean; message: string; onConfirm: () => void; onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div 
      style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(15,23,42,0.4)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div 
        style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 400, padding: 24, boxShadow: "0 20px 40px rgba(0,0,0,0.15)", fontFamily: "Inter, sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <AlertTriangle size={20} color="#d97706" />
          </div>
          <div>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Xác nhận</h3>
            <p style={{ margin: 0, fontSize: 14, color: "#475569", lineHeight: 1.5 }}>{message}</p>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Hủy</button>
          <button onClick={onConfirm} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#f59e0b", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(245,158,11,0.25)" }}>Đồng ý</button>
        </div>
      </div>
    </div>
  );
}
