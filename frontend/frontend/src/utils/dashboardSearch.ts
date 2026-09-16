export type DashboardSearchResultType = "page" | "action";

export interface DashboardSearchResult {
  id: string;
  title: string;
  description: string;
  page: string;
  type: DashboardSearchResultType;
  keywords: string[];
}

const PAGE_DESCRIPTIONS: Record<string, string> = {
  "Tổng quan": "Doanh thu, vé bán, tỷ lệ lấp đầy và tình hình vận hành",
  "Báo cáo & thống kê": "Phân tích doanh thu, dòng tiền và hiệu suất rạp",
  "Quản lý phim": "Tìm, tạo và cập nhật phim đang hoặc sắp chiếu",
  "Cloudinary Audio Lab": "Quản lý kho nhạc thử nghiệm trên Cloudinary",
  "Thể loại": "Quản lý danh mục thể loại phim",
  "Phòng chiếu": "Cấu hình phòng, sơ đồ và trạng thái ghế",
  "Lịch chiếu & ghế": "Lập lịch chiếu và theo dõi ghế theo suất",
  "Cấu hình giá vé": "Thiết lập giá theo ghế, khung giờ và ngày chiếu",
  "Bán vé tại quầy": "Tạo đơn và bán vé trực tiếp tại quầy",
  "Bán bắp nước tại quầy": "Bán combo và sản phẩm trong ca thu ngân",
  "Ca thu ngân & đối soát": "Mở ca, kết ca và kiểm soát chênh lệch tiền",
  "Đặt vé online": "Tra cứu các đơn đặt vé trực tuyến",
  "Đặt vé tại quầy": "Tra cứu các đơn được tạo tại quầy",
  "Combo & bắp nước": "Quản lý sản phẩm, tồn kho và combo",
  "Khách hàng & thành viên": "Tra cứu và quản lý hồ sơ khách hàng",
  "Hội viên": "Quản lý hạng, điểm và quyền lợi hội viên",
  "Khuyến mãi": "Tạo và theo dõi chương trình ưu đãi",
  "Góp ý & phản hồi": "Tiếp nhận và xử lý phản hồi khách hàng",
  "Nhân viên": "Quản lý hồ sơ và trạng thái nhân viên",
  "Lịch ca & chấm công": "Phân ca, chấm công và theo dõi đi muộn",
  "Nhật ký nhân viên": "Kiểm tra hoạt động nghiệp vụ của nhân viên",
  "Vai trò & quyền hạn": "Phân quyền theo vai trò và phạm vi công việc",
  "Cài đặt": "Tùy chỉnh trải nghiệm dashboard và thông báo",
};

const PAGE_KEYWORDS: Record<string, string[]> = {
  "Tổng quan": ["dashboard", "kpi", "hôm nay", "vé bán"],
  "Báo cáo & thống kê": ["report", "doanh thu", "dòng tiền", "chi phí", "lợi nhuận"],
  "Quản lý phim": ["movie", "film", "phim mới", "poster"],
  "Phòng chiếu": ["cinema", "room", "ghế", "sơ đồ"],
  "Lịch chiếu & ghế": ["showtime", "suất chiếu", "xếp lịch", "tranh chấp ghế"],
  "Bán vé tại quầy": ["pos", "thu ngân", "bán vé", "in vé"],
  "Bán bắp nước tại quầy": ["pos", "popcorn", "combo", "đồ ăn"],
  "Ca thu ngân & đối soát": ["cashier", "tiền mặt", "kết ca", "đối soát"],
  "Đặt vé online": ["booking", "đơn hàng", "thanh toán online"],
  "Đặt vé tại quầy": ["booking", "đơn quầy", "vé quầy"],
  "Khách hàng & thành viên": ["customer", "email", "số điện thoại", "tài khoản"],
  "Nhân viên": ["staff", "employee", "tài khoản", "khóa"],
  "Vai trò & quyền hạn": ["role", "permission", "scope", "phân quyền"],
  "Cài đặt": ["settings", "tùy chỉnh", "giao diện", "thông báo"],
};

