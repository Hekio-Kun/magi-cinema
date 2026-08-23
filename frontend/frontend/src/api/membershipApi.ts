import apiClient from "@/api/api";

export type MembershipStatus = "ACTIVE" | "EXPIRED" | "CANCELLED" | "LOCKED";
export type MembershipFreeTicketType = "STANDARD_2D" | "STANDARD_3D" | "IMAX" | "FOUR_DX" | "DOLBY" | "ANY";

export const membershipFreeTicketOptions: Array<{ value: MembershipFreeTicketType; label: string }> = [
  { value: "STANDARD_2D", label: "Standard 2D" },
  { value: "STANDARD_3D", label: "Standard 3D" },
  { value: "IMAX", label: "IMAX" },
  { value: "FOUR_DX", label: "4DX" },
  { value: "DOLBY", label: "Dolby" },
  { value: "ANY", label: "Tất cả định dạng" },
];

export const membershipFreeTicketLabel = (type?: MembershipFreeTicketType | null) =>
  membershipFreeTicketOptions.find(option => option.value === (type || "STANDARD_2D"))?.label || "Standard 2D";

export function isMembershipFreeTicketApplicable(
  type: MembershipFreeTicketType | undefined,
  presentationFormat?: string | null,
  projectionType?: string | null,
) {
  const resolved = type || "STANDARD_2D";
  const format = String(presentationFormat || "STANDARD").toUpperCase().replace(/^_/, "");
  const projection = String(projectionType || "").toUpperCase();
  if (resolved === "ANY") return true;
  if (resolved === "IMAX") return format === "IMAX";
  if (resolved === "FOUR_DX") return format === "4DX";
  if (resolved === "DOLBY") return format === "DOLBY";
  const isStandard = format === "STANDARD" || format === "2D" || format === "3D";
  return isStandard && (resolved === "STANDARD_2D"
    ? projection === "2D" || projection === "TWO_D"
    : projection === "3D" || projection === "THREE_D");
}

export interface MembershipPlan {
  planId: number;
  code: string;
  name: string;
  description?: string;
  annualSpendMin: number;
  annualSpendMax?: number | null;
  ticketEarnPercent: number;
  concessionEarnPercent: number;
  annualFreeTickets: number;
  freeTicketType: MembershipFreeTicketType;
  status: "ACTIVE" | "INACTIVE";
  // Tạm giữ để các màn booking cũ không lỗi trong lúc chuyển đổi.
  price: number;
  durationDays: number;
  ticketDiscountPercent: number;
  comboDiscountPercent: number;
  pointMultiplier: number;
  maxTicketDiscount?: number;
  maxComboDiscount?: number;
}

export interface Membership {
  membershipId: number;
  memberCode: string;
  planCode: MembershipPlan["code"];
  planName: string;
  status: MembershipStatus;
  annualSpend: number;
  spendYear: number;
  loyaltyPoints: number;
  pointsExpireAt?: string;
  nextTierSpend?: number | null;
  spendToNextTier: number;
  ticketEarnPercent: number;
  concessionEarnPercent: number;
  availableFreeTickets: number;
  joinedAt?: string;
  tierSince?: string;
  startAt?: string;
  endAt?: string;
  pointMultiplier: number;
  ticketDiscountPercent: number;
  comboDiscountPercent: number;
}

export interface AdminMembership extends Membership {
  userId: string;
  username: string;
  email: string;
  fullName?: string;
  phoneNumber?: string;
  createdAt: string;
}

