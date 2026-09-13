export type RoomStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
export type RoomType = 'STANDARD' | 'IMAX' | '4DX' | 'BED' | 'VIP';

export interface CinemaRoom {
    cinemaRoomId: number;
    cinemaRoomName: string;
    seatQuantity: number;
    seatsPerRow?: number;
    type: RoomType;
    status: RoomStatus;
    createdAt: string;
    updatedAt: string;
}

export interface CinemaRoomCreationRequest {
    cinemaRoomName: string;
    seatQuantity: number;
    seatsPerRow?: number;
    type: RoomType;
}

export interface CinemaRoomUpdateRequest {
    cinemaRoomName: string;
    seatQuantity: number;
    seatsPerRow?: number;
    type: RoomType;
    status: RoomStatus;
}

export interface CinemaRoomSeatSummary {
    cinemaRoomId: number;
    totalSeats: number;
    activeSeats: number;
    inactiveSeats: number;
    maintenanceSeats: number;
    normalSeats: number;
    vipSeats: number;
    coupleSeats: number;
    accessibleSeats: number;
    rowCount: number;
    seatsPerRow?: number;
    generatedAt?: string;
}

export interface CinemaRoomOperationalSummary {
    totalRooms: number;
    activeRooms: number;
    inactiveRooms: number;
    maintenanceRooms: number;
    totalSeats: number;
    activeSeats: number;
    maintenanceSeats: number;
    generatedAt?: string;
}

export interface SeatLayoutRequest {
    seatQuantity: number;
    seatsPerRow: number;
    vipRowsFromBack?: number;
    coupleSeatsOnLastRow?: number;
    accessibleSeatsOnFirstRow?: number;
}
