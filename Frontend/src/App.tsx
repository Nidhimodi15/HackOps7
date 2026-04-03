import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Explorer from "./pages/Explorer";
import Anomalies from "./pages/Anomalies";
import Vendors from "./pages/Vendors";
import Reports from "./pages/Reports";
import Chat from "./pages/Chat";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/dashboard" element={<ProtectedRoute requiredPermission="canViewDashboard"><Dashboard /></ProtectedRoute>} />
              <Route path="/upload" element={<ProtectedRoute requiredPermission="canUploadInvoices"><Upload /></ProtectedRoute>} />
              <Route path="/explorer" element={<ProtectedRoute requiredPermission="canViewInvoices"><Explorer /></ProtectedRoute>} />
              <Route path="/anomalies" element={<ProtectedRoute requiredPermission="canViewAnomalies"><Anomalies /></ProtectedRoute>} />
              <Route path="/vendors" element={<ProtectedRoute requiredPermission="canViewVendors"><Vendors /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute requiredPermission="canViewReports"><Reports /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute requiredPermission="canChatWithFintel"><Chat /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute requiredPermission="canAccessSettings"><Settings /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
