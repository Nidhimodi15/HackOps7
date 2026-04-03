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
import { Zap, ShieldCheck, TrendingUp, Shield, User, ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import heroBg from "@/assets/hero-bg.jpg";

const Signup = () => {
  const navigate = useNavigate();
  const { setThemeMode } = useTheme();

  useEffect(() => {
    setThemeMode('light');
  }, [setThemeMode]);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    if (!username || !email || !password || !confirmPassword) {
      toast.error("Please fill all fields");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      // Call backend API for registration
      const response = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password, role }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.message || 'Signup failed');
        return;
      }

      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Show success message
      toast.success('Account created successfully!');
      
      // Navigate to login
      navigate("/login");
    } catch (error) {
      console.error('Signup error:', error);
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
                  Detect anomalies with 95%+ accuracy using Gemini AI
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

      {/* Right side - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="absolute top-4 left-4">
          <Button variant="ghost" onClick={() => navigate("/login")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Button>
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
            Create Account
          </h2>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john.doe@company.com"
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
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Select Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as "user" | "admin")}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Choose your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" />
                      <span>User</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-red-600" />
                      <span>Admin</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" size="lg">
              Create Account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-primary hover:underline font-medium"
            >
              Login here
            </button>
          </p>


        </Card>
      </div>
    </div>
  );
};

export default Signup;
