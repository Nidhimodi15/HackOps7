import { useAuth, UserRole } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, User, Eye, FileCheck } from 'lucide-react';

export function RoleSwitcher() {
  const { user, login } = useAuth();

  const roles: { value: UserRole; label: string; icon: any; color: string }[] = [
    { value: 'admin', label: 'Admin', icon: Shield, color: 'bg-red-100 text-red-700' },
    { value: 'user', label: 'User', icon: User, color: 'bg-blue-100 text-blue-700' },
  ];

  const currentRole = roles.find(r => r.value === user?.role) || roles[0];
  const CurrentIcon = currentRole.icon;

  const handleRoleChange = (role: UserRole) => {
    if (user) {
      login(user.email, '', role);
      window.location.reload(); // Reload to apply new permissions
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CurrentIcon className="h-4 w-4" />
          <span className="hidden md:inline">{currentRole.label}</span>
          <Badge variant="secondary" className={`${currentRole.color} text-xs`}>
            Role
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch Role (Demo)</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <DropdownMenuItem
              key={role.value}
              onClick={() => handleRoleChange(role.value)}
              className="cursor-pointer"
            >
              <Icon className="h-4 w-4 mr-2" />
              <span className="flex-1">{role.label}</span>
              {user?.role === role.value && (
                <Badge variant="default" className="ml-2 text-xs">
                  Active
                </Badge>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
