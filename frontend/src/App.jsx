import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RoleDashboardPage from './pages/RoleDashboardPage';
import JobsPage from './pages/JobsPage';
import ClientsPage from './pages/ClientsPage';
import ProjectsPage from './pages/ProjectsPage';
import EmployeesPage from './pages/EmployeesPage';
import WorkLogsPage from './pages/WorkLogsPage';
import EquipmentPage from './pages/EquipmentPage';
import NotificationsPage from './pages/NotificationsPage';
import SidebarLayout from './components/layouts/SidebarLayout';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

const DashboardRouter = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roleMap = {
    CEO: '/dashboard/ceo',
    MANAGER: '/dashboard/manager',
    EMPLOYEE: '/dashboard/staff'
  };

  return <Navigate to={roleMap[user.role] || '/login'} replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/ceo"
            element={
              <ProtectedRoute allowedRoles={['CEO']}>
                <SidebarLayout>
                  <RoleDashboardPage />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/manager"
            element={
              <ProtectedRoute allowedRoles={['MANAGER']}>
                <SidebarLayout>
                  <RoleDashboardPage />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/staff"
            element={
              <ProtectedRoute allowedRoles={['EMPLOYEE']}>
                <SidebarLayout>
                  <RoleDashboardPage />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/employee/activity"
            element={
              <ProtectedRoute allowedRoles={['MANAGER', 'CEO']}>
                <SidebarLayout>
                  <RoleDashboardPage mode="employee-activity" />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/booking/jobs"
            element={
              <ProtectedRoute allowedRoles={['MANAGER']}>
                <SidebarLayout>
                  <RoleDashboardPage mode="booking-form" />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/booking/view"
            element={
              <ProtectedRoute allowedRoles={['MANAGER', 'EMPLOYEE']}>
                <SidebarLayout>
                  <RoleDashboardPage mode="booking-view" />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/booking/upload/:bookingId"
            element={
              <ProtectedRoute allowedRoles={['MANAGER', 'EMPLOYEE']}>
                <SidebarLayout>
                  <RoleDashboardPage mode="booking-upload" />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/staff/create"
            element={
              <ProtectedRoute allowedRoles={['MANAGER']}>
                <SidebarLayout>
                  <RoleDashboardPage mode="staff-create" />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/users/manage"
            element={
              <ProtectedRoute allowedRoles={['MANAGER']}>
                <SidebarLayout>
                  <RoleDashboardPage mode="user-management" />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/account/manage"
            element={
              <ProtectedRoute allowedRoles={['EMPLOYEE']}>
                <SidebarLayout>
                  <RoleDashboardPage mode="account-management" />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            }
          />

          <Route
            path="/jobs"
            element={
              <ProtectedRoute>
                <SidebarLayout>
                  <JobsPage />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients"
            element={
              <ProtectedRoute>
                <SidebarLayout>
                  <ClientsPage />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <SidebarLayout>
                  <ProjectsPage />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute>
                <SidebarLayout>
                  <EmployeesPage />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/work-logs"
            element={
              <ProtectedRoute>
                <SidebarLayout>
                  <WorkLogsPage />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/equipment"
            element={
              <ProtectedRoute>
                <SidebarLayout>
                  <EquipmentPage />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <SidebarLayout>
                  <NotificationsPage />
                </SidebarLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
