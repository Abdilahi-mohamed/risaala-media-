import api from './api';

export const fetchProjects = () => api.get('/projects');
export const fetchProject = (id) => api.get(`/projects/${id}`);
export const createProject = (payload) => api.post('/projects', payload);
export const updateProject = (id, payload) => api.put(`/projects/${id}`, payload);
export const deleteProject = (id) => api.delete(`/projects/${id}`);
