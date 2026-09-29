import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const getRoleNavItems = (role) => {
  if (role === 'MANAGER') {
    return [
      { label: 'Overview', path: '/dashboard/manager' },
      { label: 'Employee Activity', path: '/employee/activity' },
      { label: 'Booking Jobs', path: '/booking/jobs' },
      { label: 'View Booking', path: '/booking/view' },
      { label: 'Create Staff User', path: '/staff/create' },
      { label: 'Usernames', path: '/users/manage' }
    ];
  }

  if (role === 'EMPLOYEE') {
    return [
      { label: 'Overview', path: '/dashboard/staff' },
      { label: 'View Booking', path: '/booking/view' },
      { label: 'Update Username', path: '/account/manage' }
    ];
  }

  return [
    { label: 'Overview', path: '/dashboard/ceo' },
    { label: 'Employee Activity', path: '/employee/activity' },
    { label: 'Projects', path: '/projects' },
    { label: 'Clients', path: '/clients' },
    { label: 'Equipment', path: '/equipment' },
    { label: 'Timesheets', path: '/work-logs' }
  ];
};

const iconMap = {
  Overview: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M4 12.75V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v6.25" />
      <path d="M5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V11H4v7.5A1.5 1.5 0 0 0 5.5 20Z" />
      <path d="M8 8h8M8 11h5" />
    </svg>
  ),
  'Active Jobs': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M7 4.75h10A2.25 2.25 0 0 1 19.25 7v10A2.25 2.25 0 0 1 17 19.25H7A2.25 2.25 0 0 1 4.75 17V7A2.25 2.25 0 0 1 7 4.75Z" />
      <path d="M8 8.5h8M8 12h8M8 15.5h6" />
    </svg>
  ),
  'Employee Activity': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M5 18.5V9.5M12 18.5V5.5M19 18.5v-8" />
      <path d="M3.5 18.5h17" />
    </svg>
  ),
  'Booking Jobs': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M7 4.75h10A2.25 2.25 0 0 1 19.25 7v10A2.25 2.25 0 0 1 17 19.25H7A2.25 2.25 0 0 1 4.75 17V7A2.25 2.25 0 0 1 7 4.75Z" />
      <path d="M8 8.5h8M8 12h8M8 15.5h6" />
    </svg>
  ),
  'View Booking': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M4.75 7.5A2.75 2.75 0 0 1 7.5 4.75h9A2.75 2.75 0 0 1 19.25 7.5v9A2.75 2.75 0 0 1 16.5 19.25h-9A2.75 2.75 0 0 1 4.75 16.5v-9Z" />
      <path d="M8.25 8.75h7.5M8.25 12h7.5M8.25 15.25h5.5" />
    </svg>
  ),
  'Create Staff User': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M16.5 19.25v-1.5a3.5 3.5 0 0 0-3.5-3.5h-2a3.5 3.5 0 0 0-3.5 3.5v1.5" />
      <circle cx="12" cy="8.5" r="3" />
      <path d="M18.5 8.5v5M16 11h5" />
    </svg>
  ),
  'Usernames': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M16.5 19.25v-1.5a3.5 3.5 0 0 0-3.5-3.5h-2a3.5 3.5 0 0 0-3.5 3.5v1.5" />
      <circle cx="12" cy="8.5" r="3" />
      <path d="M18.5 7.5h2.5v9h-2.5M5.5 7.5H3v9h2.5" />
    </svg>
  ),
  'Update Username': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M16.5 19.25v-1.5a3.5 3.5 0 0 0-3.5-3.5h-2a3.5 3.5 0 0 0-3.5 3.5v1.5" />
      <circle cx="12" cy="8.5" r="3" />
      <path d="M19 5.5 21 7.5l-5.5 5.5-3 0 0-3L19 5.5Z" />
    </svg>
  ),
  Projects: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M4.75 7.5 12 4l7.25 3.5L12 11 4.75 7.5Z" />
      <path d="M4.75 7.5V15l7.25 3.5 7.25-3.5V7.5" />
      <path d="M12 11v8" />
    </svg>
  ),
  Clients: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M16.5 19.25v-1.5a3.5 3.5 0 0 0-3.5-3.5h-2a3.5 3.5 0 0 0-3.5 3.5v1.5" />
      <circle cx="12" cy="8.5" r="3" />
      <path d="M18.5 8.5a2.5 2.5 0 1 0 0-5M5.5 8.5a2.5 2.5 0 1 1 0-5" />
    </svg>
  ),
  Equipment: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M7 18.75V8.5A2.5 2.5 0 0 1 9.5 6h5A2.5 2.5 0 0 1 17 8.5v10.25" />
      <path d="M5 18.75h14M9 12h6M9 15h6" />
    </svg>
  ),
  Timesheets: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M7 4.75h10A2.25 2.25 0 0 1 19.25 7v10A2.25 2.25 0 0 1 17 19.25H7A2.25 2.25 0 0 1 4.75 17V7A2.25 2.25 0 0 1 7 4.75Z" />
      <path d="M8 2.75v3M16 2.75v3M4.75 9.5h14.5" />
    </svg>
  )
};