const QUICK_ACTIONS: DashboardSearchResult[] = [
  { id: "action-create-showtime", title: "Tạo lịch chiếu mới", description: "Mở công cụ lập và kiểm tra lịch chiếu", page: "Lịch chiếu & ghế", type: "action", keywords: ["tạo suất", "xếp lịch", "auto schedule"] },
  { id: "action-counter-ticket", title: "Bán vé tại quầy", description: "Bắt đầu một giao dịch vé mới", page: "Bán vé tại quầy", type: "action", keywords: ["pos", "thu ngân", "in vé"] },
  { id: "action-counter-food", title: "Bán bắp nước", description: "Tạo đơn combo và đồ ăn tại quầy", page: "Bán bắp nước tại quầy", type: "action", keywords: ["combo", "popcorn", "đồ uống"] },
  { id: "action-cashier-shift", title: "Mở hoặc kết ca thu ngân", description: "Kiểm đếm và đối soát dòng tiền theo ca", page: "Ca thu ngân & đối soát", type: "action", keywords: ["mở ca", "kết ca", "cash"] },
  { id: "action-new-movie", title: "Thêm phim mới", description: "Mở danh sách phim để tạo bản ghi", page: "Quản lý phim", type: "action", keywords: ["movie", "poster", "tmdb"] },
  { id: "action-room-layout", title: "Chỉnh sơ đồ ghế", description: "Mở quản lý phòng và bố trí ghế", page: "Phòng chiếu", type: "action", keywords: ["seat", "layout", "ghế đôi", "vip"] },
  { id: "action-customer", title: "Tra cứu khách hàng", description: "Tìm hồ sơ, tài khoản và lịch sử thành viên", page: "Khách hàng & thành viên", type: "action", keywords: ["phone", "email", "customer"] },
  { id: "action-revenue", title: "Kiểm tra dòng tiền", description: "Mở báo cáo doanh thu và đối soát", page: "Báo cáo & thống kê", type: "action", keywords: ["revenue", "doanh thu", "lợi nhuận"] },
  { id: "action-permission", title: "Cấp quyền nhân viên", description: "Mở ma trận vai trò và quyền hạn", page: "Vai trò & quyền hạn", type: "action", keywords: ["role", "permission", "scope"] },
  { id: "action-promotion", title: "Tạo chương trình khuyến mãi", description: "Mở quản lý ưu đãi và mã giảm giá", page: "Khuyến mãi", type: "action", keywords: ["voucher", "discount", "coupon"] },
];

export function normalizeDashboardSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function buildDashboardSearchIndex(accessiblePages: string[]): DashboardSearchResult[] {
  const pageSet = new Set(accessiblePages);
  const pages = accessiblePages.map((page) => ({
    id: `page-${page}`,
    title: page,
    description: PAGE_DESCRIPTIONS[page] || `Mở trang ${page}`,
    page,
    type: "page" as const,
    keywords: PAGE_KEYWORDS[page] || [],
  }));
  return [...pages, ...QUICK_ACTIONS.filter((item) => pageSet.has(item.page))];
}

export function searchDashboard(index: DashboardSearchResult[], query: string, limit: number) {
  const normalizedQuery = normalizeDashboardSearch(query);
  if (!normalizedQuery) return [];
  return index
    .map((item) => {
      const title = normalizeDashboardSearch(item.title);
      const page = normalizeDashboardSearch(item.page);
      const haystack = normalizeDashboardSearch([item.title, item.description, item.page, ...item.keywords].join(" "));
      const score = title === normalizedQuery ? 100 : title.startsWith(normalizedQuery) ? 70 : page.startsWith(normalizedQuery) ? 55 : haystack.includes(normalizedQuery) ? 30 : 0;
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, "vi"))
    .slice(0, Math.max(3, limit))
    .map(({ item }) => item);
}
