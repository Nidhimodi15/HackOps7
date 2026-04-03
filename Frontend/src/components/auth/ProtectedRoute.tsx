import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, Permissions } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: keyof Permissions;
}

export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const { user, hasPermission } = useAuth();

  // If no user, redirect to login
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // If permission is required and user doesn't have it
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to access this page. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
