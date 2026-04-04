import { useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Menu,
  Upload,
  FileSearch,
  ShieldAlert,
  Users,
  FileSpreadsheet,
  MessageSquare,
  Settings,
  BarChart3,
  User,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { RoleSwitcher } from "@/components/auth/RoleSwitcher";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasPermission, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? saved === 'true' : true;
  });
  const [searchQuery, setSearchQuery] = useState("");

  const toggleSidebar = () => {
    setSidebarOpen(prev => {
      const next = !prev;
      localStorage.setItem('sidebarOpen', String(next));
      return next;
    });
  };

  const allMenuItems = [
    { icon: BarChart3, label: "Dashboard", path: "/dashboard", permission: "canViewDashboard" as const },
    { icon: Upload, label: "Upload Invoices", path: "/upload", permission: "canUploadInvoices" as const },
    // { icon: FileSearch, label: "Invoice Explorer", path: "/explorer", permission: "canViewInvoices" as const },
    { icon: ShieldAlert, label: "Anomaly Center", path: "/anomalies", permission: "canViewAnomalies" as const },
    { icon: Users, label: "Vendor Analytics", path: "/vendors", permission: "canViewVendors" as const },
    { icon: FileSpreadsheet, label: "Reports", path: "/reports", permission: "canViewReports" as const },
    { icon: MessageSquare, label: "Chat with FINTEL", path: "/chat", permission: "canChatWithFintel" as const },
    { icon: Settings, label: "Settings", path: "/settings", permission: "canAccessSettings" as const },
  ];

  // Filter menu items based on user permissions
  const menuItems = allMenuItems.filter(item => 
    !item.permission || hasPermission(item.permission)
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to explorer page with search query
      navigate(`/explorer?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="min-h-[100vh] flex relative" style={{ background: 'var(--bg-page)' }}>
      {/* Sidebar - Fixed Position */}
      <aside
        className={`fixed left-0 top-0 bottom-0 transition-all duration-300 bg-[var(--bg-sidebar)] z-[60] flex flex-col`}
        style={{ width: sidebarOpen ? '220px' : '72px', boxShadow: '2px 0 12px rgba(0,0,0,0.15)', padding: 0 }}
      >
        <div style={{ padding: `24px ${sidebarOpen ? '20px' : '0'} 16px`, borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', overflow: 'hidden' }} onClick={() => navigate('/')} title="FINTEL AI">
            <img src="/fintel-logo.svg" alt="FINTEL AI" style={{ height: '24px', width: '24px', marginRight: sidebarOpen ? '10px' : '0', flexShrink: 0 }} />
            {sidebarOpen && (
              <div style={{ minWidth: '130px' }}>
                <h1 style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em', margin: 0, lineHeight: 1.2 }}>FINTEL AI</h1>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', margin: 0, marginTop: '2px', whiteSpace: 'nowrap' }}>Financial Intelligence</p>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: sidebarOpen ? '20px 20px 6px' : '20px 0 6px', display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'space-between' : 'center' }}>
          {sidebarOpen && (
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              MAIN MENU
            </span>
          )}
          <Menu 
            className="hover:text-white transition-colors"
            style={{ width: '16px', height: '16px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }} 
            onClick={toggleSidebar}
          />
        </div>

        <nav className="flex-1 overflow-y-auto px-[10px] space-y-1 mt-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                variant="ghost"
                title={!sidebarOpen ? item.label : undefined}
                className={`w-full h-auto font-medium transition-all duration-200 cursor-pointer ${sidebarOpen ? 'justify-start gap-[10px] px-[16px]' : 'justify-center px-0'} py-[10px]`}
                style={{
                  borderRadius: '12px',
                  fontSize: '13px',
                  backgroundColor: isActive ? 'var(--bg-sidebar-active)' : 'transparent',
                  color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.85)',
                  fontWeight: isActive ? 600 : 500,
                  boxShadow: isActive ? 'inset 3px 0 0 var(--color-primary)' : 'none',
                }}
                onClick={() => navigate(item.path)}
              >
                <item.icon className="flex-shrink-0" style={{ width: '18px', height: '18px', opacity: isActive ? 1.0 : 0.7 }} />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </Button>
            );
          })}
        </nav>

        <div className="mt-auto mb-4">
          <div className="hover:text-white hover:bg-white/5 mx-[10px] py-[10px] px-[16px]" style={{ borderRadius: '12px', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'flex-start' : 'center', gap: sidebarOpen ? '10px' : '0', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => { logout(); navigate("/"); }} title={!sidebarOpen ? "Log Out" : undefined}>
            <span style={{ transform: 'rotate(90deg)', display: 'flex', alignItems: 'center', flexShrink: 0, opacity: 0.9 }}>↳</span> 
            {sidebarOpen && <span>Log Out</span>}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col transition-all duration-300" style={{ marginLeft: sidebarOpen ? '220px' : '72px' }}>
        {/* Top Bar */}
        <header className="sticky top-0 z-50 h-[60px] px-[32px] flex items-center justify-between" style={{ background: 'var(--bg-page)' }}>
          <div className="font-bold text-[20px] whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
          </div>

          <div className="flex items-center gap-6">

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <RoleSwitcher />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-0">
                    <div className="h-[36px] w-[36px] rounded-full overflow-hidden flex items-center justify-center p-0" style={{ border: '2px solid var(--border)', boxShadow: 'var(--shadow-card)', background: 'var(--color-primary-soft)' }}>
                      <User className="h-5 w-5 text-[var(--color-primary)]" />
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate("/profile")}>Profile</DropdownMenuItem>
                  {hasPermission("canAccessSettings") && (
                    <DropdownMenuItem onClick={() => navigate("/settings")}>Settings</DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => { logout(); navigate("/"); }}>
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-[24px] animate-fade-in transition-all duration-300">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
