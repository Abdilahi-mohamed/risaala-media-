import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const roleRouteMap = {
  CEO: '/dashboard/ceo',
  MANAGER: '/dashboard/manager',
  EMPLOYEE: '/dashboard/staff'
};

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-600">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    return <Navigate to={roleRouteMap[user.role] || '/dashboard'} replace />;
  }

  return children;
};

export default ProtectedRoute;
