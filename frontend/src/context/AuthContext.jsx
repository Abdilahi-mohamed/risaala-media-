import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { login as loginRequest } from '../services/authService';

const AuthContext = createContext(null);

const getStoredTheme = (userId) => {
  if (!userId) return 'light';
  return localStorage.getItem(`risaala_theme_${userId}`) || 'light';
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('risaala_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setTheme(getStoredTheme(parsedUser?.id || parsedUser?._id || ''));
      } catch (error) {
        localStorage.removeItem('risaala_user');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    document.body.dataset.theme = theme;
    if (user?.id) {
      localStorage.setItem(`risaala_theme_${user.id}`, theme);
    }
  }, [theme, user?.id]);

  const login = async (credentials) => {
    try {
      const response = await loginRequest(credentials);
      const serverUser = response?.data?.data?.user;
      const token = response?.data?.data?.token;

      if (!serverUser) {
        throw new Error('Invalid email or password');
      }

      const safeUser = {
        id: serverUser.id,
        name: serverUser.name,
        email: serverUser.email,
        role: serverUser.role,
        employeeId: serverUser.employeeId,
        username: serverUser.username
      };

      localStorage.setItem('risaala_user', JSON.stringify(safeUser));
      if (token) {
        localStorage.setItem('risaala_token', token);
      }
      setUser(safeUser);
      setTheme(getStoredTheme(safeUser.id));
      return safeUser;
    } catch (error) {
      const message = error?.response?.data?.message || 'Invalid email or password';
      throw new Error(message);
    }
  };

  const logout = () => {
    localStorage.removeItem('risaala_user');
    localStorage.removeItem('risaala_token');
    setUser(null);
  };

  const createStaffUser = async ({ name, email, password, username, employeeId }) => {
    const safeName = String(name || '').trim();
    const safeEmail = String(email || '').trim().toLowerCase();
    const safePassword = String(password || '').trim();
    const normalizedUsername = String(username || '').trim().toLowerCase().replace(/\s+/g, '.');
    const normalizedEmployeeId = String(employeeId || '').trim();

    if (!safeName || !safeEmail || !safePassword) {
      throw new Error('Please complete all staff user fields.');
    }
    if (safePassword.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const response = await fetch('http://localhost:5000/api/auth/staff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('risaala_token') || localStorage.getItem('authToken') || ''}`
      },
      body: JSON.stringify({
        name: safeName,
        email: safeEmail,
        password: safePassword,
        username: normalizedUsername,
        employeeId: normalizedEmployeeId
      })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.message || 'Unable to create staff user.');
    }

    return result?.data || null;
  };

  const updateTheme = (nextTheme) => {
    const normalized = nextTheme === 'dark' || nextTheme === 'black-blue' ? nextTheme : 'light';
    setTheme(normalized);
    if (user?.id) {
      localStorage.setItem(`risaala_theme_${user.id}`, normalized);
    }
  };

  const value = useMemo(() => ({ user, loading, login, logout, createStaffUser, theme, setTheme: updateTheme }), [user, loading, theme]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};
