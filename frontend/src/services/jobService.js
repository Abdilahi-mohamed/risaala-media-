import api from './api';

export const fetchJobs = () => api.get('/jobs');
export const fetchJob = (id) => api.get(`/jobs/${id}`);
export const createJob = (payload) => api.post('/jobs', payload);
export const updateJob = (id, payload) => api.put(`/jobs/${id}`, payload);
export const deleteJob = (id) => api.delete(`/jobs/${id}`);
export const fetchDashboardOverview = () => api.get('/dashboard/overview');
export const fetchEmployeeActivity = () => api.get('/dashboard/employee-activity');
export const fetchEmployeePerformance = () => api.get('/dashboard/employee-performance');
export const fetchRevenueStats = () => api.get('/dashboard/revenue');
export const fetchUsers = () => api.get('/users');

export const uploadJobMedia = (id, files, onUploadProgress) => {
  const form = new FormData();
  (files || []).forEach((file) => form.append('files', file));
  return api.post(`/jobs/${id}/media`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress
  });
};

export const uploadFolderMedia = (bookingId, folderName, files, relativePaths, onUploadProgress) => {
  const form = new FormData();
  form.append('bookingId', bookingId);
  form.append('folderName', folderName || 'Project-Media');
  (files || []).forEach((file) => form.append('files', file));
  (relativePaths || []).forEach((relativePath) => form.append('relativePaths[]', relativePath));
  return api.post('/uploads/folder', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress
  });
};

export const uploadJobVideo = (id, files, onUploadProgress) => {
  const form = new FormData();
  (files || []).forEach((file) => form.append('files', file));
  return api.post(`/jobs/${id}/videos`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress
  });
};

export const deleteJobMedia = (jobId, mediaId) => api.delete(`/jobs/${jobId}/media/${mediaId}`);
export const downloadJobMedia = (jobId, mediaId) => api.get(`/jobs/${jobId}/media/${mediaId}/download`, {
  responseType: 'blob'
});
export const listFolderMedia = (bookingId) => api.get('/uploads/folders', {
  params: bookingId ? { bookingId } : {}
});
export const getFolderMedia = (folderId) => api.get(`/uploads/folder/${folderId}`);
export const deleteFolderMedia = (folderId) => api.delete(`/uploads/folder/${folderId}`);
export const downloadFolderMedia = (folderId) => api.get(`/uploads/folder/${folderId}/download`, {
  responseType: 'blob'
});
export const getMediaFile = (fileId) => api.get(`/uploads/file/${fileId}`, { responseType: 'blob' });
