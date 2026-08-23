import {
  useMemo,
  useState,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, GripVertical, Lock, Minus, Plus, Unlock } from "lucide-react";

import type { ShowtimePlannerPreviewItem } from "@/api/showtimeApi";
import type { CinemaRoom } from "@/types/cinemaRoom";
import { TimeRulerPicker } from "@/components/ui/TimeRulerPicker";

const PIXELS_PER_MINUTE = 1.25;
const SNAP_MINUTES = 5;
const MIN_CARD_HEIGHT = 72;
const TIME_COLUMN_WIDTH = 80;
const ROOM_COLUMN_WIDTH = 340;

type SchedulePatch = Pick<
  ShowtimePlannerPreviewItem,
  "cinemaRoomId" | "cinemaRoomName" | "showDate" | "startTime" | "endTime"
>;

type Props = {
  items: ShowtimePlannerPreviewItem[];
  rooms: CinemaRoom[];
  fromDate: string;
  toDate: string;
  openingTime: string;
  latestFinishTime: string;
  turnaroundMinutes: number;
  dirtyKeys: Set<string>;
  isRoomCompatible: (item: ShowtimePlannerPreviewItem, room: CinemaRoom) => boolean;
  onMove: (item: ShowtimePlannerPreviewItem, patch: SchedulePatch) => void;
  onInvalidRoom: (item: ShowtimePlannerPreviewItem, room: CinemaRoom) => void;
  onLockedMove: (item: ShowtimePlannerPreviewItem) => void;
  onToggleLock: (key: string) => void;
};

type PositionedItem = {
  item: ShowtimePlannerPreviewItem;
  offsetMinutes: number;
  durationMinutes: number;
};

type DragState = {
  clientKey: string;
  grabOffsetMinutes: number;
};

type GapDragState = {
  gapKey: string;
  startClientY: number;
  startGap: number;
  previewGap: number;
  maximumGap: number;
  suffix: PositionedItem[];
};

const timeToMinutes = (time?: string | null) => {
  const [hour = 0, minute = 0] = String(time ?? "00:00").slice(0, 5).split(":").map(Number);
  return hour * 60 + minute;
};

const formatMinutes = (minutes: number) => {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const dateAtMidnight = (date: string) => new Date(`${date}T00:00:00`);

const shiftDate = (date: string, days: number) => {
  const value = dateAtMidnight(date);
  value.setDate(value.getDate() + days);
  return value.toLocaleDateString("en-CA");
};

const dateRange = (fromDate: string, toDate: string) => {
  const result: string[] = [];
  for (let date = fromDate; date <= toDate; date = shiftDate(date, 1)) result.push(date);
  return result;
};

const formatDateLabel = (date: string) => dateAtMidnight(date).toLocaleDateString("vi-VN", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});

const durationOf = (item: ShowtimePlannerPreviewItem) => {
  const start = timeToMinutes(item.startTime);
  let end = timeToMinutes(item.endTime);
  if (end <= start) end += 1440;
  return Math.max(SNAP_MINUTES, end - start);
};

