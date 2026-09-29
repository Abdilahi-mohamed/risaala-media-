import api from './api';

export const fetchManagedUsers = () => api.get('/users');
export const updateMyProfile = (payload) => api.patch('/users/me', payload);
export const updateManagedPassword = (userId, password) => api.patch(`/users/${userId}/password`, { password });
export const createStaffAccount = (payload) => api.post('/auth/staff', payload);
