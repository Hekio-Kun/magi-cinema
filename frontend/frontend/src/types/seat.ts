export type SeatType = 'NORMAL' | 'VIP' | 'COUPLE' | 'DISABLED';
export type SeatStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
export type ShowtimeSeatStatus = 'AVAILABLE' | 'HOLDING' | 'BOOKED';

export interface Seat {
  seatId: number;
  cinemaRoomId: number;
  cinemaRoomName?: string | null;
  seatRow: string;
  seatNumber: number;
  seatCode: string;
  type: SeatType;
  status: SeatStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface SeatCreationRequest {
  cinemaRoomId: number;
  seatRow: string;
  seatNumber: number;
  seatCode: string;
  type?: SeatType;
  status?: SeatStatus;
}

export interface SeatUpdateRequest {
  cinemaRoomId: number;
  seatRow: string;
  seatNumber: number;
  seatCode: string;
  type?: SeatType;
  status?: SeatStatus;
}

export interface ShowtimeSeat {
  showtimeSeatId: number;
  showtimeId: number;
  seatId: number;
  cinemaRoomId?: number | null;
  cinemaRoomName?: string | null;
  seatRow?: string | null;
  seatNumber?: number | null;
  seatCode?: string | null;
  seatType?: SeatType | null;
  basePrice?: number | null;
  seatSurcharge?: number | null;
  finalPrice?: number | null;
  showDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  status: ShowtimeSeatStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShowtimeSeatCreationRequest {
  showtimeId: number;
  seatId: number;
  status?: ShowtimeSeatStatus;
}

export interface ShowtimeSeatUpdateRequest {
  showtimeId: number;
  seatId: number;
  status: ShowtimeSeatStatus;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
