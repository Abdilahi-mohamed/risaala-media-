import api from './api';

export const fetchClients = () => api.get('/clients');
export const fetchClient = (id) => api.get(`/clients/${id}`);
export const createClient = (payload) => api.post('/clients', payload);
export const updateClient = (id, payload) => api.put(`/clients/${id}`, payload);
export const deleteClient = (id) => api.delete(`/clients/${id}`);
