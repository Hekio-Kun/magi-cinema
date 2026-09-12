import { useState } from "react";
import { Film, Send, MapPin, Phone, Mail, X, Award, HeartHandshake, Shield, FileText } from "lucide-react";
import { FaInstagram, FaXTwitter, FaYoutube, FaFacebookF } from "react-icons/fa6";
import { Link } from "react-router-dom";
import { CustomerContactModal } from "@/components/common/CustomerContactModal";

interface InfoModalData {
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

const INFO_MODALS: Record<string, InfoModalData> = {
  "about": {
    title: "Về MagiCinema",
    icon: <Film className="text-gray-800" size={24} />,
    content: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p className="font-semibold text-gray-900 text-base">
          MagiCinema — Nơi hội tụ tinh hoa điện ảnh và công nghệ trình chiếu hiện đại hàng đầu Việt Nam.
        </p>
        <p>
          Được thành lập từ niềm đam mê bất tận với bộ môn nghệ thuật thứ bảy, MagiCinema cam kết mang đến không gian nghe nhìn đạt chuẩn quốc tế với phòng chiếu IMAX Laser, công nghệ âm thanh Dolby Atmos 360°, và hệ thống ghế ngả sang trọng hạng VIP/Couple.
        </p>
        <p>
          Với tầm nhìn trở thành biểu tượng mới cho lối sống giải trí thời thượng, chúng tôi không chỉ là nơi chiếu phim mà còn là không gian giao lưu văn hóa, tổ chức các buổi sự kiện ra mắt bom tấn thế giới.
        </p>
        <div className="pt-3 border-t border-gray-100 flex gap-6 text-xs text-gray-500 font-medium">
          <div>🎬 Hơn 50 phòng chiếu cao cấp</div>
          <div>🍿 Đội ngũ CSKH chuyên nghiệp 24/7</div>
          <div>💎 Hệ sinh thái hội viên ưu việt</div>
        </div>
      </div>
    ),
  },
  "careers": {
    title: "Tuyển dụng & Sự nghiệp",
    icon: <HeartHandshake className="text-gray-800" size={24} />,
    content: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p className="font-semibold text-gray-900 text-base">
          Gia nhập đại gia đình MagiCinema — Phát triển đam mê điện ảnh trong môi trường trẻ trung và năng động!
        </p>
        <p>
          Chúng tôi liên tục tìm kiếm những tài năng kiều diễm ở các vị trí: <span className="font-semibold text-gray-800">Nhân viên dịch vụ quầy rạp (Part-time/Full-time), Kỹ thuật viên vận hành máy chiếu IMAX, Chuyên viên phát triển phần mềm</span> và <span className="font-semibold text-gray-800">Quản lý rạp chiếu.</span>
        </p>
        <p>
          Hãy gửi hồ sơ trực tiếp qua hòm thư điện tử <span className="font-mono text-gray-900 font-semibold">careers@magicinema.vn</span> với tiêu đề <span className="italic">[Vị trí ứng tuyển] - Họ và Tên</span>. Bộ phận nhân sự sẽ liên hệ lịch phỏng vấn sớm nhất với bạn!
        </p>
      </div>
    ),
  },
  "press": {
    title: "Tin tức & Báo chí",
    icon: <Award className="text-gray-800" size={24} />,
    content: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p className="font-semibold text-gray-900 text-base">
          Trung tâm thông tin truyền thông & Quan hệ công chúng MagiCinema.
        </p>
        <p>
          Các nhà báo, cơ quan truyền thông và nhà tài trợ có nhu cầu phỏng vấn độc quyền, hợp tác buổi họp báo (Premiere) hoặc nhận tài liệu họp báo chính thức, vui lòng liên hệ bộ phận truyền thông qua email <span className="font-mono text-gray-900 font-semibold">press@magicinema.vn</span>.
        </p>
      </div>
    ),
  },
  "privacy": {
    title: "Chính sách bảo mật",
    icon: <Shield className="text-gray-800" size={24} />,
    content: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p className="font-semibold text-gray-900 text-base">
          Cam kết bảo vệ dữ liệu và thông tin cá nhân khách hàng.
        </p>
        <p>
          MagiCinema áp dụng các tiêu chuẩn mã hóa dữ liệu cao nhất (SSL/TLS 256-bit) trong mọi giao dịch trực tuyến qua ZaloPay, MoMo và Ngân hàng. Chúng tôi cam kết tuyệt đối không chia sẻ hay sử dụng dữ liệu lịch sử đặt vé, email cá nhân cho bất kỳ mục đích không liên quan nào khi chưa có sự đồng ý hợp pháp từ bạn.
        </p>
      </div>
    ),
  },
  "terms": {
    title: "Điều khoản dịch vụ",
    icon: <FileText className="text-gray-800" size={24} />,
    content: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p className="font-semibold text-gray-900 text-base">
          Quy định chung khi sử dụng dịch vụ tại cụm rạp MagiCinema.
        </p>
        <ul className="list-disc pl-5 space-y-1 text-xs">
          <li>Vé đã mua trực tuyến không áp dụng chính sách hoàn hủy hay thay đổi (trừ trường hợp sự cố suất chiếu từ phía ban quản lý rạp).</li>
          <li>Khách hàng phải tuân thủ nghiêm ngặt phân loại độ tuổi quy định của Cục Điện ảnh (T13, T16, T18). Rạp có quyền yêu cầu kiểm tra CCCD và từ chối vào rạp nếu không đáp ứng đủ điều kiện.</li>
          <li>Nghiêm cấm mọi hành vi ghi hình, phát trực tiếp hay vi phạm bản quyền trong suốt quá trình chiếu phim.</li>
        </ul>
      </div>
    ),
  },
};

