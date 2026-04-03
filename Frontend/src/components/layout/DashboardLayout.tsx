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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const allMenuItems = [
    { icon: BarChart3, label: "Dashboard", path: "/dashboard", permission: "canViewDashboard" as const },
    { icon: Upload, label: "Upload Invoices", path: "/upload", permission: "canUploadInvoices" as const },
    { icon: FileSearch, label: "Invoice Explorer", path: "/explorer", permission: "canViewInvoices" as const },
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
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex h-16 items-center gap-4 px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-3 font-bold text-xl cursor-pointer" onClick={() => navigate("/dashboard")}>
            <img src="/fintel-logo.svg" alt="FINTEL AI" className="h-10 w-10" />
            <span className="hidden sm:inline text-2xl">FINTEL AI</span>
          </div>

          <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoice, vendor, GSTIN, date..."
                className="pl-10 w-full"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
          </form>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <RoleSwitcher />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <span className="hidden md:inline font-medium">{user?.name || 'User'}</span>
                </Button>
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

      <div className="flex relative">
        {/* Sidebar - Fixed Position */}
        <aside
          className={`${
            sidebarOpen ? "w-64" : "w-0 lg:w-20"
          } fixed left-0 top-16 bottom-0 transition-all duration-300 border-r bg-card overflow-y-auto z-40`}
        >
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => (
              <Button
                key={item.path}
                variant={location.pathname === item.path ? "default" : "ghost"}
                className="w-full justify-start gap-3"
                onClick={() => navigate(item.path)}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className={sidebarOpen ? "inline" : "hidden lg:hidden"}>
                  {item.label}
                </span>
              </Button>
            ))}
          </nav>
        </aside>

        {/* Main Content - With left margin to account for fixed sidebar */}
        <main 
          className={`${
            sidebarOpen ? "ml-64" : "ml-0 lg:ml-20"
          } flex-1 p-6 animate-fade-in transition-all duration-300`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
