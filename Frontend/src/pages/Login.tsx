import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, ShieldCheck, TrendingUp, Shield, User } from "lucide-react";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import heroBg from "@/assets/hero-bg.jpg";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { setThemeMode } = useTheme();

  useEffect(() => {
    setThemeMode('light');
  }, [setThemeMode]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    try {
      // Call backend API for authentication
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.message || 'Login failed');
        return;
      }

      // Check if user role matches selected role
      if (data.user.role !== role) {
        toast.error(`This account is registered as ${data.user.role}, not ${role}`);
        return;
      }

      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Perform login with selected role
      login(email, password, role);
      
      // Show success message
      toast.success(`Logged in as ${data.user.role === 'admin' ? 'Admin' : 'User'}`);
      
      // Navigate based on role
      if (data.user.role === 'admin') {
        navigate("/dashboard");
      } else {
        navigate("/upload"); // User goes to upload page
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Network error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Hero */}
      <div
        className="hidden lg:flex lg:w-1/2 relative bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-secondary/90" />
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="mb-8">
            <h1 className="text-5xl font-bold mb-4 flex items-center gap-3">
              <Zap className="h-12 w-12" />
              FINTEL AI
            </h1>
            <p className="text-2xl font-light mb-2">
              Your Autonomous Finance & Compliance Agent
            </p>
            <p className="text-xl opacity-90">Automate. Audit. Assure.</p>
          </div>

          <div className="space-y-6 mt-8">
            <div className="flex items-start gap-4">
              <ShieldCheck className="h-8 w-8 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold mb-1">
                  AI-Powered Compliance
                </h3>
                <p className="opacity-90">
                  Detect anomalies with 87%+ accuracy using advanced ML models
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <TrendingUp className="h-8 w-8 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold mb-1">
                  Real-time Analytics
                </h3>
                <p className="opacity-90">
                  Monitor vendor risk, compliance trends, and audit trails
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <Card className="w-full max-w-md p-8 shadow-xl">
          <div className="mb-8 text-center lg:hidden">
            <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
              <Zap className="h-8 w-8 text-primary" />
              FINTEL AI
            </h1>
            <p className="text-muted-foreground">Finance Intelligence Agent</p>
          </div>

          <h2 className="text-2xl font-bold mb-6 text-center">
            Welcome Back
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email / Employee ID</Label>
              <Input
                id="email"
                type="text"
                placeholder="your.email@adani.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Select Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Choose your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-red-600" />
                      <span>Admin</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" />
                      <span>User</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between text-sm">
              <a href="#" className="text-primary hover:underline">
                Forgot password?
              </a>
            </div>

            <Button type="submit" className="w-full" size="lg">
              Login
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate("/signup")}
            >
              Create New Account
            </Button>
          </form>


        </Card>
      </div>
    </div>
  );
};

export default Login;