export function PlannerScheduleBoard({
  items,
  rooms,
  fromDate,
  toDate,
  openingTime,
  latestFinishTime,
  turnaroundMinutes,
  dirtyKeys,
  isRoomCompatible,
  onMove,
  onInvalidRoom,
  onLockedMove,
  onToggleLock,
}: Props) {
  const dates = useMemo(() => dateRange(fromDate, toDate), [fromDate, toDate]);
  const [selectedDate, setSelectedDate] = useState(fromDate);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [gapDragState, setGapDragState] = useState<GapDragState | null>(null);
  const openingMinutes = timeToMinutes(openingTime);
  const finishMinutes = timeToMinutes(latestFinishTime);
  const crossesMidnight = finishMinutes <= openingMinutes;
  const operationalMinutes = crossesMidnight
    ? 1440 - openingMinutes + finishMinutes
    : finishMinutes - openingMinutes;
  const timelineHeight = Math.max(360, operationalMinutes * PIXELS_PER_MINUTE);
  const activeDate = dates.includes(selectedDate) ? selectedDate : fromDate;
  const activeDateIndex = Math.max(0, dates.indexOf(activeDate));

  const operationalDateOf = (item: ShowtimePlannerPreviewItem) => {
    const itemMinutes = timeToMinutes(item.startTime);
    return crossesMidnight && itemMinutes < finishMinutes
      ? shiftDate(item.showDate, -1)
      : item.showDate;
  };

  const offsetOf = (item: ShowtimePlannerPreviewItem) => {
    const start = timeToMinutes(item.startTime);
    if (crossesMidnight && start < finishMinutes) return 1440 - openingMinutes + start;
    return start - openingMinutes;
  };

  const displayedItems = useMemo(
    () => items.filter((item) => operationalDateOf(item) === activeDate),
    // operationalDateOf depends on the current opening/closing window.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeDate, crossesMidnight, finishMinutes, items],
  );

  const positionedByRoom = useMemo(() => {
    const result = new Map<number, PositionedItem[]>();
    rooms.forEach((room) => result.set(room.cinemaRoomId, []));
    displayedItems.forEach((item) => {
      const offsetMinutes = offsetOf(item);
      if (offsetMinutes < 0 || offsetMinutes >= operationalMinutes) return;
      result.get(item.cinemaRoomId)?.push({
        item,
        offsetMinutes,
        durationMinutes: durationOf(item),
      });
    });
    result.forEach((roomItems) => roomItems.sort((left, right) => left.offsetMinutes - right.offsetMinutes));
    return result;
    // offsetOf depends on the current opening/closing window.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedItems, operationalMinutes, rooms]);

  const ticks = useMemo(() => {
    const result: number[] = [];
    for (let minute = 0; minute <= operationalMinutes; minute += 30) result.push(minute);
    return result;
  }, [operationalMinutes]);

  const selectedItem = displayedItems.find((item) => item.clientKey === selectedKey) ?? null;
  const selectedCompatibleRooms = selectedItem
    ? rooms.filter((room) => isRoomCompatible(selectedItem, room))
    : [];
  const emptyRooms = rooms.filter((room) => (positionedByRoom.get(room.cinemaRoomId)?.length ?? 0) === 0);

  const placeItem = (item: ShowtimePlannerPreviewItem, room: CinemaRoom, rawOffset: number) => {
    if (item.locked) {
      onLockedMove(item);
      return;
    }
    const duration = durationOf(item);
    const maximumOffset = Math.max(0, operationalMinutes - duration);
    const offset = Math.min(maximumOffset, Math.max(0, rawOffset));
    const absoluteStart = openingMinutes + offset;
    const startDayOffset = Math.floor(absoluteStart / 1440);
    const startMinutes = absoluteStart % 1440;
    const absoluteEnd = absoluteStart + duration;

    onMove(item, {
      cinemaRoomId: room.cinemaRoomId,
      cinemaRoomName: room.cinemaRoomName,
      showDate: shiftDate(activeDate, startDayOffset),
      startTime: formatMinutes(startMinutes),
      endTime: formatMinutes(absoluteEnd),
    });
  };

  const changeStartTime = (item: ShowtimePlannerPreviewItem, value: string) => {
    const room = rooms.find((candidate) => candidate.cinemaRoomId === item.cinemaRoomId);
    if (!room || !value) return;
    const minutes = timeToMinutes(value);
    const offset = crossesMidnight && minutes < finishMinutes
      ? 1440 - openingMinutes + minutes
      : minutes - openingMinutes;
    placeItem(item, room, offset);
  };

  const nudgeItem = (item: ShowtimePlannerPreviewItem, minutes: number) => {
    const room = rooms.find((candidate) => candidate.cinemaRoomId === item.cinemaRoomId);
    if (!room) return;
    placeItem(item, room, offsetOf(item) + minutes);
  };

  const moveItem = (event: DragEvent<HTMLDivElement>, room: CinemaRoom) => {
    event.preventDefault();
    if (!dragState) return;
    const item = items.find((candidate) => candidate.clientKey === dragState.clientKey);
    if (!item) return;
    if (!isRoomCompatible(item, room)) {
      onInvalidRoom(item, room);
      setDragState(null);
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const cursorMinutes = (event.clientY - bounds.top) / PIXELS_PER_MINUTE;
    const rawOffset = cursorMinutes - dragState.grabOffsetMinutes;
    const snappedOffset = Math.round(rawOffset / SNAP_MINUTES) * SNAP_MINUTES;
    placeItem(item, room, snappedOffset);
    setDragState(null);
  };

  const swapItems = (
    source: ShowtimePlannerPreviewItem,
    target: ShowtimePlannerPreviewItem,
  ) => {
    if (source.clientKey === target.clientKey) return;
    if (source.locked) {
      onLockedMove(source);
      return;
    }
    if (target.locked) {
      onLockedMove(target);
      return;
    }
    const sourceRoom = rooms.find((room) => room.cinemaRoomId === source.cinemaRoomId);
    const targetRoom = rooms.find((room) => room.cinemaRoomId === target.cinemaRoomId);
    if (!sourceRoom || !targetRoom) return;
    if (!isRoomCompatible(source, targetRoom)) {
      onInvalidRoom(source, targetRoom);
      return;
    }
    if (!isRoomCompatible(target, sourceRoom)) {
      onInvalidRoom(target, sourceRoom);
      return;
    }

    const sourceOffset = offsetOf(source);
    const targetOffset = offsetOf(target);
    placeItem(source, targetRoom, targetOffset);
    placeItem(target, sourceRoom, sourceOffset);
    setSelectedKey(source.clientKey);
  };

  const moveSelectedToPoint = (event: ReactMouseEvent<HTMLDivElement>, room: CinemaRoom) => {
    if (!selectedItem || dragState) return;
    if (!isRoomCompatible(selectedItem, room)) {
      onInvalidRoom(selectedItem, room);
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const cursorMinutes = (event.clientY - bounds.top) / PIXELS_PER_MINUTE;
    const snappedOffset = Math.round(cursorMinutes / SNAP_MINUTES) * SNAP_MINUTES;
    placeItem(selectedItem, room, snappedOffset);
  };

  const setGap = (
    roomItems: PositionedItem[],
    nextIndex: number,
    desiredGap: number,
  ) => {
    const previous = roomItems[nextIndex - 1];
    const next = roomItems[nextIndex];
    const last = roomItems[roomItems.length - 1];
    if (!previous || !next || !last) return;
    const currentGap = next.offsetMinutes - (previous.offsetMinutes + previous.durationMinutes);
    const endSlack = Math.max(0, operationalMinutes - (last.offsetMinutes + last.durationMinutes));
    const maximumGap = currentGap + endSlack;
    const normalizedGap = Math.min(maximumGap, Math.max(turnaroundMinutes, desiredGap));
    const suffixShift = normalizedGap - currentGap;
    if (suffixShift === 0) return;
    const affectedItems = roomItems.slice(nextIndex);
    const lockedItem = affectedItems.find(({ item }) => item.locked)?.item;
    if (lockedItem) {
      onLockedMove(lockedItem);
      return;
    }
    affectedItems.forEach((positioned) => {
      const room = rooms.find((candidate) => candidate.cinemaRoomId === positioned.item.cinemaRoomId);
      if (room) placeItem(positioned.item, room, positioned.offsetMinutes + suffixShift);
    });
  };

  const adjustGap = (
    roomItems: PositionedItem[],
    nextIndex: number,
    direction: -1 | 1,
  ) => {
    const previous = roomItems[nextIndex - 1];
    const next = roomItems[nextIndex];
    if (!previous || !next) return;
    const currentGap = next.offsetMinutes - (previous.offsetMinutes + previous.durationMinutes);
    setGap(roomItems, nextIndex, currentGap + direction * SNAP_MINUTES);
  };

  const startGapDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    roomItems: PositionedItem[],
    nextIndex: number,
    gapKey: string,
  ) => {
    if ((event.target as HTMLElement).closest("button")) return;
    const previous = roomItems[nextIndex - 1];
    const next = roomItems[nextIndex];
    const last = roomItems[roomItems.length - 1];
    if (!previous || !next || !last) return;
    const currentGap = next.offsetMinutes - (previous.offsetMinutes + previous.durationMinutes);
    if (currentGap < 0) return;
    const affectedItems = roomItems.slice(nextIndex);
    const lockedItem = affectedItems.find(({ item }) => item.locked)?.item;
    if (lockedItem) {
      onLockedMove(lockedItem);
      return;
    }
    const endSlack = Math.max(0, operationalMinutes - (last.offsetMinutes + last.durationMinutes));
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setGapDragState({
      gapKey,
      startClientY: event.clientY,
      startGap: currentGap,
      previewGap: currentGap,
      maximumGap: currentGap + endSlack,
      suffix: affectedItems,
    });
  };

  const dragGap = (event: ReactPointerEvent<HTMLDivElement>, gapKey: string) => {
    if (!gapDragState || gapDragState.gapKey !== gapKey) return;
    event.preventDefault();
    event.stopPropagation();
    const rawDelta = (event.clientY - gapDragState.startClientY) / PIXELS_PER_MINUTE;
    const snappedDelta = Math.round(rawDelta / SNAP_MINUTES) * SNAP_MINUTES;
    const desiredGap = Math.min(
      gapDragState.maximumGap,
      Math.max(turnaroundMinutes, gapDragState.startGap + snappedDelta),
    );
    if (desiredGap === gapDragState.previewGap) return;

    const suffixShift = desiredGap - gapDragState.startGap;
    gapDragState.suffix.forEach((positioned) => {
      const room = rooms.find((candidate) => candidate.cinemaRoomId === positioned.item.cinemaRoomId);
      if (room) placeItem(positioned.item, room, positioned.offsetMinutes + suffixShift);
    });
    setGapDragState((current) => current && current.gapKey === gapKey
      ? { ...current, previewGap: desiredGap }
      : current);
  };

  const finishGapDrag = (event: ReactPointerEvent<HTMLDivElement>, gapKey: string) => {
    if (!gapDragState || gapDragState.gapKey !== gapKey) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setGapDragState(null);
  };

  return (
    <div className="flex flex-col h-full min-h-0 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="shrink-0 border-b border-slate-200 bg-slate-50/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-extrabold text-slate-800 text-xs uppercase tracking-wide">
            <CalendarDays size={16} className="text-red-500 shrink-0" /> Lịch theo phòng
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={activeDateIndex === 0}
              onClick={() => setSelectedDate(dates[activeDateIndex - 1])}
              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:border-red-200 hover:text-red-600 disabled:opacity-30 shadow-xs"
              title="Ngày trước"
            >
              <ChevronLeft size={14} />
            </button>
            <select
              value={activeDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="min-w-44 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-extrabold text-slate-800 outline-none focus:border-red-400 shadow-xs"
              aria-label="Ngày đang xem"
            >
              {dates.map((date) => <option key={date} value={date}>{formatDateLabel(date)}</option>)}
            </select>
            <button
              type="button"
              disabled={activeDateIndex >= dates.length - 1}
              onClick={() => setSelectedDate(dates[activeDateIndex + 1])}
              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:border-red-200 hover:text-red-600 disabled:opacity-30 shadow-xs"
              title="Ngày sau"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-600">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-slate-400 bg-white" /> Đề xuất</span>
          <span className="flex items-center gap-1.5 text-blue-700"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Đã khóa</span>
          <span className="flex items-center gap-1.5 text-amber-700"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Vừa chỉnh</span>
          <span className="flex items-center gap-1.5 text-emerald-700"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Nghỉ hợp lệ</span>
          <span className="hidden xl:inline text-slate-400 font-normal">| Kéo suất hoặc vùng nghỉ để chỉnh nhanh</span>
        </div>
      </div>

      <div className="px-4">

        {emptyRooms.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10.5px] font-semibold text-slate-500">
            <span>Phòng đang trống cả ngày, có thể chuyển suất vào:</span>
            {emptyRooms.map((room) => (
              <span key={room.cinemaRoomId} className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 font-bold text-emerald-700">
                {room.cinemaRoomName}
              </span>
            ))}
          </div>
        )}

        {selectedItem && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-white p-3 shadow-sm">
            <div className="min-w-0">
              <div className="truncate text-xs font-extrabold text-slate-900">{selectedItem.movieName}</div>
              <div className="mt-0.5 text-[10.5px] font-semibold text-slate-500">
                {selectedItem.cinemaRoomName} · kết thúc {selectedItem.endTime.slice(0, 5)} · {selectedItem.locked
                  ? "đang khóa, hãy mở khóa trước khi di chuyển"
                  : "bấm vào lịch để đặt vị trí mới"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-[10.5px] font-bold text-slate-500">
                Phòng
                <select
                  disabled={selectedItem.locked}
                  value={selectedItem.cinemaRoomId}
                  onChange={(event) => {
                    const room = selectedCompatibleRooms.find((candidate) => candidate.cinemaRoomId === Number(event.target.value));
                    if (room) placeItem(selectedItem, room, offsetOf(selectedItem));
                  }}
                  className="min-w-40 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-black text-blue-900 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {selectedCompatibleRooms.map((room) => <option key={room.cinemaRoomId} value={room.cinemaRoomId}>{room.cinemaRoomName}</option>)}
                </select>
              </label>
              <button type="button" disabled={selectedItem.locked} onClick={() => nudgeItem(selectedItem, -5)} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-black text-slate-700 hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40" title="Sớm hơn 5 phút">
                −5 phút
              </button>
              <label className="flex items-center gap-2 text-[10.5px] font-bold text-slate-500">
                Bắt đầu
                <TimeRulerPicker
                  disabled={selectedItem.locked}
                  value={selectedItem.startTime.slice(0, 5)}
                  onChange={(val) => changeStartTime(selectedItem, val)}
                />
              </label>
              <button type="button" disabled={selectedItem.locked} onClick={() => nudgeItem(selectedItem, 5)} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-black text-slate-700 hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40" title="Muộn hơn 5 phút">
                +5 phút
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div style={{ minWidth: `${TIME_COLUMN_WIDTH + rooms.length * ROOM_COLUMN_WIDTH}px` }}>
          <div
            className="sticky top-0 z-30 grid border-b border-slate-200 bg-white shadow-sm"
            style={{ gridTemplateColumns: `${TIME_COLUMN_WIDTH}px repeat(${rooms.length}, minmax(${ROOM_COLUMN_WIDTH}px, 1fr))` }}
          >
            <div className="flex items-center justify-center border-r border-slate-200 px-2 py-3 text-[10px] font-black uppercase tracking-wide text-slate-400">
              Giờ
            </div>
            {rooms.map((room) => (
              <div key={room.cinemaRoomId} className="border-r border-slate-200 px-3 py-3 last:border-r-0">
                <div className="truncate text-xs font-extrabold text-slate-900">{room.cinemaRoomName}</div>
                <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] font-semibold text-slate-500">
                  <span>{room.type}</span>
                  <span className={(positionedByRoom.get(room.cinemaRoomId)?.length ?? 0) === 0 ? "text-emerald-600" : "text-slate-400"}>
                    {(positionedByRoom.get(room.cinemaRoomId)?.length ?? 0) === 0
                      ? "Trống cả ngày"
                      : `${positionedByRoom.get(room.cinemaRoomId)?.length ?? 0} suất`}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div
            className="grid"
            style={{ gridTemplateColumns: `${TIME_COLUMN_WIDTH}px repeat(${rooms.length}, minmax(${ROOM_COLUMN_WIDTH}px, 1fr))` }}
          >
            <div className="relative border-r border-slate-200 bg-slate-50" style={{ height: timelineHeight }}>
              {ticks.map((offset) => {
                const absoluteMinutes = openingMinutes + offset;
                const isNextDay = absoluteMinutes >= 1440;
                const major = offset % 60 === 0;
                return (
                  <div
                    key={offset}
                    className="absolute left-0 right-0 -translate-y-1/2 pr-2 text-right"
                    style={{ top: offset * PIXELS_PER_MINUTE }}
                  >
                    {major && (
                      <span className="text-[10px] font-bold text-slate-500">
                        {formatMinutes(absoluteMinutes)}{isNextDay ? " +1" : ""}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {rooms.map((room) => {
              const roomItems = positionedByRoom.get(room.cinemaRoomId) ?? [];
              return (
                <div
                  key={room.cinemaRoomId}
                  className={`relative border-r border-slate-200 bg-white last:border-r-0 ${dragState ? "bg-blue-50/20" : ""} ${selectedItem ? "cursor-crosshair" : ""}`}
                  style={{ height: timelineHeight }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(event) => moveItem(event, room)}
                  onClick={(event) => moveSelectedToPoint(event, room)}
                >
                  {ticks.map((offset) => (
                    <div
                      key={offset}
                      className={`pointer-events-none absolute left-0 right-0 border-t ${offset % 60 === 0 ? "border-slate-200" : "border-slate-100 border-dashed"}`}
                      style={{ top: offset * PIXELS_PER_MINUTE }}
                    />
                  ))}

                  {roomItems.map((positioned, index) => {
                    const next = roomItems[index + 1];
                    const gap = next
                      ? next.offsetMinutes - (positioned.offsetMinutes + positioned.durationMinutes)
                      : null;
                    const gapKey = `gap-${positioned.item.clientKey}`;
                    const gapTop = (positioned.offsetMinutes + positioned.durationMinutes) * PIXELS_PER_MINUTE;
                    const gapHeight = gap === null ? 0 : Math.max(30, Math.abs(gap) * PIXELS_PER_MINUTE);
                    if (gap === null) return null;
                    const validGap = gap >= turnaroundMinutes;
                    const draggingThisGap = gapDragState?.gapKey === gapKey;
                    const suffixContainsLockedItem = roomItems.slice(index + 1).some(({ item }) => item.locked);
                    return (
                      <div
                        key={gapKey}
                        className={`absolute left-1.5 right-1.5 z-[5] flex touch-none select-none items-center justify-center gap-2 rounded-lg border border-dashed px-1 text-[10px] font-black shadow-sm ${gap >= 0 ? "cursor-ns-resize" : ""} ${draggingThisGap ? "ring-2 ring-emerald-400 ring-offset-1" : ""} ${validGap
                          ? "border-emerald-300 bg-emerald-50/80 text-emerald-700"
                          : "border-red-300 bg-red-50/90 text-red-700"}`}
                        style={{ top: gap >= 0 ? gapTop : next.offsetMinutes * PIXELS_PER_MINUTE, height: gapHeight }}
                        onClick={(event) => event.stopPropagation()}
                        onPointerDown={(event) => startGapDrag(event, roomItems, index + 1, gapKey)}
                        onPointerMove={(event) => dragGap(event, gapKey)}
                        onPointerUp={(event) => finishGapDrag(event, gapKey)}
                        onPointerCancel={(event) => finishGapDrag(event, gapKey)}
                        title={gap >= 0 ? "Kéo lên hoặc xuống để đổi thời gian nghỉ; thời gian được bù trừ từ khoảng trống trước giờ đóng cửa" : undefined}
                      >
                        {gap >= 0 ? (
                          <>
                            <button
                              type="button"
                              disabled={gap <= turnaroundMinutes || suffixContainsLockedItem}
                              onClick={() => adjustGap(roomItems, index + 1, -1)}
                              className="rounded bg-white px-1.5 py-0.5 text-[10px] shadow-sm disabled:opacity-30"
                              title={suffixContainsLockedItem ? "Hãy mở khóa các suất phía sau trước khi chỉnh khoảng nghỉ" : "Giảm 5 phút và kéo các suất phía sau lên sớm hơn"}
                            >−5</button>
                            <span>{draggingThisGap ? "Đang chỉnh" : "Nghỉ"} {gap} phút</span>
                            <button
                              type="button"
                              disabled={suffixContainsLockedItem || (roomItems[roomItems.length - 1]?.offsetMinutes ?? 0) + (roomItems[roomItems.length - 1]?.durationMinutes ?? 0) >= operationalMinutes}
                              onClick={() => adjustGap(roomItems, index + 1, 1)}
                              className="rounded bg-white px-1.5 py-0.5 text-[10px] shadow-sm disabled:opacity-30"
                              title={suffixContainsLockedItem ? "Hãy mở khóa các suất phía sau trước khi chỉnh khoảng nghỉ" : `Tăng 5 phút bằng khoảng trống từ suất cuối đến ${latestFinishTime}`}
                            >+5</button>
                          </>
                        ) : `Trùng ${Math.abs(gap)} phút`}
                      </div>
                    );
                  })}

                  {roomItems.length > 0 && (() => {
                    const last = roomItems[roomItems.length - 1];
                    const freeMinutes = Math.max(
                      0,
                      operationalMinutes - (last.offsetMinutes + last.durationMinutes),
                    );
                    if (freeMinutes < SNAP_MINUTES) return null;
                    return (
                      <div
                        className="pointer-events-none absolute left-1.5 right-1.5 z-[1] flex items-start justify-center rounded-lg border border-dashed border-sky-200 bg-sky-50/50 pt-2 text-[10px] font-black text-sky-700"
                        style={{
                          top: (last.offsetMinutes + last.durationMinutes) * PIXELS_PER_MINUTE,
                          height: Math.max(28, freeMinutes * PIXELS_PER_MINUTE),
                        }}
                      >
                        Còn {freeMinutes} phút trước {latestFinishTime}
                      </div>
                    );
                  })()}

                  {roomItems.map(({ item, offsetMinutes, durationMinutes }) => {
                    const dirty = dirtyKeys.has(item.clientKey);
                    const locked = Boolean(item.locked);
                    const height = Math.max(MIN_CARD_HEIGHT, durationMinutes * PIXELS_PER_MINUTE - 3);
                    return (
                      <article
                        key={item.clientKey}
                        draggable={!locked}
                        onDragStart={(event) => {
                          if (locked) {
                            event.preventDefault();
                            onLockedMove(item);
                            return;
                          }
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", item.clientKey);
                          const bounds = event.currentTarget.getBoundingClientRect();
                          setDragState({
                            clientKey: item.clientKey,
                            grabOffsetMinutes: (event.clientY - bounds.top) / PIXELS_PER_MINUTE,
                          });
                          setSelectedKey(item.clientKey);
                        }}
                        onDragEnter={(event) => {
                          if (!dragState || dragState.clientKey === item.clientKey) return;
                          event.preventDefault();
                          event.stopPropagation();
                          const source = items.find((candidate) => candidate.clientKey === dragState.clientKey);
                          if (source) swapItems(source, item);
                        }}
                        onDragOver={(event) => {
                          if (!dragState) return;
                          event.preventDefault();
                          event.stopPropagation();
                          event.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setDragState(null);
                        }}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedKey(item.clientKey);
                        }}
                        onDragEnd={() => setDragState(null)}
                        className={`absolute left-1.5 right-1.5 z-10 overflow-hidden rounded-xl border px-3 py-2.5 shadow-sm transition hover:z-20 hover:shadow-lg ${locked ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"} ${selectedKey === item.clientKey ? "ring-2 ring-red-500 ring-offset-2" : ""} ${locked
                          ? "border-blue-500 bg-blue-100 text-blue-950 ring-1 ring-inset ring-blue-200"
                          : dirty
                            ? "border-amber-500 bg-amber-100 text-amber-950 ring-1 ring-inset ring-amber-200"
                            : "border-slate-300 bg-white text-slate-900"}`}
                        style={{ top: offsetMinutes * PIXELS_PER_MINUTE + 1, height }}
                        title={`${item.movieName}\n${item.presentationName}\n${item.startTime.slice(0, 5)}–${item.endTime.slice(0, 5)}\n${locked ? "Suất đang khóa; hãy mở khóa trước khi di chuyển" : "Kéo vào suất khác để đổi chỗ ngay; kéo vào vùng trống để đổi phòng hoặc giờ"}`}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical size={16} className="mt-0.5 shrink-0 opacity-50" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-black">{item.movieName}</div>
                            <div className="mt-1 truncate text-[11px] font-semibold opacity-70">{item.presentationName}</div>
                            <div className="mt-1.5 flex items-center gap-1 text-[12px] font-extrabold">
                              <Clock3 size={12} /> {item.startTime.slice(0, 5)}–{item.endTime.slice(0, 5)}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <span className={`rounded-full border px-1.5 py-0.5 text-[8.5px] font-black ${locked
                              ? "border-blue-300 bg-blue-50 text-blue-700"
                              : dirty
                                ? "border-amber-300 bg-amber-50 text-amber-700"
                                : "border-slate-200 bg-slate-50 text-slate-500"}`}
                            >
                              {locked ? "Đã khóa" : dirty ? "Vừa chỉnh" : "Đề xuất"}
                            </span>
                            <button
                              type="button"
                              draggable={false}
                              onClick={(event) => {
                                event.stopPropagation();
                                onToggleLock(item.clientKey);
                              }}
                              className={`rounded-md border p-1 ${locked
                                ? "border-blue-400 bg-blue-600 text-white"
                                : "border-slate-200 bg-white text-slate-500"}`}
                              title={locked ? "Mở khóa để chỉnh suất này" : "Khóa phòng và giờ của suất này"}
                            >
                              {locked ? <Lock size={11} /> : <Unlock size={11} />}
                            </button>
                          </div>
                        </div>
                        {height >= 76 && (
                          <div className="mt-1.5 flex justify-end gap-1 border-t border-black/5 pt-1">
                            <button
                              type="button"
                              draggable={false}
                              disabled={locked}
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={(event) => { event.stopPropagation(); nudgeItem(item, -5); }}
                              className="flex items-center gap-0.5 rounded bg-white/70 px-1.5 py-0.5 text-[9px] font-black hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                              title="Dời sớm 5 phút"
                            >
                              <Minus size={8} />5'
                            </button>
                            <button
                              type="button"
                              draggable={false}
                              disabled={locked}
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={(event) => { event.stopPropagation(); nudgeItem(item, 5); }}
                              className="flex items-center gap-0.5 rounded bg-white/70 px-1.5 py-0.5 text-[9px] font-black hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                              title="Dời muộn 5 phút"
                            >
                              <Plus size={8} />5'
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}

                  {roomItems.length === 0 && (
                    <div className="absolute left-1/2 top-16 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-slate-300">
                      Chưa có suất
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