export interface MembershipPoint {
  transactionId: number;
  bookingId?: number;
  type: "EARN" | "HOLD" | "REDEEM" | "RELEASE" | "REVERSE" | "ADJUST" | "EXPIRE";
  points: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface MembershipBenefit {
  benefitId: number;
  type: "FREE_2D_TICKET";
  status: "AVAILABLE" | "HELD" | "USED" | "EXPIRED" | "REVOKED";
  benefitYear: number;
  freeTicketType: MembershipFreeTicketType;
  expiresAt: string;
  usedAt?: string;
  bookingId?: number;
  createdAt?: string;
}

export interface MembershipTierHistory {
  historyId: number;
  fromTier?: string;
  toTier: string;
  annualSpend: number;
  spendYear: number;
  reason: string;
  createdAt: string;
}

export interface MembershipReward {
  rewardId: number;
  code: string;
  name: string;
  description?: string;
  terms?: string;
  type: "GIFT";
  target: "COUNTER_GIFT";
  pointCost: number;
  stockQuantity: number;
  validityDays: number;
  maxRedemptionsPerCycle: number;
  redeemedThisCycle: number;
  redeemable: boolean;
  unavailableReason?: string;
  status: "ACTIVE" | "INACTIVE";
  displayOrder: number;
}

export interface MembershipRewardRedemption {
  redemptionId: number;
  redemptionCode: string;
  rewardName: string;
  rewardType: "GIFT";
  rewardTarget: "COUNTER_GIFT";
  pointsSpent: number;
  terms?: string;
  status: "AVAILABLE" | "USED" | "EXPIRED";
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
  pointsBalance?: number;
}

export type MembershipRewardUpsert = Pick<MembershipReward,
  "code" | "name" | "description" | "terms" |
  "pointCost" | "stockQuantity" | "validityDays" |
  "maxRedemptionsPerCycle" | "displayOrder" | "status">;

export interface MembershipAdminSummary {
  activeMembers: number;
  totalPointsBalance: number;
  totalAnnualSpend: number;
  joinedThisMonth: number;
  activeByPlan: Record<string, number>;
  pendingPayments: number;
  scheduledMemberships: number;
  expiringWithinSevenDays: number;
  newRegistrationsThisMonth: number;
  revenueThisMonth: number;
}

export type MembershipPlanUpdate = Pick<MembershipPlan,
  "annualSpendMin" | "annualSpendMax" | "ticketEarnPercent" |
  "concessionEarnPercent" | "annualFreeTickets" | "freeTicketType" | "status">;

export interface MembershipPlanCreate {
  code: string;
  name: string;
  description?: string;
  annualSpendMin: number;
  ticketEarnPercent: number;
  concessionEarnPercent: number;
  annualFreeTickets: number;
  freeTicketType: MembershipFreeTicketType;
  status: MembershipPlan["status"];
}

const result = <T,>(response: { data: { result: T } }) => response.data.result;

export const membershipApi = {
  getPlans: async () => result<MembershipPlan[]>(await apiClient.get("/memberships/tiers")),
  getMine: async () => result<Membership | null>(await apiClient.get("/memberships/me")),
  enroll: async () => result<Membership>(await apiClient.post("/memberships/enroll", { termsAccepted: true })),
  getActiveForUser: async (userId: string) =>
    result<Membership | null>(await apiClient.get(`/memberships/users/${userId}/active`)),
  getBenefitsForUser: async (userId: string) =>
    result<MembershipBenefit[]>(await apiClient.get(`/memberships/users/${userId}/benefits`)),
  getPoints: async () => result<MembershipPoint[]>(await apiClient.get("/memberships/me/points")),
  getRewards: async () => result<MembershipReward[]>(await apiClient.get("/memberships/rewards")),
  getMyRewards: async () => result<MembershipRewardRedemption[]>(await apiClient.get("/memberships/me/rewards")),
  redeemReward: async (rewardId: number) =>
    result<MembershipRewardRedemption>(await apiClient.post(`/memberships/rewards/${rewardId}/redeem`)),
  claimGiftAtCounter: async (code: string) =>
    result<MembershipRewardRedemption>(await apiClient.post(`/memberships/rewards/redemptions/${encodeURIComponent(code)}/claim`)),
  getBenefits: async () => result<MembershipBenefit[]>(await apiClient.get("/memberships/me/benefits")),
  getTierHistory: async () => result<MembershipTierHistory[]>(await apiClient.get("/memberships/me/tier-history")),
  getAdminSummary: async () => result<MembershipAdminSummary>(await apiClient.get("/memberships/admin/summary")),
  getAdminMemberships: async () => result<AdminMembership[]>(await apiClient.get("/memberships/admin/members")),
  updateAdminMembershipStatus: async (membershipId: number, status: Extract<MembershipStatus, "ACTIVE" | "LOCKED">) =>
    result<AdminMembership>(await apiClient.patch(`/memberships/admin/members/${membershipId}/status`, { status })),
  getAdminPlans: async () => result<MembershipPlan[]>(await apiClient.get("/memberships/admin/tiers")),
  createAdminPlan: async (data: MembershipPlanCreate) =>
    result<MembershipPlan>(await apiClient.post("/memberships/admin/tiers", data)),
  updateAdminPlan: async (planId: number, data: MembershipPlanUpdate) =>
    result<MembershipPlan>(await apiClient.put(`/memberships/admin/tiers/${planId}`, data)),
  getAdminRewards: async () => result<MembershipReward[]>(await apiClient.get("/memberships/admin/rewards")),
  createAdminReward: async (data: MembershipRewardUpsert) =>
    result<MembershipReward>(await apiClient.post("/memberships/admin/rewards", data)),
  updateAdminReward: async (rewardId: number, data: MembershipRewardUpsert) =>
    result<MembershipReward>(await apiClient.put(`/memberships/admin/rewards/${rewardId}`, data)),
};
