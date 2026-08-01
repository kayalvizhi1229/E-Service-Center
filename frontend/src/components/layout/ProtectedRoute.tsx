import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, UserRole } from '@/stores/authStore';

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { token, user, hasRole } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !hasRole(...roles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