export function Footer() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [activeInfoModal, setActiveInfoModal] = useState<string | null>(null);

  return (
    <footer style={{ background: "#fff", borderTop: "1px solid #E5E7EB" }}>
      {/* Top clean divider */}
      <div style={{ height: 1, background: "#D1D5DB" }} />

      <div className="max-w-7xl mx-auto px-6 pt-12 pb-10">

        {/* Main Footer Links */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 mb-14">

          {/* Brand & Social info */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-5 no-underline">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(135deg,#4B5563,#111827)" }}>
                <Film size={20} color="#fff" />
              </div>
              <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
                Magi<span style={{ color: "#4B5563" }}>Cinema</span>
              </span>
            </Link>
            <p style={{ color: "#6B7280", fontSize: "0.875rem", lineHeight: 1.7, maxWidth: 300, marginBottom: 20 }}>
              Nghệ thuật điện ảnh thăng hoa. Suất chiếu cao cấp, dịch vụ chu đáo và trải nghiệm trọn vẹn trong từng giây phút.
            </p>

            {/* Contact info list */}
            <div className="flex flex-col gap-2.5 mb-6">
              {[
                { Icon: MapPin, text: "123 Đại lộ Điện ảnh, Quận 1, TP. Hồ Chí Minh", href: "https://maps.google.com" },
                { Icon: Phone, text: "Hotline CSKH: 1900 8888 (24/7)", href: "tel:19008888" },
                { Icon: Mail, text: "hello@magicinema.vn", href: "mailto:hello@magicinema.vn" },
              ].map(({ Icon, text, href }) => (
                <a key={text} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="flex items-start gap-2.5 no-underline group">
                  <Icon size={15} className="text-gray-500 flex-shrink-0 mt-0.5 group-hover:text-gray-900 transition-colors" />
                  <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">{text}</span>
                </a>
              ))}
            </div>

            {/* Social icons */}
            <div className="flex gap-2.5">
              {[
                { Icon: FaInstagram, href: "https://instagram.com" },
                { Icon: FaXTwitter,  href: "https://twitter.com" },
                { Icon: FaYoutube,   href: "https://youtube.com" },
                { Icon: FaFacebookF, href: "https://facebook.com" },
              ].map(({ Icon, href }, i) => (
                <a key={i} href={href} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
                  style={{ background: "#F3F4F6", border: "1px solid #E5E7EB", color: "#4B5563" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#111827"; e.currentTarget.style.borderColor = "#111827"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(17,24,39,0.2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#F3F4F6"; e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.color = "#4B5563"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Phim Column */}
          <div>
            <h4 className="text-xs font-bold uppercase text-gray-900 tracking-wider mb-4">
              Phim Điện Ảnh
            </h4>
            <ul className="flex flex-col gap-3">
              <li>
                <Link to="/movies/now-showing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium no-underline">
                  Phim đang chiếu
                </Link>
              </li>
              <li>
                <Link to="/movies/coming-soon" className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium no-underline">
                  Phim sắp chiếu
                </Link>
              </li>
              <li>
                <Link to="/screening-date" className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium no-underline">
                  Lịch chiếu hôm nay
                </Link>
              </li>
            </ul>
          </div>

          {/* Dịch Vụ & Hội Viên Column */}
          <div>
            <h4 className="text-xs font-bold uppercase text-gray-900 tracking-wider mb-4">
              Dịch Vụ & Hội Viên
            </h4>
            <ul className="flex flex-col gap-3">
              <li>
                <Link to="/promotions" className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium no-underline">
                  Khuyến mãi & Ưu đãi
                </Link>
              </li>
              <li>
                <Link to="/profile" className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium no-underline">
                  Thông tin Thành viên
                </Link>
              </li>
              <li>
                <Link to="/profile" className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium no-underline">
                  Lịch sử vé đã mua
                </Link>
              </li>
            </ul>
          </div>

          {/* Công ty & Hỗ trợ Column */}
          <div>
            <h4 className="text-xs font-bold uppercase text-gray-900 tracking-wider mb-4">
              Công ty & Hỗ trợ
            </h4>
            <ul className="flex flex-col gap-3">
              <li>
                <button onClick={() => setActiveInfoModal("about")} className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium text-left bg-transparent border-none p-0 cursor-pointer">
                  Về MagiCinema
                </button>
              </li>
              <li>
                <button onClick={() => setActiveInfoModal("careers")} className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium text-left bg-transparent border-none p-0 cursor-pointer flex items-center gap-1.5">
                  Tuyển dụng <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-800 text-[10px] font-bold">HOT</span>
                </button>
              </li>
              <li>
                <button onClick={() => setActiveInfoModal("press")} className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium text-left bg-transparent border-none p-0 cursor-pointer">
                  Tin tức & Báo chí
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Newsletter Box */}
        <div className="rounded-2xl p-8 mb-10 transition-all"
          style={{ background: "linear-gradient(135deg, #F9FAFB, #F3F4F6)", border: "1px solid #E5E7EB", boxShadow: "0 4px 20px -5px rgba(0, 0, 0, 0.04)" }}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-1">
                Luôn cập nhật cùng MagiCinema.
              </h4>
              <p style={{ color: "#6B7280", fontSize: "0.875rem" }}>
                Đăng ký nhận bản tin để cập nhật phim mới, suất chiếu đặc biệt và ưu đãi quà tặng dành cho hội viên.
              </p>
            </div>
            {sent ? (
              <div className="px-6 py-3 rounded-xl bg-gray-100 border border-gray-300 text-gray-800 flex items-center gap-2 font-semibold text-sm">
                ✓ Bạn đã đăng ký bản tin thành công!
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); if (email) setSent(true); }} className="flex gap-0 w-full md:w-auto" style={{ minWidth: 320 }}>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your-email@domain.com"
                  className="flex-1 px-4 py-3 rounded-l-xl outline-none transition-all focus:border-gray-900 text-sm bg-white border border-gray-300 text-gray-900"
                />
                <button type="submit" className="px-6 rounded-r-xl flex items-center gap-2 transition-all duration-200 font-semibold text-sm text-white bg-gray-900 hover:bg-gray-800"
                  style={{ border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
                  <Send size={14} /> Đăng ký
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom copyright & policies bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-gray-200 text-xs text-gray-500 font-medium">
          <p>© 2026 MagiCinema. Bảo lưu mọi quyền lộc tự & Chương trình.</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <button onClick={() => setActiveInfoModal("privacy")} className="text-gray-500 hover:text-gray-900 transition-colors bg-transparent border-none p-0 cursor-pointer">
              Chính sách bảo mật
            </button>
            <button onClick={() => setActiveInfoModal("terms")} className="text-gray-500 hover:text-gray-900 transition-colors bg-transparent border-none p-0 cursor-pointer">
              Điều khoản dịch vụ
            </button>
            <button onClick={() => setActiveInfoModal("privacy")} className="text-gray-500 hover:text-gray-900 transition-colors bg-transparent border-none p-0 cursor-pointer">
              Chính sách Cookie
            </button>
          </div>
        </div>
      </div>

      {/* Customer Contact Modal */}
      <CustomerContactModal 
        isOpen={isContactOpen} 
        onClose={() => setIsContactOpen(false)} 
      />

      {/* Info Modals for About, Careers, Press, Privacy, Terms */}
      {activeInfoModal && INFO_MODALS[activeInfoModal] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-gray-200 overflow-hidden relative animate-scaleUp">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-3">
                {INFO_MODALS[activeInfoModal].icon}
                <h3 className="text-lg font-bold text-gray-900">{INFO_MODALS[activeInfoModal].title}</h3>
              </div>
              <button 
                onClick={() => setActiveInfoModal(null)}
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors border-none cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mb-6">
              {INFO_MODALS[activeInfoModal].content}
            </div>
            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                onClick={() => setActiveInfoModal(null)}
                className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-all border-none cursor-pointer"
              >
                Đóng thông tin
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
