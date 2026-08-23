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
