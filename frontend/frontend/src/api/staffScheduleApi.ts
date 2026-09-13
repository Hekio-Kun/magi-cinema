import apiClient from "./api";

export type StaffShiftType = "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT";
export type StaffScheduleStatus = "SCHEDULED" | "CANCELLED";
export type AttendanceStatus = "PRESENT" | "LATE" | "IN_PROGRESS" | "ABSENT" | "LEAVE";

export interface StaffScheduleResponse {
  assignmentId: number;
  staffUserId: string;
  staffUsername: string;
  staffFullName: string;
  workDate: string;
  shiftType: StaffShiftType;
  plannedStart: string;
  plannedEnd: string;
  status: StaffScheduleStatus;
  note?: string | null;
  attendanceId?: number | null;
  checkIn?: string | null;
  checkOut?: string | null;
  attendanceStatus?: AttendanceStatus | null;
  workedMinutes?: number | null;
}

export interface CreateStaffSchedulePayload {
  staffUserId: string;
  workDate: string;
  shiftType: StaffShiftType;
  plannedStart: string;
  plannedEnd: string;
  note?: string;
}

const unwrap = <T>(response: { data?: unknown }): T => {
  const data = response.data;
  if (typeof data === "object" && data !== null && "result" in data) {
    return (data as { result?: unknown }).result as T;
  }
  return data as T;
};

export const staffScheduleApi = {
  list: async (from: string, to: string, staffUserId?: string) => {
    const response = await apiClient.get("/staff-schedules", { params: { from, to, staffUserId } });
    return unwrap<StaffScheduleResponse[]>(response) || [];
  },
  create: async (payload: CreateStaffSchedulePayload) => {
    const response = await apiClient.post("/staff-schedules", payload);
    return unwrap<StaffScheduleResponse>(response);
  },
  update: async (assignmentId: number, payload: Omit<CreateStaffSchedulePayload, "staffUserId" | "workDate">) => {
    const response = await apiClient.put(`/staff-schedules/${assignmentId}`, payload);
    return unwrap<StaffScheduleResponse>(response);
  },
  cancel: async (assignmentId: number, reason?: string) => {
    const response = await apiClient.delete(`/staff-schedules/${assignmentId}`, { params: { reason } });
    return unwrap<StaffScheduleResponse>(response);
  },
  checkIn: async (assignmentId: number) => {
    const response = await apiClient.post(`/staff-schedules/${assignmentId}/check-in`);
    return unwrap<StaffScheduleResponse>(response);
  },
  checkOut: async (assignmentId: number) => {
    const response = await apiClient.post(`/staff-schedules/${assignmentId}/check-out`);
    return unwrap<StaffScheduleResponse>(response);
  },
  updateAttendance: async (assignmentId: number, status: AttendanceStatus, note?: string) => {
    const response = await apiClient.post(`/staff-schedules/${assignmentId}/attendance`, { status, note });
    return unwrap<StaffScheduleResponse>(response);
  },
};