const SidebarLayout = ({ children }) => {
  const navigate = useNavigate();
  const { user, logout, theme, setTheme } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navItems = getRoleNavItems(user?.role || 'CEO');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const themeOptions = [
    { value: 'light', label: 'Light Mode' },
    { value: 'dark', label: 'Dark Mode' },
    { value: 'black-blue', label: 'Black & Blue' }
  ];

  return (
    <div className="theme-shell min-h-screen" data-theme={theme || 'light'}>
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden w-[280px] flex-col border-r border-[#cdd9e8] bg-[#dfeaf5] p-5 lg:flex">
          <div className="mb-6 flex items-center gap-3 px-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1d74d2] text-sm font-bold text-white shadow-sm flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                <path d="M7 4.75h9.5A2.5 2.5 0 0 1 19 7.25v9.5A2.5 2.5 0 0 1 16.5 19.25H7A2.5 2.5 0 0 1 4.5 16.75v-9.5A2.5 2.5 0 0 1 7 4.75Z" />
                <path d="M8 9.5h8M8 12.5h8M8 15.5h5" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-800">Risaala Media</span>
          </div>

          <div className="mb-7 flex items-center gap-3 rounded-xl border border-[#d5e0ef] bg-[#edf4fb] px-3 py-3 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1c76d6] text-sm font-semibold text-white flex-shrink-0">
              {user?.name?.split(' ').map((part) => part[0]).slice(0, 2).join('') || 'AS'}
            </div>
            <div className="leading-tight min-w-0">
              <p className="text-base font-semibold text-slate-800 truncate">{user?.name || 'Abdiqani Sh. Ibrahim'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.role || 'Executive Producer'}</p>
            </div>
          </div>

          <nav className="space-y-1.5 overflow-y-auto flex-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium transition-colors ${
                    isActive
                      ? 'bg-[#edf4fb] text-slate-900 shadow-sm ring-1 ring-[#d9e7f6]'
                      : 'text-slate-700 hover:bg-[#edf2f8] hover:text-slate-900'
                  }`
                }
              >
                <span className="flex h-5 w-5 items-center justify-center text-slate-600 flex-shrink-0">{iconMap[item.label]}</span>
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto space-y-2 border-t border-[#cdd9e8] pt-4">
            <div className="relative">
              <button
                type="button"
                onClick={() => setSettingsOpen((open) => !open)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium text-slate-700 transition hover:bg-[#edf2f8] hover:text-slate-900"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 flex-shrink-0">
                  <path d="M10.5 3.75h3v2.1a6.75 6.75 0 0 1 3.65 3.45l2.05.7-1.1 1.9-2.1-.7a6.7 6.7 0 0 1-1.8 1.8l.7 2.1-1.9 1.1-.7-2.05a6.75 6.75 0 0 1-3.45-3.65h-2.1v-3l2.1-.7A6.75 6.75 0 0 1 10.5 3.75Z" />
                  <circle cx="12" cy="12" r="2.3" />
                </svg>
                Settings
              </button>

              {settingsOpen && (
                <div className="absolute bottom-full left-0 right-0 z-20 mb-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Theme</p>
                  <div className="space-y-2">
                    {themeOptions.map((option) => (
                      <label key={option.value} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        <span>{option.label}</span>
                        <input
                          type="radio"
                          checked={theme === option.value}
                          onChange={() => {
                            setTheme(option.value);
                            setSettingsOpen(false);
                          }}
                          className="h-4 w-4 accent-[#1d74d2]"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium text-slate-700 transition hover:bg-[#edf2f8] hover:text-slate-900"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 flex-shrink-0">
                <path d="M9 7V5.75A1.75 1.75 0 0 1 10.75 4h6.5A1.75 1.75 0 0 1 19 5.75v12.5A1.75 1.75 0 0 1 17.25 20h-6.5A1.75 1.75 0 0 1 9 18.25V17" />
                <path d="M5 12h9M10.5 7.5 5 12l5.5 4.5" />
              </svg>
              Logout
            </button>
          </div>
        </aside>

        {/* Mobile Sidebar */}
        <aside 
          className={`fixed inset-y-0 left-0 z-40 w-[280px] flex-col border-r border-[#cdd9e8] bg-[#dfeaf5] p-5 transform transition-transform duration-300 ease-in-out lg:hidden ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="mb-6 flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1d74d2] text-sm font-bold text-white shadow-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                  <path d="M7 4.75h9.5A2.5 2.5 0 0 1 19 7.25v9.5A2.5 2.5 0 0 1 16.5 19.25H7A2.5 2.5 0 0 1 4.5 16.75v-9.5A2.5 2.5 0 0 1 7 4.75Z" />
                  <path d="M8 9.5h8M8 12.5h8M8 15.5h5" />
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-800">Risaala Media</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#edf2f8] text-slate-600 lg:hidden"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-7 flex items-center gap-3 rounded-xl border border-[#d5e0ef] bg-[#edf4fb] px-3 py-3 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1c76d6] text-sm font-semibold text-white flex-shrink-0">
              {user?.name?.split(' ').map((part) => part[0]).slice(0, 2).join('') || 'AS'}
            </div>
            <div className="leading-tight min-w-0">
              <p className="text-base font-semibold text-slate-800 truncate">{user?.name || 'Abdiqani Sh. Ibrahim'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.role || 'Executive Producer'}</p>
            </div>
          </div>

          <nav className="space-y-1.5 overflow-y-auto flex-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium transition-colors ${
                    isActive
                      ? 'bg-[#edf4fb] text-slate-900 shadow-sm ring-1 ring-[#d9e7f6]'
                      : 'text-slate-700 hover:bg-[#edf2f8] hover:text-slate-900'
                  }`
                }
              >
                <span className="flex h-5 w-5 items-center justify-center text-slate-600 flex-shrink-0">{iconMap[item.label]}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto space-y-2 border-t border-[#cdd9e8] pt-4">
            <div className="relative">
              <button
                type="button"
                onClick={() => setSettingsOpen((open) => !open)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium text-slate-700 transition hover:bg-[#edf2f8] hover:text-slate-900"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 flex-shrink-0">
                  <path d="M10.5 3.75h3v2.1a6.75 6.75 0 0 1 3.65 3.45l2.05.7-1.1 1.9-2.1-.7a6.7 6.7 0 0 1-1.8 1.8l.7 2.1-1.9 1.1-.7-2.05a6.75 6.75 0 0 1-3.45-3.65h-2.1v-3l2.1-.7A6.75 6.75 0 0 1 10.5 3.75Z" />
                  <circle cx="12" cy="12" r="2.3" />
                </svg>
                Settings
              </button>

              {settingsOpen && (
                <div className="absolute bottom-full left-0 right-0 z-20 mb-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Theme</p>
                  <div className="space-y-2">
                    {themeOptions.map((option) => (
                      <label key={option.value} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        <span>{option.label}</span>
                        <input
                          type="radio"
                          checked={theme === option.value}
                          onChange={() => {
                            setTheme(option.value);
                            setSettingsOpen(false);
                          }}
                          className="h-4 w-4 accent-[#1d74d2]"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium text-slate-700 transition hover:bg-[#edf2f8] hover:text-slate-900"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 flex-shrink-0">
                <path d="M9 7V5.75A1.75 1.75 0 0 1 10.75 4h6.5A1.75 1.75 0 0 1 19 5.75v12.5A1.75 1.75 0 0 1 17.25 20h-6.5A1.75 1.75 0 0 1 9 18.25V17" />
                <path d="M5 12h9M10.5 7.5 5 12l5.5 4.5" />
              </svg>
              Logout
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Header */}
          <div className="flex items-center justify-between border-b border-[#cdd9e8] bg-white p-4 lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1d74d2] text-sm font-bold text-white shadow-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                <path d="M7 4.75h9.5A2.5 2.5 0 0 1 19 7.25v9.5A2.5 2.5 0 0 1 16.5 19.25H7A2.5 2.5 0 0 1 4.5 16.75v-9.5A2.5 2.5 0 0 1 7 4.75Z" />
                <path d="M8 9.5h8M8 12.5h8M8 15.5h5" />
              </svg>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 sm:p-5 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SidebarLayout;
