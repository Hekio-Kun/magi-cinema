import { useState, useEffect, useRef } from "react";
import { Film, Menu, User, LogOut, Search, ChevronDown, Ticket, Settings, Loader2, Crown } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { movieService, type MovieResponse } from "@/api/movieApi";
import { canAccessDashboardFromScopes } from "@/utils/dashboardAccess";
import { clearAuthToken } from "@/utils/authSession";
import { CustomerContactModal } from "@/components/common/CustomerContactModal";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function Header() {
  const location = useLocation();
  return <HeaderContent key={location.pathname} pathname={location.pathname} />;
}

function HeaderContent({ pathname }: { pathname: string }) {
  const navigate = useNavigate();
  const isLandingPage = pathname === "/";
  const [scrolled, setScrolled]         = useState(false);
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [menuButtonOffset, setMenuButtonOffset] = useState<{ x: number; y: number } | null>(null);
  const [menuButtonJumpCount, setMenuButtonJumpCount] = useState(0);
  const authToken = useAuthToken();
  const currentUser = useCurrentUser();
  const isAuthenticated = authToken !== null;
  const user = isAuthenticated ? currentUser : null;
  const canOpenDashboard = canAccessDashboardFromScopes(user?.scopes || []);
  const canViewCustomerMembership = !!user
    && user.roles.includes("CUSTOMER")
    && !user.roles.some((role) => role === "ADMIN" || role === "MANAGER" || role === "STAFF");

  // New States for UI improvements
  const [isDarkMode] = useState(() => localStorage.getItem("theme") === "dark");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchState, setSearchState] = useState<{ keyword: string; results: MovieResponse[] }>({
    keyword: "",
    results: [],
  });
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [isContactOpen, setIsContactOpen] = useState(false);
  
  const lastScrollY = useRef(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchKeyword = searchQuery.trim();
  const searchTouched = searchKeyword.length > 0;
  const searchResults = searchKeyword.length >= 2 && searchState.keyword === searchKeyword ? searchState.results : [];
  const searchLoading = searchKeyword.length >= 2 && searchState.keyword !== searchKeyword;

  // Smart Sticky Header Logic
  useEffect(() => {
    const onScroll = () => {
      const currentScrollY = window.scrollY;
      setScrolled(currentScrollY > 16);
      
      if (currentScrollY > 80) {
        if (currentScrollY > lastScrollY.current) {
          setHeaderVisible(false); // Scroll down
          setProfileDropdownOpen(false); // Close dropdown when scrolling
          setSearchOpen(false);
        } else {
          setHeaderVisible(true); // Scroll up
        }
      } else {
        setHeaderVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const keyword = searchQuery.trim();

    if (keyword.length < 2) {
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      movieService.getMovies({
        keyword,
        page: 0,
        size: 6,
        sortBy: "movieId",
        direction: "DESC",
      })
        .then((page) => {
          if (!cancelled) {
            setSearchState({
              keyword,
              results: page.content || [],
            });
          }
        })
        .catch((err) => {
          console.error("Failed to search movies", err);
          if (!cancelled) {
            setSearchState({
              keyword,
              results: [],
            });
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  // Dark Mode Logic
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    const resetFloatingMenuButton = () => {
      setMenuButtonOffset(null);
      setMenuButtonJumpCount(0);
    };

    window.addEventListener("resize", resetFloatingMenuButton);
    return () => window.removeEventListener("resize", resetFloatingMenuButton);
  }, []);



  const handleLogout = () => {
    clearAuthToken();
    window.location.href = "/";
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchState({ keyword: "", results: [] });
  };

  const openMovie = (movieId: number) => {
    closeSearch();
    setMobileOpen(false);
    navigate(`/movies/${movieId}`);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      openMovie(searchResults[0].movieId);
    }
  };

  const moveMobileMenuButton = (button: HTMLButtonElement) => {
    if (!isLandingPage) {
      setMenuButtonOffset(null);
      setMenuButtonJumpCount(0);
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMenuButtonOffset(null);
      setMenuButtonJumpCount(0);
      return;
    }

    const nextCount = menuButtonJumpCount + 1;
    if (nextCount >= 10) {
      setMenuButtonOffset(null);
      setMenuButtonJumpCount(0);
      return;
    }

    const rect = button.getBoundingClientRect();
    const margin = 18;
    const safeTop = 82;
    const maxLeft = Math.max(window.innerWidth - rect.width - margin, margin);
    const maxTop = Math.max(window.innerHeight - rect.height - margin, safeTop);
    const targetLeft = margin + Math.random() * Math.max(maxLeft - margin, 1);
    const targetTop = safeTop + Math.random() * Math.max(maxTop - safeTop, 1);
    const baseLeft = rect.left - (menuButtonOffset?.x || 0);
    const baseTop = rect.top - (menuButtonOffset?.y || 0);

    setMenuButtonJumpCount(nextCount);
    setMenuButtonOffset({
      x: targetLeft - baseLeft,
      y: targetTop - baseTop,
    });
  };

  const getMovieVietnameseName = (movie: MovieResponse) =>
    movie.movieNameVn?.trim() || "Chưa cập nhật tên phim";

  const renderSearchResults = (compact = false) => {
    const keyword = searchQuery.trim();
    if (!searchOpen && !compact) return null;
    if (!searchTouched) return null;

    return (
      <div
        className={compact ? "mt-2 rounded-xl border border-gray-200 bg-white overflow-hidden" : "absolute right-0 top-full mt-3 w-[360px] rounded-xl bg-white shadow-2xl border border-gray-100 overflow-hidden z-50"}
      >
        {keyword.length < 2 ? (
          <div className="px-4 py-3 text-sm text-gray-500">Nhập ít nhất 2 ký tự để tìm phim.</div>
        ) : searchLoading ? (
          <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
            <Loader2 size={15} className="animate-spin" /> Đang tìm phim...
          </div>
        ) : searchResults.length === 0 ? (
          <div className="px-4 py-3 text-sm text-gray-500">Không tìm thấy phim phù hợp.</div>
        ) : (
          <div className="py-1">
            {searchResults.map((movie) => (
              <button
                key={movie.movieId}
                type="button"
                onClick={() => openMovie(movie.movieId)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left border-0 bg-transparent cursor-pointer"
              >
                <div className="w-10 h-14 rounded-md bg-gray-100 overflow-hidden flex-shrink-0">
                  {movie.smallImage || movie.largeImage ? (
                    <img
                      src={movie.smallImage || movie.largeImage || ""}
                      alt={getMovieVietnameseName(movie)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film size={16} className="text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-900 truncate">{getMovieVietnameseName(movie)}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    {movie.status || "Chưa cập nhật"}{movie.duration ? ` · ${movie.duration} phút` : ""}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <header
      className={`fixed left-0 right-0 z-50 transition-all duration-300 ${headerVisible ? 'top-0' : '-top-24'}`}
      style={{
        background: scrolled
          ? "rgba(228,232,238,0.92)"
          : "rgba(255,255,255,0.6)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: scrolled ? "1px solid rgba(209,213,219,0.6)" : "1px solid rgba(209,213,219,0.3)",
        boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.06)" : "none",
      }}
    >
      <div className="max-w-7xl mx-auto px-6" style={{ height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group" style={{ textDecoration: "none", flexShrink: 0 }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
            style={{ background: "linear-gradient(135deg, #4B5563, #374151)", boxShadow: "0 4px 12px rgba(75,85,99,0.3)" }}>
            <Film size={18} color="#fff" />
          </div>
          <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "#111827", letterSpacing: "-0.01em" }}>
            Magi<span style={{ color: "#4B5563" }}>Cinema</span>
          </span>
        </Link>

        {/* Desktop Nav with underline hover animation */}
        <nav className="hidden md:flex items-center gap-6">
          <div className="relative group py-2">
            <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              Phim <ChevronDown size={14} className="group-hover:rotate-180 transition-transform duration-300" style={{ transform: "translateY(1px)" }} />
            </span>
            <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
              <Link to="/movies/now-showing" className="block px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-red-600 rounded-t-xl transition-colors">
                Phim đang chiếu
              </Link>
              <Link to="/movies/coming-soon" className="block px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-red-600 rounded-b-xl transition-colors">
                Phim sắp chiếu
              </Link>
            </div>
          </div>
          
          <Link to="/screening-date" className="relative group py-2" style={{ fontSize: "0.9rem", fontWeight: 600, color: "#374151", textDecoration: "none" }}>
            Ngày chiếu
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 group-hover:w-full rounded-full"></span>
          </Link>
          <Link to="/promotions" className="relative group py-2" style={{ fontSize: "0.9rem", fontWeight: 600, color: "#374151", textDecoration: "none" }}>
            Khuyến mãi
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 group-hover:w-full rounded-full"></span>
          </Link>
          <button onClick={() => setIsContactOpen(true)} className="relative group py-2 bg-transparent border-none cursor-pointer" style={{ fontSize: "0.9rem", fontWeight: 600, color: "#374151" }}>
            Liên hệ
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 group-hover:w-full rounded-full"></span>
          </button>
        </nav>

        {/* Right actions */}
        <div className="hidden md:flex items-center gap-3">
          
          {/* Search Bar UI */}
          <div className="relative flex items-center" ref={searchRef}>
            <form onSubmit={submitSearch} className={`flex items-center transition-all duration-300 overflow-hidden ${searchOpen ? 'w-56 opacity-100 mr-2' : 'w-0 opacity-0'}`}>
              <input
                type="text"
                placeholder="Nhập phim bạn muốn tìm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", padding: "6px 14px", borderRadius: 20, border: "1px solid #D1D5DB", outline: "none", fontSize: "0.85rem", background: "rgba(255,255,255,0.8)" }}
              />
            </form>
            <button onClick={() => setSearchOpen(!searchOpen)} 
              className="hover:bg-gray-200 transition-colors"
              style={{ padding: 8, borderRadius: "50%", background: "transparent", border: "none", cursor: "pointer", color: "#374151" }}>
              <Search size={18} />
            </button>
            {renderSearchResults()}
          </div>



          {isAuthenticated ? (
            <div className="relative flex items-center ml-1" ref={dropdownRef}>
              <div 
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                style={{ background: "#fff", border: "1px solid #D1D5DB", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden" style={{ background: "linear-gradient(135deg,#4B5563,#374151)" }}>
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                         onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "https://ui-avatars.com/api/?name=" + (user?.username || "U") + "&background=374151&color=fff";
                         }} />
                  ) : (
                    <User size={14} color="#fff" />
                  )}
                </div>
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111827" }}>{user?.username}</span>
                <ChevronDown size={14} color="#374151" style={{ transform: profileDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
              </div>

              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <div className="absolute top-full right-0 mt-3 w-56 rounded-xl bg-white shadow-xl border border-gray-100 overflow-hidden z-50 transition-all">
                  <div className="py-2">
                    <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setProfileDropdownOpen(false)}>
                      <Settings size={16} className="text-gray-400" /> Cài đặt tài khoản
                    </Link>
                    <Link to="/profile?tab=tickets" className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setProfileDropdownOpen(false)}>
                      <Ticket size={16} className="text-gray-400" /> Vé của tôi
                    </Link>
                    {canViewCustomerMembership && (
                      <Link to="/profile?tab=membership" className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setProfileDropdownOpen(false)}>
                        <Crown size={16} /> Hội viên
                      </Link>
                    )}
                    {canOpenDashboard && (
                      <Link to="/admin" className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setProfileDropdownOpen(false)}>
                        <Film size={16} className="text-red-500" /> Dashboard
                      </Link>
                    )}
                    <div className="border-t border-gray-100 my-1"></div>
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer border-none bg-transparent">
                      <LogOut size={16} /> Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-1">
              <Link to="/auth?mode=login"
                className="hover:bg-gray-50"
                style={{ padding: "8px 16px", borderRadius: 12, border: "1px solid #D1D5DB", background: "#fff", color: "#374151", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none", transition: "all 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                Đăng nhập
              </Link>
              <Link to="/auth?mode=register"
                className="hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
                style={{ padding: "8px 18px", borderRadius: 12, background: "linear-gradient(135deg,#4B5563,#374151)", color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none", boxShadow: "0 4px 12px rgba(75,85,99,0.3)" }}>
                Đăng ký
              </Link>
            </div>
          )}

        </div>

        {/* Mobile toggle */}
        {isLandingPage && (
          <button
            type="button"
            className={`mobile-menu-toggle md:hidden ${menuButtonOffset ? "mobile-menu-toggle--running" : ""}`}
            onClick={(event) => {
              moveMobileMenuButton(event.currentTarget);
              setMobileOpen((current) => !current);
            }}
            aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={mobileOpen}
            style={menuButtonOffset ? { transform: `translate3d(${menuButtonOffset.x}px, ${menuButtonOffset.y}px, 0)` } : undefined}
          >
            <Menu size={19} strokeWidth={2.4} color="#374151" />
          </button>
        )}
      </div>

      {/* Mobile menu (nâng cấp UI) */}
      {isLandingPage && mobileOpen && (
        <div className="md:hidden px-6 pb-6 pt-2 flex flex-col gap-3 shadow-xl"
          style={{ background: "rgba(255,255,255,0.98)", borderTop: "1px solid #E5E7EB", backdropFilter: "blur(20px)" }}>
          
          <form className="relative mb-2" onSubmit={submitSearch}>
             <input
                    type="text"
                    placeholder="Nhập phim bạn muốn tìm..."
                    value={searchQuery}
                    onFocus={() => setSearchOpen(true)}
                    onChange={(e) => {
                      setSearchOpen(true);
                      setSearchQuery(e.target.value);
                    }}
                    className="w-full px-4 py-2.5 bg-gray-100 rounded-xl outline-none text-sm border border-gray-200 focus:border-gray-300 transition-colors" />
             <Search size={16} className="absolute right-3 top-3 text-gray-400" />
             {renderSearchResults(true)}
          </form>

          <div className="flex flex-col gap-2">
            <div className="p-3 bg-gray-50 rounded-xl">
               <span style={{ fontSize: "0.95rem", color: "#374151", fontWeight: 600, display: "block", marginBottom: 8 }}>Phim</span>
               <div className="flex flex-col gap-2 pl-4">
                 <Link to="/movies/now-showing" onClick={() => setMobileOpen(false)} style={{ fontSize: "0.9rem", color: "#4B5563", textDecoration: "none" }}>Phim đang chiếu</Link>
                 <Link to="/movies/coming-soon" onClick={() => setMobileOpen(false)} style={{ fontSize: "0.9rem", color: "#4B5563", textDecoration: "none" }}>Phim sắp chiếu</Link>
               </div>
            </div>
            <Link to="/screening-date" onClick={() => setMobileOpen(false)} style={{ padding: "12px 14px", borderRadius: 12, fontSize: "0.95rem", color: "#374151", textDecoration: "none", display: "block", fontWeight: 600, background: "#f9fafb" }}>Ngày chiếu</Link>
            <Link to="/promotions" onClick={() => setMobileOpen(false)} style={{ padding: "12px 14px", borderRadius: 12, fontSize: "0.95rem", color: "#374151", textDecoration: "none", display: "block", fontWeight: 600, background: "#f9fafb" }}>Khuyến mãi</Link>
            <button onClick={() => { setMobileOpen(false); setIsContactOpen(true); }} style={{ padding: "12px 14px", borderRadius: 12, fontSize: "0.95rem", color: "#374151", textDecoration: "none", display: "block", fontWeight: 600, background: "#f9fafb", border: "none", width: "100%", textAlign: "left", cursor: "pointer" }}>Liên hệ</button>
          </div>
          
          <div style={{ borderTop: "1px solid #E5E7EB", marginTop: 4, paddingTop: 16, display: "flex", gap: 12, flexDirection: "column" }}>
            {isAuthenticated ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Link to="/profile" onClick={() => setMobileOpen(false)}
                  style={{ width: "100%", padding: "12px", borderRadius: 12, background: "#f3f4f6", color: "#374151", textDecoration: "none", textAlign: "center", fontWeight: 600, fontSize: "0.9rem" }}>
                  Tài khoản ({user?.username})
                </Link>
                {canOpenDashboard && (
                  <Link to="/admin" onClick={() => setMobileOpen(false)}
                    style={{ width: "100%", padding: "12px", borderRadius: 12, background: "rgba(230,57,70,0.1)", color: "#E63946", textDecoration: "none", textAlign: "center", fontWeight: 700, fontSize: "0.9rem" }}>
                    Dashboard
                  </Link>
                )}
                <button onClick={handleLogout}
                  style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1px solid #fca5a5", background: "#fff", cursor: "pointer", fontWeight: 600, color: "#dc2626", fontSize: "0.9rem" }}>
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Link to="/auth?mode=login" onClick={() => setMobileOpen(false)}
                  style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid #D1D5DB", background: "#fff", color: "#374151", textDecoration: "none", textAlign: "center", fontWeight: 600, fontSize: "0.9rem" }}>
                  Đăng nhập
                </Link>
                <Link to="/auth?mode=register" onClick={() => setMobileOpen(false)}
                  style={{ flex: 1, padding: "12px", borderRadius: 12, background: "linear-gradient(135deg,#4B5563,#374151)", color: "#fff", textDecoration: "none", textAlign: "center", fontWeight: 600, fontSize: "0.9rem" }}>
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
      
      <CustomerContactModal 
        isOpen={isContactOpen} 
        onClose={() => setIsContactOpen(false)} 
      />
    </header>
  );
}
