import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getBookingById,
  getBookings,
  subscribeToBookings,
  updateBookingStatus
} from '../services/bookingService';
import {
  createJob,
  deleteFolderMedia,
  deleteJob,
  downloadFolderMedia,
  downloadJobMedia,
  fetchJobs,
  fetchUsers,
  getFolderMedia,
  listFolderMedia,
  updateJob,
  uploadFolderMedia,
  uploadJobMedia
} from '../services/jobService';
import {
  fetchManagedUsers,
  updateMyProfile,
  updateManagedPassword
} from '../services/userService';

const MANAGER_DISPLAY_NAME = 'Abdiqani Sh. Ibrahim';

const getApiBase = () => (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

const getDisplayName = (user) => {
  if (!user) return MANAGER_DISPLAY_NAME;
  if (user.role === 'MANAGER') return MANAGER_DISPLAY_NAME;
  return user.name || MANAGER_DISPLAY_NAME;
};

const roleThemes = {
  CEO: {
    title: 'CEO Dashboard',
    accent: 'bg-[#1d74d2]',
    summary: 'Executive overview across the entire agency.'
  },
  MANAGER: {
    title: 'Manager Dashboard',
    accent: 'bg-[#0f766e]',
    summary: 'Operational snapshot for teams, projects, and delivery.'
  },
  EMPLOYEE: {
    title: 'Staff Dashboard',
    accent: 'bg-[#7c3aed]',
    summary: 'My tasks, schedule, and work progress.'
  }
};

const dashboardData = {
  CEO: {
    stats: [
      { label: 'Total Revenue', value: '$8.4M', trend: '+14%' },
      { label: 'Active Projects', value: '38', trend: '+6' },
      { label: 'Jobs Completed', value: '421', trend: '+12%' },
      { label: 'Team Utilization', value: '86%', trend: '-2%' }
    ],
    focus: ['Q4 performance', 'Agency growth', 'Client retention', 'Top performers']
  },
  MANAGER: {
    stats: [
      { label: 'Team Jobs', value: '128', trend: '+9%' },
      { label: 'Pending Reviews', value: '14', trend: '+4' },
      { label: 'Equipment in Use', value: '36', trend: '+3' },
      { label: 'On-Time Rate', value: '94%', trend: '+2%' }
    ],
    focus: ['Team workload', 'Deadlines', 'Resource allocation', 'Edit queue']
  },
  EMPLOYEE: {
    stats: [
      { label: 'My Jobs', value: '9', trend: '+2' },
      { label: 'Hours Logged', value: '64h', trend: '+8h' },
      { label: 'Tasks Approved', value: '18', trend: '+5' },
      { label: 'Attendance', value: '96%', trend: '+1%' }
    ],
    focus: ['My projects', 'Current tasks', 'Work logs', 'Schedule']
  }
};

const emptyForm = {
  customerName: '',
  date: '',
  day: '',
  dayTime: '',
  money: '',
  employeeName: '',
  employeeIdentifier: '',
  toolsAndProcess: ''
};

const formatDay = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
};

const statusMap = {
  pending: { label: 'Pending', color: 'bg-red-500', text: 'text-red-700', button: 'bg-red-500 hover:bg-red-600' },
  accepted: { label: 'Accepted', color: 'bg-yellow-400', text: 'text-yellow-700', button: 'bg-yellow-400 hover:bg-yellow-500' },
  done: { label: 'Done', color: 'bg-green-500', text: 'text-green-700', button: 'bg-green-500 hover:bg-green-600' }
};

const getMediaType = (value = '') => {
  if (!value) return 'unknown';
  if (value.startsWith('data:image/')) return 'image';
  if (value.startsWith('data:video/')) return 'video';
  if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(value)) return 'image';
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(value)) return 'video';
  return 'unknown';
};

const getHoursFromDateRange = (job = {}) => {
  const startValue = job.startDate || job.createdAt;
  const endValue = job.endDate || job.updatedAt || job.createdAt || startValue;

  if (!startValue || !endValue) return 0;

  const diffMs = new Date(endValue) - new Date(startValue);
  if (Number.isNaN(diffMs) || diffMs <= 0) return 0;

  return Number((diffMs / (1000 * 60 * 60)).toFixed(1));
};

const getStatusValue = (status = '') => String(status || '').trim().toLowerCase();

const normalizeBookingStatus = (status = '') => {
  const value = getStatusValue(status);
  if (value === 'pending' || value === 'scheduled') return 'pending';
  if (value === 'accepted' || value === 'in progress' || value === 'editing' || value === 'review') return 'accepted';
  if (value === 'done' || value === 'completed') return 'done';
  if (value === 'cancelled') return 'cancelled';
  return 'pending';
};

const extractEmployeeName = (job = {}) => {
  if (Array.isArray(job?.assignedEmployees) && job.assignedEmployees.length > 0) {
    return job.assignedEmployees[0].name || job.assignedEmployees[0].fullName || 'Assigned employee';
  }
  if (job?.employeeName) return job.employeeName;
  const notesMatch = String(job?.notes || '').match(/Assigned employee:\s*(.+)/i);
  return notesMatch ? notesMatch[1].trim() : 'Unassigned';
};

const mapAttachment = (file, index, apiBase) => {
  if (!file) return null;
  if (typeof file === 'string') {
    return {
      id: `legacy-${index}`,
      name: `attachment-${index + 1}`,
      type: file.startsWith('data:video/') ? 'video' : 'image',
      data: file
    };
  }
  const src = file.url && String(file.url).startsWith('http') ? file.url : `${apiBase}${file.url || ''}`;
  return {
    id: file._id || file.id || `attachment-${index}`,
    name: file.filename || `attachment-${index + 1}`,
    type: file.type || ((file.filename || '').endsWith('.mp4') ? 'video' : 'image'),
    data: src,
    uploadedBy: file.uploadedBy,
    uploadedAt: file.uploadedAt
  };
};

const mapJobToBooking = (job) => {
  const apiBase = getApiBase();

  // Prefer the full combined process string; fall back to joining legacy tools array
  let toolsAndProcess = '—';
  if (job?.process) {
    toolsAndProcess = job.process;
  } else if (Array.isArray(job?.tools) && job.tools.length > 0) {
    toolsAndProcess = job.tools.join(', ');
  }

  const assignedEmployee = Array.isArray(job?.assignedEmployees) && job.assignedEmployees.length > 0 ? job.assignedEmployees[0] : null;

  return {
    id: job?._id || job?.id,
    customerName: job?.jobTitle || job?.customerName || 'Unassigned customer',
    date: job?.startDate ? new Date(job.startDate).toISOString().slice(0, 10) : job?.date || '',
    day: job?.day || formatDay(job?.startDate || job?.date),
    dayTime: job?.startTime || job?.dayTime || '',
    money: Number(job?.budget ?? job?.money ?? 0).toFixed(2),
    employeeName: extractEmployeeName(job),
    assignedEmployeeId: assignedEmployee ? String(assignedEmployee._id || assignedEmployee.id || '') : '',
    assignedEmployeeUsername: assignedEmployee?.username || '',
    assignedEmployeeEmployeeId: assignedEmployee?.employeeId || '',
    status: normalizeBookingStatus(job?.status),
    uploadedFiles: Array.isArray(job?.attachments)
      ? job.attachments.map((file, index) => mapAttachment(file, index, apiBase)).filter(Boolean)
      : [],
    attachments: Array.isArray(job?.attachments) ? job.attachments : [],
    jobVideos: Array.isArray(job?.jobVideos)
      ? job.jobVideos.map((file, index) => mapAttachment(file, index, apiBase)).filter(Boolean)
      : [],
    toolsAndProcess,
    tools: Array.isArray(job?.tools) ? job.tools : [],
    process: job?.process || ''
  };
};

const RoleDashboardPage = ({ mode = 'overview' }) => {
  const navigate = useNavigate();
  const { bookingId } = useParams();
  const { user, createStaffUser } = useAuth();
  const role = user?.role || 'CEO';
  const theme = roleThemes[role] || roleThemes.CEO;
  const data = dashboardData[role] || dashboardData.CEO;
  const [form, setForm] = useState(emptyForm);
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '' });
  const [bookings, setBookings] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [staffError, setStaffError] = useState('');
  const [staffMessage, setStaffMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [folderUploads, setFolderUploads] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folderLoading, setFolderLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState('date');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaDeleteTarget, setMediaDeleteTarget] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [managedUsers, setManagedUsers] = useState([]);
  const [passwordForm, setPasswordForm] = useState({ userId: '', password: '', confirmPassword: '' });
  const [accountForm, setAccountForm] = useState({ username: user?.username || '', currentPassword: '', newPassword: '', confirmPassword: '' });
  const [userPageMessage, setUserPageMessage] = useState('');
  const [userPageError, setUserPageError] = useState('');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [usernameError, setUsernameError] = useState('');

  useEffect(() => {
    setAccountForm((prev) => ({ ...prev, username: user?.username || '' }));
  }, [user?.username]);

  useEffect(() => {
    if (mode === 'booking-upload' && bookingId) {
      loadFolderUploads(bookingId);
    }
  }, [mode, bookingId]);

  useEffect(() => {
    setBookings(getBookings());
    const unsubscribe = subscribeToBookings((nextBookings) => setBookings(nextBookings));
    return unsubscribe;
  }, []);

  const refreshBookingsData = async () => {
    setJobsLoading(true);
    try {
      const response = await fetchJobs();
      setJobs(response?.data?.data || []);
    } catch (loadError) {
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  };

  useEffect(() => {
    refreshBookingsData();
  }, [role]);

  useEffect(() => {
    const loadEmployees = async () => {
      if (role !== 'MANAGER') {
        setEmployeeOptions([]);
        return;
      }

      try {
        const response = await fetchUsers();
        const employees = (response?.data?.data || []).filter((entry) => entry.role === 'EMPLOYEE');
        setEmployeeOptions(employees);
      } catch (_loadError) {
        setEmployeeOptions([]);
      }
    };

    loadEmployees();
  }, [role]);

  const bookingRows = useMemo(() => {
    if (jobs.length > 0) {
      return jobs.map(mapJobToBooking);
    }
    return bookings;
  }, [jobs, bookings]);

  const filteredBookings = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    const filtered = normalized
      ? bookingRows.filter((booking) => {
          return Object.values(booking).some((value) =>
            String(value).toLowerCase().includes(normalized)
          );
        })
      : bookingRows;

    return [...filtered].sort((a, b) => {
      if (sortKey === 'employeeName') {
        return (a.employeeName || '').localeCompare(b.employeeName || '');
      }
      return new Date(a.date) - new Date(b.date);
    });
  }, [bookingRows, searchTerm, sortKey]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'date' && value) {
        next.day = formatDay(value);
      }
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const selectedEmployee = employeeOptions.find((employee) => String(employee._id || employee.id) === String(form.employeeIdentifier));

    if (!form.customerName || !form.date || !form.dayTime || !form.money || !form.employeeIdentifier) {
      setError('Please select a valid assigned employee before submitting.');
      return;
    }

    const payload = {
      jobTitle: form.customerName,
      description: `Booking for ${form.customerName}`,
      startDate: form.date,
      endDate: form.date,
      startTime: form.dayTime,
      budget: Number(form.money),
      status: 'Pending',
      notes: `Assigned employee: ${selectedEmployee?.name || form.employeeName}`,
      assignedEmployeeId: form.employeeIdentifier,
      employeeName: selectedEmployee?.name || form.employeeName,
      username: selectedEmployee?.username || '',
      employeeId: selectedEmployee?.employeeId || '',
      tools: [],
      process: form.toolsAndProcess || ''
    };

    try {
      const response = await createJob(payload);
      const newJob = response?.data?.data;
      if (newJob) {
        setJobs((prev) => [newJob, ...prev]);
      } else {
        await refreshBookingsData();
      }
      setForm(emptyForm);
      setError('');
      setActionMessage('Booking created successfully.');
    } catch (createError) {
      setError(createError?.response?.data?.message || 'Unable to create booking. Please try again.');
    }
  };

  const handleStaffFormChange = (event) => {
    const { name, value } = event.target;
    setStaffForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateStaffUser = async (event) => {
    event.preventDefault();
    try {
      await createStaffUser(staffForm);
      const response = await fetchUsers();
      const employees = (response?.data?.data || []).filter((entry) => entry.role === 'EMPLOYEE');
      setEmployeeOptions(employees);
      setStaffForm({ name: '', email: '', password: '' });
      setStaffError('');
      setStaffMessage('Staff user created successfully.');
    } catch (error) {
      setStaffMessage('');
      setStaffError(error.message || 'Unable to create staff user.');
    }
  };

  const handleAdvanceStatus = async (bookingId, currentStatus) => {
    if (role !== 'EMPLOYEE') return;

    const targetBooking = bookingRows.find((booking) => String(booking.id) === String(bookingId));
    const matchesAssignment = targetBooking && (
      !targetBooking.assignedEmployeeId ||
      String(targetBooking.assignedEmployeeId) === String(user?.id || '') ||
      String(targetBooking.assignedEmployeeUsername || '').toLowerCase() === String(user?.username || '').toLowerCase() ||
      String(targetBooking.assignedEmployeeEmployeeId || '').toUpperCase() === String(user?.employeeId || '').toUpperCase() ||
      String(targetBooking.employeeName || '').toLowerCase() === String(user?.name || '').toLowerCase()
    );

    if (!matchesAssignment) {
      setError('You can only accept jobs assigned to your account.');
      return;
    }

    const nextStatus = currentStatus === 'pending' ? 'accepted' : currentStatus === 'accepted' ? 'done' : 'done';
    const normalizedStatus = nextStatus === 'done' ? 'Completed' : nextStatus === 'accepted' ? 'In Progress' : 'Pending';

    try {
      await updateJob(bookingId, { status: normalizedStatus });
      await refreshBookingsData();
      if (nextStatus === 'done') {
        navigate(`/booking/upload/${bookingId}`);
      }
    } catch (error) {
      updateBookingStatus(bookingId, nextStatus);
    }
  };

  const validateVideoDuration = (file, maxMinutes = 30) => new Promise((resolve, reject) => {
    if (!file.type.startsWith('video/')) {
      resolve(true);
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      if (video.duration > maxMinutes * 60) {
        reject(new Error(`"${file.name}" exceeds the ${maxMinutes}-minute limit.`));
        return;
      }
      resolve(true);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error(`Unable to read video duration for "${file.name}".`));
    };
    video.src = URL.createObjectURL(file);
  });

  const handleManagedUsersLoad = async () => {
    try {
      const response = await fetchManagedUsers();
      const rows = response?.data?.data || [];
      setManagedUsers(rows);
    } catch (_error) {
      setManagedUsers([]);
    }
  };

  useEffect(() => {
    if (role === 'MANAGER') {
      handleManagedUsersLoad();
    }
  }, [role]);

  const handlePasswordReset = async (event) => {
    event.preventDefault();
    const { userId, password, confirmPassword } = passwordForm;
    if (!userId) {
      setUserPageError('Please select a user.');
      return;
    }
    if (!password || password.length < 6) {
      setUserPageError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setUserPageError('Passwords do not match.');
      return;
    }

    try {
      await updateManagedPassword(userId, password);
      setUserPageMessage('Password updated successfully.');
      setUserPageError('');
      setPasswordForm({ userId: '', password: '', confirmPassword: '' });
    } catch (error) {
      setUserPageError(error?.response?.data?.message || 'Unable to update password.');
      setUserPageMessage('');
    }
  };

  const handleAccountChange = async (event) => {
    event.preventDefault();
    const { username, currentPassword, newPassword, confirmPassword } = accountForm;

    if (!username || !username.trim()) {
      setUsernameError('Username cannot be empty.');
      setUsernameMessage('');
      return;
    }
    if (!currentPassword || !newPassword) {
      setUsernameError('Current password and new password are required.');
      setUsernameMessage('');
      return;
    }
    if (newPassword.length < 6) {
      setUsernameError('New password must be at least 6 characters long.');
      setUsernameMessage('');
      return;
    }
    if (newPassword !== confirmPassword) {
      setUsernameError('New passwords do not match.');
      setUsernameMessage('');
      return;
    }

    try {
      await updateMyProfile({ username, currentPassword, newPassword });
      setUsernameMessage('Username and password updated successfully.');
      setUsernameError('');
      setAccountForm((prev) => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (error) {
      setUsernameMessage('');
      setUsernameError(error?.response?.data?.message || 'Unable to update your account.');
    }
  };

  const handleUploadFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length || !bookingId) return;

    setUploading(true);
    setUploadProgress({});
    setError('');
    setActionMessage('');

    try {
      for (const file of files) {
        await validateVideoDuration(file);
      }

      const response = await uploadJobMedia(bookingId, files, (progressEvent) => {
        const total = progressEvent.total || 0;
        const loaded = progressEvent.loaded || 0;
        const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
        setUploadProgress({ overall: percent });
      });

      const updatedJob = response?.data?.data;
      if (updatedJob) {
        setJobs((prev) => prev.map((j) => (String(j._id || j.id) === String(updatedJob._id || updatedJob.id) ? updatedJob : j)));
      } else {
        await refreshBookingsData();
      }

      setActionMessage('Files uploaded successfully.');
    } catch (uploadError) {
      const message = uploadError?.response?.data?.message || uploadError.message || 'Upload failed.';
      setError(message);
    } finally {
      setUploading(false);
      setUploadProgress({});
      event.target.value = '';
    }
  };

  const handleFolderUpload = async (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file && typeof file.name === 'string');
    if (!files.length || !bookingId) return;

    const firstPath = files[0]?.webkitRelativePath || '';
    const folderName = firstPath.includes('/') ? firstPath.split('/')[0] : (files[0]?.name || 'Project-Media');
    const relativePaths = files.map((file) => {
      const relative = (file.webkitRelativePath || file.name || '').replace(/\\/g, '/');
      const cleanRelative = relative.startsWith(`${folderName}/`) ? relative : `${folderName}/${relative}`;
      return cleanRelative.replace(/^\/+/, '');
    });

    setUploading(true);
    setUploadProgress({});
    setError('');
    setActionMessage('');

    try {
      for (const file of files) {
        await validateVideoDuration(file);
      }

      const response = await uploadFolderMedia(bookingId, folderName, files, relativePaths, (progressEvent) => {
        const total = progressEvent.total || 0;
        const loaded = progressEvent.loaded || 0;
        const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
        setUploadProgress({ overall: percent });
      });

      const uploadedFolder = response?.data?.data?.folder || response?.data?.data;
      if (uploadedFolder) {
        setFolderUploads((prev) => [uploadedFolder, ...prev.filter((folder) => String(folder.id) !== String(uploadedFolder.id))]);
      }
      setActionMessage('Folder uploaded successfully.');
    } catch (uploadError) {
      const message = uploadError?.response?.data?.message || uploadError.message || 'Folder upload failed.';
      setError(message);
    } finally {
      setUploading(false);
      setUploadProgress({});
      event.target.value = '';
    }
  };



  const openEditBooking = (booking) => {
    setEditingBooking(booking);
    setEditForm({
      customerName: booking.customerName || '',
      date: booking.date || '',
      day: booking.day || '',
      dayTime: booking.dayTime || '',
      money: booking.money || '',
      employeeName: booking.employeeName || '',
      employeeIdentifier: booking.assignedEmployeeId || '',
      toolsAndProcess: booking.toolsAndProcess !== '—' ? booking.toolsAndProcess : ''
    });
  };

  const handleEditFormChange = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'date' && value) {
        next.day = formatDay(value);
      }
      return next;
    });
  };

  const handleUpdateBooking = async (event) => {
    event.preventDefault();
    if (!editingBooking?.id) return;

    const selectedEmployee = employeeOptions.find((employee) => String(employee._id || employee.id) === String(editForm.employeeIdentifier));
    const payload = {
      jobTitle: editForm.customerName,
      startDate: editForm.date,
      endDate: editForm.date,
      startTime: editForm.dayTime,
      budget: Number(editForm.money),
      assignedEmployeeId: editForm.employeeIdentifier || selectedEmployee?._id || selectedEmployee?.id || '',
      employeeName: selectedEmployee?.name || editForm.employeeName,
      username: selectedEmployee?.username || '',
      employeeId: selectedEmployee?.employeeId || '',
      tools: [],
      process: editForm.toolsAndProcess || ''
    };

    try {
      const response = await updateJob(editingBooking.id, payload);
      const updatedJob = response?.data?.data;
      if (updatedJob) {
        setJobs((prev) => prev.map((j) => (String(j._id || j.id) === String(updatedJob._id || updatedJob.id) ? updatedJob : j)));
      } else {
        await refreshBookingsData();
      }
      setEditingBooking(null);
      setEditForm(emptyForm);
      setError('');
      setActionMessage('Booking updated successfully.');
    } catch (updateError) {
      // Fallback: If job not in MongoDB database (e.g. local ID), update local storage
      try {
        const localBookings = JSON.parse(localStorage.getItem('mediaflow_bookings') || '[]');
        const updatedLocal = localBookings.map((b) => {
          if (String(b.id) === String(editingBooking.id)) {
            return {
              ...b,
              customerName: editForm.customerName,
              date: editForm.date,
              day: editForm.day || formatDay(editForm.date),
              dayTime: editForm.dayTime,
              money: Number(editForm.money).toFixed(2),
              employeeName: editForm.employeeName,
              toolsAndProcess: editForm.toolsAndProcess || '',
              process: editForm.toolsAndProcess || '',
              tools: []
            };
          }
          return b;
        });
        localStorage.setItem('mediaflow_bookings', JSON.stringify(updatedLocal));
        setBookings(updatedLocal);
        setEditingBooking(null);
        setEditForm(emptyForm);
        setError('');
        setActionMessage('Booking updated locally.');
      } catch (localErr) {
        setError(updateError?.response?.data?.message || 'Unable to update booking.');
      }
    }
  };

  const handleDeleteBooking = async () => {
    if (!deleteTarget?.id) return;

    const targetId = deleteTarget.id;
    try {
      await deleteJob(targetId);
      // Remove from local state immediately for instant UI feedback
      setJobs((prev) => prev.filter((j) => String(j._id || j.id) !== String(targetId)));
      setDeleteTarget(null);
      setError('');
      setActionMessage('Booking deleted successfully.');
    } catch (deleteError) {
      // Fallback: If job not in MongoDB database, delete from local storage
      try {
        const localBookings = JSON.parse(localStorage.getItem('mediaflow_bookings') || '[]');
        const filteredLocal = localBookings.filter((b) => String(b.id) !== String(targetId));
        localStorage.setItem('mediaflow_bookings', JSON.stringify(filteredLocal));
        setBookings(filteredLocal);
        setDeleteTarget(null);
        setError('');
        setActionMessage('Booking deleted locally.');
      } catch (localErr) {
        setError(deleteError?.response?.data?.message || 'Unable to delete booking.');
        setDeleteTarget(null);
      }
    }
  };

  const getBookingMedia = (booking) => {
    if (!booking) return [];
    const apiBase = getApiBase();

    if (Array.isArray(booking.uploadedFiles) && booking.uploadedFiles.length > 0) {
      return booking.uploadedFiles.map((file, index) => ({
        id: file.id || `uploaded-${index}`,
        name: file.name || 'Uploaded media',
        type: file.type || getMediaType(file.data || file.name || ''),
        data: file.data || '',
        uploadedBy: file.uploadedBy,
        uploadedAt: file.uploadedAt
      }));
    }

    if (Array.isArray(booking.attachments) && booking.attachments.length > 0) {
      return booking.attachments.map((file, idx) => mapAttachment(file, idx, apiBase)).filter(Boolean);
    }

    if (Array.isArray(booking.jobVideos) && booking.jobVideos.length > 0) {
      return booking.jobVideos.map((file, idx) => mapAttachment(file, idx, apiBase)).filter(Boolean);
    }

    if (booking.uploadedFileData) {
      return [{
        id: 'legacy-single',
        name: booking.uploadedFileName || 'Uploaded media',
        type: getMediaType(booking.uploadedFileData),
        data: booking.uploadedFileData
      }];
    }

    return [];
  };

  const canDeleteMedia = (media, currentUser) => {
    if (!currentUser) return false;
    if (currentUser.role === 'CEO') return true;
    if (currentUser.role === 'EMPLOYEE') {
      return !media?.uploadedBy || String(media.uploadedBy) === String(currentUser?._id || currentUser?.id || '');
    }
    return false;
  };

  const handleDownloadMedia = async (media) => {
    if (!media?.id || !media?.data) return;

    const activeBooking = bookingRows.find((job) => String(job.id) === String(bookingId)) || null;
    if (!activeBooking) return;

    try {
      const directUrl = typeof media.data === 'string' && media.data.trim().length > 0 ? media.data : null;
      const link = document.createElement('a');
      link.rel = 'noopener noreferrer';
      link.target = '_blank';

      if (directUrl) {
        link.href = directUrl;
        link.download = media.name || 'download';
      } else {
        const response = await downloadJobMedia(activeBooking.id, media.id);
        const url = window.URL.createObjectURL(new Blob([response.data], { type: response.headers?.['content-type'] || 'application/octet-stream' }));
        link.href = url;
        link.download = media.name || 'download';
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      }

      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      const directUrl = typeof media.data === 'string' && media.data.trim().length > 0 ? media.data : null;
      if (!directUrl) {
        setError('Download failed. The file could not be retrieved from storage.');
        return;
      }

      const fallbackLink = document.createElement('a');
      fallbackLink.href = directUrl;
      fallbackLink.download = media.name || 'download';
      fallbackLink.target = '_blank';
      fallbackLink.rel = 'noopener noreferrer';
      document.body.appendChild(fallbackLink);
      fallbackLink.click();
      fallbackLink.remove();
    }
  };

  const handleDeleteMedia = async (media) => {
    const activeBooking = bookingRows.find((job) => String(job.id) === String(bookingId)) || null;
    if (!media || !activeBooking) return;

    try {
      const response = await deleteJobMedia(activeBooking.id, media.id);
      const updatedJob = response?.data?.data;
      if (updatedJob) {
        setJobs((prev) => prev.map((job) => (String(job._id || job.id) === String(updatedJob._id || updatedJob.id) ? updatedJob : job)));
      } else {
        await refreshBookingsData();
      }
      setActionMessage('Media deleted successfully.');
      setError('');
      setSelectedMedia(null);
      setMediaDeleteTarget(null);
    } catch (deleteError) {
      const message = deleteError?.response?.data?.message || 'Unable to delete media.';
      setError(message);
      setMediaDeleteTarget(null);
    }
  };

  const loadFolderUploads = async (activeBookingId) => {
    if (!activeBookingId) {
      setFolderUploads([]);
      return;
    }

    setFolderLoading(true);
    try {
      const response = await listFolderMedia(activeBookingId);
      const nextFolders = response?.data?.data || [];
      setFolderUploads(nextFolders);
    } catch (_loadError) {
      setFolderUploads([]);
    } finally {
      setFolderLoading(false);
    }
  };

  const canDeleteFolder = (folder) => {
    if (!user) return false;
    if (user.role === 'CEO' || user.role === 'MANAGER') return false;
    return String(folder.employeeId || '') === String(user?._id || user?.id || '');
  };

  const handleFolderDownload = async (folder) => {
    if (!folder?.id) return;

    try {
      const response = await downloadFolderMedia(folder.id);
      const blob = new Blob([response.data], { type: response.headers?.['content-type'] || 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${folder.folderName || 'Project-Media'}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      setError(downloadError?.response?.data?.message || 'Folder download failed.');
    }
  };

  const handleFolderDelete = async (folder) => {
    if (!folder?.id) return;
    const confirmed = window.confirm(`Are you sure you want to delete this folder and all files inside it?\n\n${folder.folderName || 'Project-Media'}`);
    if (!confirmed) return;

    try {
      await deleteFolderMedia(folder.id);
      setFolderUploads((prev) => prev.filter((entry) => String(entry.id) !== String(folder.id)));
      setSelectedFolder(null);
      setError('');
      setActionMessage('Folder deleted successfully.');
    } catch (deleteError) {
      const message = deleteError?.response?.data?.message || 'Unable to delete this folder.';
      setError(message);
    }
  };

  const hasBookingMedia = (booking) => {
    if (!booking) return false;
    return getBookingMedia(booking).length > 0;
  };

  const employeeActivity = useMemo(() => {
    const employeeMap = new Map();

    bookingRows.forEach((booking) => {
      const employeeName = booking.employeeName || 'Unassigned';
      const employeeId = employeeName.toLowerCase();

      const current = employeeMap.get(employeeId) || {
        id: employeeId,
        name: employeeName,
        assignedJobs: 0,
        completedJobs: 0,
        inProgressJobs: 0,
        pendingJobs: 0,
        cancelledJobs: 0,
        uploadedCount: 0,
        totalHours: 0,
        completedDetails: []
      };

      current.assignedJobs += 1;
      const status = normalizeBookingStatus(booking.status);
      const mediaCount = getBookingMedia(booking).length;
      current.uploadedCount += mediaCount;

      if (status === 'done') {
        current.completedJobs += 1;
        current.completedDetails.push({
          title: booking.customerName || 'Untitled job',
          duration: 0,
          date: booking.date
        });
      } else if (status === 'accepted') {
        current.inProgressJobs += 1;
      } else if (status === 'pending') {
        current.pendingJobs += 1;
      } else if (status === 'cancelled') {
        current.cancelledJobs += 1;
      }

      employeeMap.set(employeeId, current);
    });

    return Array.from(employeeMap.values())
      .map((employee) => {
        const completionRate = employee.assignedJobs > 0
          ? Number(((employee.completedJobs / employee.assignedJobs) * 100).toFixed(1))
          : 0;

        return {
          ...employee,
          completionRate,
          productivity: `${completionRate}%`,
          totalHours: Number(employee.totalHours.toFixed(1))
        };
      })
      .sort((a, b) => b.completedJobs - a.completedJobs || b.uploadedCount - a.uploadedCount || a.name.localeCompare(b.name));
  }, [bookingRows]);

  const liveSummary = useMemo(() => {
    const pendingJobs = bookingRows.filter((booking) => normalizeBookingStatus(booking.status) === 'pending').length;
    const acceptedJobs = bookingRows.filter((booking) => normalizeBookingStatus(booking.status) === 'accepted').length;
    const completedJobs = bookingRows.filter((booking) => normalizeBookingStatus(booking.status) === 'done').length;
    const totalRevenue = bookingRows.reduce((sum, booking) => {
      const value = Number(booking.money || 0);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);

    return {
      pendingJobs,
      acceptedJobs,
      completedJobs,
      totalRevenue: Number(totalRevenue.toFixed(2))
    };
  }, [bookingRows]);

  const activityTrend = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const lastSixMonths = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: `${monthNames[date.getMonth()]} ${date.getFullYear()}`
      };
    });

    return lastSixMonths.map((month) => ({
      ...month,
      values: employeeActivity.map((employee) => {
        const count = bookingRows.filter((booking) => {
          if (normalizeBookingStatus(booking.status) !== 'done') return false;
          if ((booking.employeeName || 'Unassigned').toLowerCase() !== employee.id) return false;
          const completedDate = new Date(booking.date || Date.now());
          return `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}` === month.key;
        }).length;

        return {
          employee: employee.name,
          value: count
        };
      })
    }));
  }, [bookingRows, employeeActivity]);

  if (mode === 'employee-activity') {
    const maxCompleted = Math.max(1, ...employeeActivity.map((employee) => employee.completedJobs));

    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Performance</p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Employee Activity</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard/manager')}
            className="rounded-lg sm:rounded-xl border border-slate-200 bg-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap w-full md:w-auto"
          >
            Back to Overview
          </button>
        </div>

        <div className="grid gap-3 sm:gap-4 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 md:p-5 shadow-sm">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Employees</p>
            <div className="mt-3 sm:mt-4 md:mt-5 text-2xl sm:text-3xl font-bold text-slate-900">{employeeActivity.length}</div>
          </div>
          <div className="rounded-lg sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 md:p-5 shadow-sm">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Completed jobs</p>
            <div className="mt-3 sm:mt-4 md:mt-5 text-2xl sm:text-3xl font-bold text-slate-900">{employeeActivity.reduce((sum, employee) => sum + employee.completedJobs, 0)}</div>
          </div>
          <div className="rounded-lg sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 md:p-5 shadow-sm">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">In progress</p>
            <div className="mt-3 sm:mt-4 md:mt-5 text-2xl sm:text-3xl font-bold text-slate-900">{employeeActivity.reduce((sum, employee) => sum + employee.inProgressJobs, 0)}</div>
          </div>
          <div className="rounded-lg sm:rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 md:p-5 shadow-sm">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Avg productivity</p>
            <div className="mt-3 sm:mt-4 md:mt-5 text-2xl sm:text-3xl font-bold text-slate-900">
              {employeeActivity.length
                ? `${(employeeActivity.reduce((sum, employee) => sum + employee.completionRate, 0) / employeeActivity.length).toFixed(1)}%`
                : '0%'}}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">6-Month completion trend</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Updated live</span>
          </div>

          <svg viewBox="0 0 760 260" className="h-64 w-full overflow-visible">
            {[0, 25, 50, 75, 100].map((tick) => (
              <g key={tick}>
                <line x1="60" y1={220 - (tick / 100) * 160} x2="710" y2={220 - (tick / 100) * 160} stroke="#e2e8f0" strokeDasharray="4 6" />
                <text x="14" y={224 - (tick / 100) * 160} fill="#64748b" fontSize="11">{tick}</text>
              </g>
            ))}

            {activityTrend.map((month, index) => (
              <text key={month.key} x={90 + index * 110} y="242" fill="#64748b" fontSize="11">{month.label.split(' ')[0]}</text>
            ))}

            {employeeActivity.slice(0, 5).map((employee, index) => {
              const color = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'][index % 6];
              const points = activityTrend.map((month, monthIndex) => {
                const value = month.values.find((entry) => entry.employee === employee.name)?.value || 0;
                const x = 90 + monthIndex * 110;
                const y = 220 - (value / Math.max(1, maxCompleted)) * 160;
                return `${x},${y}`;
              }).join(' ');

              return (
                <g key={employee.id}>
                  <polyline fill="none" stroke={color} strokeWidth="3" points={points} />
                  {activityTrend.map((month, monthIndex) => {
                    const value = month.values.find((entry) => entry.employee === employee.name)?.value || 0;
                    const x = 90 + monthIndex * 110;
                    const y = 220 - (value / Math.max(1, maxCompleted)) * 160;
                    return (
                      <g key={`${employee.id}-${month.key}`}>
                        <circle cx={x} cy={y} r="4.5" fill={color} />
                        <text x={x - 8} y={y - 10} fill="#0f172a" fontSize="10">{value}</text>
                      </g>
                    );
                  })}
                  <text x="630" y={20 + index * 18} fill={color} fontSize="11" fontWeight="600">{employee.name}</text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Productivity by employee</h2>
            <span className="text-xs font-medium text-slate-500">Assigned vs completed</span>
          </div>

          <div className="space-y-4">
            {employeeActivity.map((employee) => (
              <div key={employee.id} className="space-y-2">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-semibold text-slate-800">{employee.name}</span>
                  <span className="text-slate-500">{employee.completedJobs} completed · {employee.uploadedCount} uploads · {employee.completionRate}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#1d74d2] to-[#10b981]"
                    style={{ width: `${Math.min(employee.completionRate, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Employee statistics</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Live data</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-left">
              <thead>
                <tr className="text-sm text-slate-500">
                  <th className="px-3 py-2 font-medium">Employee</th>
                  <th className="px-3 py-2 font-medium">Assigned Jobs</th>
                  <th className="px-3 py-2 font-medium">Completed</th>
                  <th className="px-3 py-2 font-medium">Uploads</th>
                  <th className="px-3 py-2 font-medium">In Progress</th>
                  <th className="px-3 py-2 font-medium">Pending</th>
                  <th className="px-3 py-2 font-medium">Cancelled</th>
                  <th className="px-3 py-2 font-medium">Job Duration</th>
                  <th className="px-3 py-2 font-medium">Working Hours</th>
                  <th className="px-3 py-2 font-medium">Productivity</th>
                </tr>
              </thead>
              <tbody>
                {employeeActivity.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-3 py-8 text-center text-slate-500">
                      No employee activity available yet.
                    </td>
                  </tr>
                ) : (
                  employeeActivity.map((employee) => (
                    <tr key={employee.id} className="rounded-2xl bg-slate-50 text-slate-700">
                      <td className="rounded-l-2xl px-3 py-3 font-semibold text-slate-800">{employee.name}</td>
                      <td className="px-3 py-3">{employee.assignedJobs}</td>
                      <td className="px-3 py-3">{employee.completedJobs}</td>
                      <td className="px-3 py-3">{employee.uploadedCount}</td>
                      <td className="px-3 py-3">{employee.inProgressJobs}</td>
                      <td className="px-3 py-3">{employee.pendingJobs}</td>
                      <td className="px-3 py-3">{employee.cancelledJobs || 0}</td>
                      <td className="px-3 py-3">
                        {employee.completedDetails.length > 0
                          ? employee.completedDetails.map((job) => `${job.title} (${job.duration}h)`).join(', ')
                          : '—'}
                      </td>
                      <td className="px-3 py-3">{employee.totalHours}h</td>
                      <td className="rounded-r-2xl px-3 py-3">{employee.productivity}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'booking-form') {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Manager</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Booking Jobs</h1>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Customer Name</span>
              <input
                type="text"
                name="customerName"
                value={form.customerName}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-[#1d74d2]"
                placeholder="Enter customer name"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Date</span>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-[#1d74d2]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Day</span>
              <input
                type="text"
                name="day"
                value={form.day}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-[#1d74d2]"
                placeholder="Auto-filled by date"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Day Time</span>
              <input
                type="text"
                name="dayTime"
                value={form.dayTime}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-[#1d74d2]"
                placeholder="e.g. 10:00 AM"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Money</span>
              <input
                type="number"
                name="money"
                value={form.money}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-[#1d74d2]"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </label>

            <label className="block md:col-span-2 xl:col-span-3">
              <span className="mb-2 block text-sm font-medium text-slate-700">Tools &amp; Process</span>
              <textarea
                name="toolsAndProcess"
                value={form.toolsAndProcess}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-[#1d74d2]"
                placeholder="e.g. Camera, Mic, Lighting — describe the production process here"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Assigned Employee</span>
              <select
                name="employeeIdentifier"
                value={form.employeeIdentifier}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 outline-none focus:border-[#1d74d2]"
              >
                <option value="">Select an employee</option>
                {employeeOptions.map((employee) => (
                  <option key={employee._id || employee.id} value={employee._id || employee.id}>
                    {employee.name} {employee.username ? `(${employee.username})` : ''} {employee.employeeId ? `- ${employee.employeeId}` : ''}
                  </option>
                ))}
              </select>
            </label>

            {error && (
              <div className="md:col-span-2 xl:col-span-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="md:col-span-2 xl:col-span-3 flex justify-end">
              <button
                type="submit"
                className="rounded-xl bg-[#1d74d2] px-5 py-3 font-semibold text-white hover:bg-[#185fb5]"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (mode === 'booking-view') {
    // Columns: Customer Name, Date, Day, Day Time, [Money], Employee Name, Status, Tools & Process, Upload, [Actions]
    const totalColumns = 8 + (role === 'MANAGER' ? 2 : 0);

    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Booking</p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 break-words">View Booking</h1>
          </div>
          <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-end w-full sm:w-auto">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by customer or employee"
              className="w-full sm:w-64 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:py-2.5 text-xs sm:text-sm outline-none focus:border-[#1d74d2] focus:ring-2 focus:ring-[#1d74d2]/20"
            />
            <select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value)}
              className="w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:py-2.5 text-xs sm:text-sm outline-none focus:border-[#1d74d2] focus:ring-2 focus:ring-[#1d74d2]/20"
            >
              <option value="date">Sort by date</option>
              <option value="employeeName">Sort by employee</option>
            </select>
          </div>
        </div>

        {(error || actionMessage) && (
          <div className={`rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm ${error ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
            {error || actionMessage}
          </div>
        )}

        <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-3 sm:p-4 md:p-6 shadow-sm overflow-hidden">
          <div className="overflow-x-auto -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6">
            <table className="min-w-full border-separate border-spacing-y-2 text-left text-xs sm:text-sm">
              <thead>
                <tr className="text-xs sm:text-sm text-slate-500">
                  <th className="px-2 sm:px-3 py-2 font-medium whitespace-nowrap">Customer Name</th>
                  <th className="px-2 sm:px-3 py-2 font-medium whitespace-nowrap">Date</th>
                  <th className="px-2 sm:px-3 py-2 font-medium whitespace-nowrap">Day</th>
                  <th className="px-2 sm:px-3 py-2 font-medium whitespace-nowrap">Day Time</th>
                  {role === 'MANAGER' && <th className="px-2 sm:px-3 py-2 font-medium whitespace-nowrap">Money</th>}
                  <th className="px-2 sm:px-3 py-2 font-medium whitespace-nowrap">Employee Name</th>
                  <th className="px-2 sm:px-3 py-2 font-medium whitespace-nowrap">Status</th>
                  <th className="px-2 sm:px-3 py-2 font-medium whitespace-nowrap">Tools &amp; Process</th>
                  <th className="px-2 sm:px-3 py-2 font-medium whitespace-nowrap">Uploads</th>
                  {role === 'MANAGER' && <th className="px-2 sm:px-3 py-2 font-medium whitespace-nowrap">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {jobsLoading ? (
                  <tr>
                    <td colSpan={totalColumns} className="px-2 sm:px-3 py-6 sm:py-8 text-center text-xs sm:text-sm text-slate-500">
                      Loading bookings...
                    </td>
                  </tr>
                ) : filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={totalColumns} className="px-2 sm:px-3 py-6 sm:py-8 text-center text-xs sm:text-sm text-slate-500">
                      No booking records found.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((booking, index) => {
                    const currentStatus = normalizeBookingStatus(booking.status);
                    const statusMeta = statusMap[currentStatus] || statusMap.pending;
                    const matchesAssignment = role === 'EMPLOYEE' && (
                      !booking.assignedEmployeeId ||
                      String(booking.assignedEmployeeId) === String(user?.id || '') ||
                      String(booking.assignedEmployeeUsername || '').toLowerCase() === String(user?.username || '').toLowerCase() ||
                      String(booking.assignedEmployeeEmployeeId || '').toUpperCase() === String(user?.employeeId || '').toUpperCase() ||
                      String(booking.employeeName || '').toLowerCase() === String(user?.name || '').toLowerCase()
                    );
                    const canAdvance = role === 'EMPLOYEE' && matchesAssignment && currentStatus !== 'done';
                    const mediaExists = hasBookingMedia(booking);
                    const jobVideos = Array.isArray(booking.jobVideos) ? booking.jobVideos : [];

                    return (
                      <tr key={`${booking.id || `${booking.customerName}-${booking.date}-${index}`}`} className="rounded-lg sm:rounded-2xl bg-slate-50 text-slate-700 text-xs sm:text-sm">
                        <td className="rounded-l-lg sm:rounded-l-2xl px-2 sm:px-3 py-2 sm:py-3 truncate">{booking.customerName}</td>
                        <td className="px-2 sm:px-3 py-2 sm:py-3 truncate">{booking.date}</td>
                        <td className="px-2 sm:px-3 py-2 sm:py-3 truncate">{booking.day}</td>
                        <td className="px-2 sm:px-3 py-2 sm:py-3 truncate">{booking.dayTime}</td>
                        {role === 'MANAGER' && <td className="px-2 sm:px-3 py-2 sm:py-3 truncate">${Number(booking.money || 0).toFixed(2)}</td>}
                        <td className="px-2 sm:px-3 py-2 sm:py-3 truncate">{booking.employeeName}</td>
                        <td className="px-2 sm:px-3 py-2 sm:py-3">
                          <button
                            type="button"
                            disabled={!canAdvance}
                            onClick={() => handleAdvanceStatus(booking.id, currentStatus)}
                            className={`inline-flex items-center justify-center rounded-full px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold text-white shadow-sm transition whitespace-nowrap ${statusMeta.button} ${!canAdvance ? 'cursor-default opacity-100' : ''}`}
                          >
                            {statusMeta.label}
                          </button>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-3 max-w-[120px] sm:max-w-[200px]">
                          <span className="block truncate text-[10px] sm:text-xs" title={booking.toolsAndProcess !== '—' ? booking.toolsAndProcess : ''}>
                            {booking.toolsAndProcess || '—'}
                          </span>
                        </td>
                        <td className={`px-2 sm:px-3 py-2 sm:py-3 ${role !== 'MANAGER' ? 'rounded-r-lg sm:rounded-r-2xl' : ''}`}>
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/booking/upload/${booking.id}`)}
                              className="rounded-lg bg-[#1d74d2] px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-semibold text-white hover:bg-[#185fb5] whitespace-nowrap"
                            >
                              Open
                            </button>
                            {mediaExists && (
                              <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-emerald-700 whitespace-nowrap">
                                Uploaded
                              </span>
                            )}
                          </div>
                        </td>
                        {role === 'MANAGER' && (
                          <td className="rounded-r-lg sm:rounded-r-2xl px-2 sm:px-3 py-2 sm:py-3">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                              <button
                                type="button"
                                onClick={() => openEditBooking(booking)}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                              >
                                Update
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(booking)}
                                className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-red-700 hover:bg-red-100 whitespace-nowrap"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {editingBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/75 p-3 sm:p-4">
            <div className="w-full max-w-2xl sm:max-w-3xl rounded-lg sm:rounded-3xl border border-slate-200 bg-white shadow-2xl">
              <div className="sticky top-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 border-b border-slate-200 bg-white px-4 sm:px-6 py-3 sm:py-4">
                <h2 className="text-base sm:text-xl font-semibold text-slate-900">Update Booking</h2>
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="self-end sm:self-center rounded-full bg-slate-100 px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
              <div className="overflow-y-auto max-h-[calc(100vh-120px)] px-4 sm:px-6 py-4 sm:py-5">
                <form onSubmit={handleUpdateBooking} className="grid gap-3 sm:gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs sm:text-sm font-medium text-slate-700">Customer Name</span>
                    <input type="text" name="customerName" value={editForm.customerName} onChange={handleEditFormChange} className="w-full rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:py-3 text-xs sm:text-sm outline-none focus:border-[#1d74d2]" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs sm:text-sm font-medium text-slate-700">Date</span>
                    <input type="date" name="date" value={editForm.date} onChange={handleEditFormChange} className="w-full rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:py-3 text-xs sm:text-sm outline-none focus:border-[#1d74d2]" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs sm:text-sm font-medium text-slate-700">Day Time</span>
                    <input type="text" name="dayTime" value={editForm.dayTime} onChange={handleEditFormChange} className="w-full rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:py-3 text-xs sm:text-sm outline-none focus:border-[#1d74d2]" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs sm:text-sm font-medium text-slate-700">Money</span>
                    <input type="number" name="money" value={editForm.money} onChange={handleEditFormChange} min="0" step="0.01" className="w-full rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:py-3 text-xs sm:text-sm outline-none focus:border-[#1d74d2]" />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-xs sm:text-sm font-medium text-slate-700">Assigned Employee</span>
                    <select name="employeeIdentifier" value={editForm.employeeIdentifier} onChange={handleEditFormChange} className="w-full rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:py-3 text-xs sm:text-sm outline-none focus:border-[#1d74d2]">
                      <option value="">Select an employee</option>
                      {employeeOptions.map((employee) => (
                        <option key={employee._id || employee.id} value={employee._id || employee.id}>
                          {employee.name} {employee.username ? `(${employee.username})` : ''} {employee.employeeId ? `- ${employee.employeeId}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-xs sm:text-sm font-medium text-slate-700">Tools &amp; Process</span>
                    <textarea name="toolsAndProcess" value={editForm.toolsAndProcess || ''} onChange={handleEditFormChange} rows={3} className="w-full rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:py-3 text-xs sm:text-sm outline-none focus:border-[#1d74d2]" placeholder="e.g. Camera, Mic, Lighting — describe the production process here" />
                  </label>
                  <div className="md:col-span-2 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                    <button type="button" onClick={() => setEditingBooking(null)} className="rounded-lg sm:rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap">Cancel</button>
                    <button type="submit" className="rounded-lg sm:rounded-xl bg-[#1d74d2] px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#185fb5] whitespace-nowrap">Save Changes</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/75 p-3 sm:p-4">
            <div className="w-full max-w-md sm:max-w-lg rounded-lg sm:rounded-3xl border border-slate-200 bg-white shadow-2xl">
              <div className="px-4 sm:px-6 py-4 sm:py-6">
                <h2 className="text-base sm:text-xl font-semibold text-slate-900">Delete Booking</h2>
                <p className="mt-3 text-xs sm:text-sm text-slate-600">
                  Are you sure you want to delete the booking for <span className="font-semibold">{deleteTarget.customerName}</span>? This action cannot be undone.
                </p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 border-t border-slate-200 bg-slate-50 px-4 sm:px-6 py-3 sm:py-4">
                <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-lg sm:rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap">Cancel</button>
                <button type="button" onClick={handleDeleteBooking} className="rounded-lg sm:rounded-xl bg-red-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-red-700 whitespace-nowrap">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'booking-upload') {
    const activeBooking = bookingRows.find((booking) => String(booking.id) === String(bookingId)) || getBookingById(bookingId);
    const currentMedia = activeBooking ? getBookingMedia(activeBooking) : [];
    const uploadedFolders = folderUploads.filter((folder) => String(folder.bookingId) === String(activeBooking?.id || bookingId || ''));
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Booking upload</p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 break-words">Upload Files</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate('/booking/view')}
            className="rounded-lg sm:rounded-xl border border-slate-200 bg-white px-3 sm:px-4 py-2 sm:py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap w-full sm:w-auto"
          >
            {isManagerViewOnly ? 'Back to View Bookings' : 'Back to View Booking'}
          </button>
        </div>

        {activeBooking ? (
          <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
            <div className="mb-4 sm:mb-6 rounded-lg sm:rounded-2xl bg-slate-50 p-3 sm:p-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-600">
                <span className="font-semibold text-slate-800">Customer:</span>
                <span className="truncate">{activeBooking.customerName || 'N/A'}</span>
                <span className="hidden sm:inline text-slate-400">•</span>
                <span className="font-semibold text-slate-800">Date:</span>
                <span className="truncate">{activeBooking.date || 'N/A'}</span>
                <span className="hidden sm:inline text-slate-400">•</span>
                <span className="font-semibold text-slate-800">Employee:</span>
                <span className="truncate">{activeBooking.employeeName || 'N/A'}</span>
              </div>
            </div>

            {isEmployeeUnauthorized ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <span className="text-2xl">🔒</span>
                </div>
                <h3 className="text-base font-semibold text-red-800">Access Denied</h3>
                <p className="mt-2 text-xs sm:text-sm text-red-600">
                  This job is assigned to <strong>{activeBooking.employeeName}</strong>. You can only work on jobs assigned to your account.
                </p>
              </div>
            ) : (
              <>
                {(error || actionMessage) && (
                  <div className={`mb-4 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm ${error ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
                    {error || actionMessage}
                  </div>
                )}

                {!isManagerViewOnly && (
                  <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                    <label className="flex cursor-pointer items-center justify-center rounded-lg sm:rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 sm:py-8 text-center text-xs sm:text-sm font-medium text-slate-700 hover:border-[#1d74d2] hover:bg-slate-100">
                      <input type="file" accept="image/*,video/*" multiple onChange={handleUploadFiles} className="hidden" />
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-xl sm:text-2xl">📁</span>
                        <span className="font-semibold">Choose Files</span>
                        <span className="text-[10px] sm:text-xs text-slate-500">Upload individual images or videos</span>
                      </div>
                    </label>

                    <label className="flex cursor-pointer items-center justify-center rounded-lg sm:rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 sm:py-8 text-center text-xs sm:text-sm font-medium text-slate-700 hover:border-[#1d74d2] hover:bg-slate-100">
                      <input type="file" accept="image/*,video/*" multiple webkitdirectory="" directory="" onChange={handleFolderUpload} className="hidden" />
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-xl sm:text-2xl">🗂️</span>
                        <span className="font-semibold">Choose Folder</span>
                        <span className="text-[10px] sm:text-xs text-slate-500">Upload an entire folder of media</span>
                      </div>
                    </label>
                  </div>
                )}

                {uploading && (
                  <div className="mt-4 rounded-lg sm:rounded-xl bg-slate-100 px-3 sm:px-3 py-2 text-[10px] sm:text-xs text-slate-600">
                    Uploading… {uploadProgress.overall ? `${uploadProgress.overall}%` : ''}
                  </div>
                )}

                {isManagerViewOnly && (
                  <div className="mb-4 rounded-lg sm:rounded-2xl border border-sky-200 bg-sky-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-sky-700">
                    Managers can view uploaded employee media for this booking but cannot upload or replace files here.
                  </div>
                )}

                {uploadedFolders.length > 0 && (
                  <div className="mt-4 sm:mt-6 space-y-4">
                    <h2 className="text-base sm:text-lg font-semibold text-slate-900">Uploaded Folders ({uploadedFolders.length})</h2>
                    <div className="space-y-2 sm:space-y-3">
                      {uploadedFolders.map((folder) => (
                        <div key={folder.id} className="rounded-lg sm:rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4 shadow-sm">
                          <div className="flex flex-col gap-2 sm:gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 text-sm sm:text-base font-semibold text-slate-800">
                                <span>📁</span>
                                <span className="truncate">{folder.folderName || 'Project-Media'}</span>
                              </div>
                              <div className="mt-1 text-[10px] sm:text-xs text-slate-500">
                                {folder.fileCount || 0} Files · {folder.imageCount || 0} Images · {folder.videoCount || 0} Videos
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                              <button type="button" onClick={() => setSelectedFolder(folder)} className="rounded-lg border border-slate-200 bg-white px-2 sm:px-2.5 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap">
                                Open
                              </button>
                              <button type="button" onClick={() => handleFolderDownload(folder)} className="rounded-lg border border-slate-200 bg-white px-2 sm:px-2.5 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap">
                                Download
                              </button>
                              {role === 'EMPLOYEE' && canDeleteFolder(folder) && (
                                <button type="button" onClick={() => handleFolderDelete(folder)} className="rounded-lg border border-red-200 bg-red-50 px-2 sm:px-2.5 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-red-700 hover:bg-red-100 whitespace-nowrap">
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentMedia.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Uploaded Media ({currentMedia.length})</h2>
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {currentMedia.map((media, index) => (
                        <div
                          key={`${media.id || media.name}-${index}`}
                          className="overflow-hidden rounded-lg sm:rounded-2xl border border-slate-200 bg-slate-50 text-left shadow-sm transition hover:border-[#1d74d2] hover:shadow-md"
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedMedia(media)}
                            className="block h-32 sm:h-40 lg:h-44 w-full overflow-hidden bg-slate-100 text-left"
                          >
                            {media.type === 'image' ? (
                              <img src={media.data} alt={media.name} className="h-full w-full object-cover" />
                            ) : media.type === 'video' ? (
                              <>
                                <video src={media.data} muted playsInline preload="metadata" className="h-full w-full object-cover bg-black" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white">
                                    ▶
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="flex h-full items-center justify-center px-3 text-center text-xs font-medium text-slate-600">
                                📄 {media.name}
                              </div>
                            )}
                            <div className="absolute top-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold uppercase text-white">
                              {media.type || 'file'}
                            </div>
                          </button>
                          <div className="px-2 sm:px-3 py-2 sm:py-2 text-xs sm:text-sm font-medium text-slate-700">
                            <p className="truncate">{media.name}</p>
                            <p className="mt-0.5 text-[10px] sm:text-xs font-normal text-slate-500">
                              {media.uploadedAt ? new Date(media.uploadedAt).toLocaleString() : 'Just uploaded'}
                            </p>
                            <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                              <button
                                type="button"
                                onClick={() => handleDownloadMedia(media)}
                                className="rounded-lg border border-slate-200 bg-white px-2 sm:px-2.5 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                              >
                                Download
                              </button>
                              {canDeleteMedia(media, user) && (
                                <button
                                  type="button"
                                  onClick={() => setMediaDeleteTarget(media)}
                                  className="rounded-lg border border-red-200 bg-red-50 px-2 sm:px-2.5 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-semibold text-red-700 hover:bg-red-100 whitespace-nowrap"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentMedia.length === 0 && uploadedFolders.length === 0 && (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                    {isManagerViewOnly ? 'No employee uploads are available for this booking yet.' : 'No media has been uploaded for this booking yet.'}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
            Booking not found.
          </div>
        )}

        {selectedFolder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-4">
            <div className="relative w-full max-w-5xl rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl">
              <button
                type="button"
                onClick={() => setSelectedFolder(null)}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-700 transition hover:bg-slate-200"
                aria-label="Close folder preview"
              >
                ×
              </button>

              <div className="mt-8 sm:mt-10 mb-4">
                <div className="flex items-center gap-2 text-lg sm:text-xl font-semibold text-slate-900">
                  <span>📁</span>
                  <span className="truncate">{selectedFolder.folderName || 'Project-Media'}</span>
                </div>
                <div className="mt-1 text-[10px] sm:text-xs text-slate-500">
                  {selectedFolder.fileCount || 0} files · {selectedFolder.imageCount || 0} images · {selectedFolder.videoCount || 0} videos
                </div>
              </div>

              <div className="grid max-h-[70vh] gap-2 sm:gap-3 overflow-y-auto p-1 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {(selectedFolder.files || []).map((file) => {
                  const isImage = String(file.contentType || '').startsWith('image/');
                  const isVideo = String(file.contentType || '').startsWith('video/');
                  const previewUrl = `${(process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '')}/api/uploads/file/${file.fileId || file.id}`;

                  return (
                    <div key={file.id} className="rounded-lg sm:rounded-2xl border border-slate-200 bg-slate-50 p-2 sm:p-3 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setSelectedMedia({
                          id: file.id,
                          name: file.fileName,
                          type: isImage ? 'image' : isVideo ? 'video' : 'file',
                          data: previewUrl,
                          uploadedAt: file.uploadedAt
                        })}
                        className="block h-32 sm:h-40 w-full overflow-hidden rounded-lg bg-slate-100"
                      >
                        {isImage ? (
                          <img src={previewUrl} alt={file.fileName} className="h-full w-full object-cover" />
                        ) : isVideo ? (
                          <div className="relative flex h-full items-center justify-center bg-black">
                            <video src={previewUrl} muted playsInline preload="metadata" className="h-full w-full object-cover opacity-80" />
                            <div className="absolute flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white">▶</div>
                          </div>
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] sm:text-xs font-medium text-slate-600 px-2">📄 {file.fileName}</div>
                        )}
                      </button>

                      <div className="mt-2 sm:mt-3 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1 text-left">
                          <p className="truncate text-xs sm:text-sm font-medium text-slate-700">{file.fileName}</p>
                          <p className="mt-0.5 text-[10px] text-slate-500 truncate">{file.relativePath || file.fileName}</p>
                        </div>
                        <a href={previewUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 bg-white px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-[11px] font-semibold text-slate-700 hover:bg-slate-100 flex-shrink-0 whitespace-nowrap">
                          Open
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {selectedMedia && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-4">
            <div className="relative w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl">
              <button
                type="button"
                onClick={() => setSelectedMedia(null)}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-700 transition hover:bg-slate-200"
                aria-label="Close media preview"
              >
                ×
              </button>

              <div className="mt-10 flex max-h-[75vh] items-center justify-center overflow-hidden rounded-2xl bg-slate-100 p-2">
                {selectedMedia.type === 'image' ? (
                  <img src={selectedMedia.data} alt={selectedMedia.name} className="max-h-[70vh] w-full rounded-xl object-contain" />
                ) : selectedMedia.type === 'video' ? (
                  <video src={selectedMedia.data} controls playsInline className="max-h-[70vh] w-full rounded-xl bg-black object-contain" />
                ) : (
                  <div className="p-6 text-center text-slate-600">Unsupported media type</div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => handleDownloadMedia(selectedMedia)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Download
                </button>
                {canDeleteMedia(selectedMedia, user) && (
                  <button
                    type="button"
                    onClick={() => setMediaDeleteTarget(selectedMedia)}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                  >
                    Delete
                  </button>
                )}
              </div>

              <p className="mt-4 text-center text-sm font-medium text-slate-700">{selectedMedia.name}</p>
            </div>
          </div>
        )}

        {mediaDeleteTarget && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-900/75 p-3 sm:p-4">
            <div className="w-full max-w-md sm:max-w-lg rounded-lg sm:rounded-3xl border border-slate-200 bg-white shadow-2xl">
              <div className="px-4 sm:px-6 py-4 sm:py-6">
                <h2 className="text-base sm:text-xl font-semibold text-slate-900">Delete media</h2>
                <p className="mt-3 text-xs sm:text-sm text-slate-600">
                  Are you sure you want to delete <span className="font-semibold">{mediaDeleteTarget.name}</span>? This removes the file from storage and the booking record.
                </p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 border-t border-slate-200 bg-slate-50 px-4 sm:px-6 py-3 sm:py-4">
                <button
                  type="button"
                  onClick={() => setMediaDeleteTarget(null)}
                  className="rounded-lg sm:rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteMedia(mediaDeleteTarget)}
                  className="rounded-lg sm:rounded-xl border border-red-200 bg-red-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-red-700 whitespace-nowrap"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'staff-create') {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Manager</p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Create Staff User</h1>
        </div>

        <div className="rounded-lg sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <form onSubmit={handleCreateStaffUser} className="grid gap-3 sm:gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-2 block text-xs sm:text-sm font-medium text-slate-700">Full Name</span>
              <input
                type="text"
                name="name"
                value={staffForm.name}
                onChange={handleStaffFormChange}
                className="w-full rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:py-3 text-xs sm:text-sm outline-none focus:border-[#1d74d2]"
                placeholder="Enter staff full name"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs sm:text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                name="email"
                value={staffForm.email}
                onChange={handleStaffFormChange}
                className="w-full rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:py-3 text-xs sm:text-sm outline-none focus:border-[#1d74d2]"
                placeholder="staff@company.com"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs sm:text-sm font-medium text-slate-700">Password</span>
              <input
                type="password"
                name="password"
                value={staffForm.password}
                onChange={handleStaffFormChange}
                className="w-full rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:py-3 text-xs sm:text-sm outline-none focus:border-[#1d74d2]"
                placeholder="Create a password"
              />
            </label>

            {(staffError || staffMessage) && (
              <div className={`md:col-span-2 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm ${staffError ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {staffError || staffMessage}
              </div>
            )}

            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className="rounded-lg sm:rounded-xl bg-[#1d74d2] px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white hover:bg-[#185fb5] whitespace-nowrap">
                Create Staff User
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (mode === 'user-management') {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Manager</p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Usernames</h1>
        </div>

        <div className="rounded-lg sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <div className="mb-4 sm:mb-5 flex items-center justify-between">
            <h2 className="text-base sm:text-xl font-semibold text-slate-900">Managed staff accounts</h2>
          </div>

          {(userPageError || userPageMessage) && (
            <div className={`mb-4 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm ${userPageError ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
              {userPageError || userPageMessage}
            </div>
          )}

          <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
            <table className="min-w-full border-separate border-spacing-y-2 text-left">
              <thead>
                <tr className="text-xs sm:text-sm text-slate-500">
                  <th className="px-2 sm:px-3 py-2 font-medium whitespace-nowrap">Full Name</th>
                  <th className="px-2 sm:px-3 py-2 font-medium whitespace-nowrap">Username</th>
                  <th className="px-2 sm:px-3 py-2 font-medium whitespace-nowrap">Role</th>
                  <th className="px-2 sm:px-3 py-2 font-medium whitespace-nowrap">Account Status</th>
                  <th className="px-2 sm:px-3 py-2 font-medium whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {managedUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-2 sm:px-3 py-6 sm:py-8 text-center text-xs sm:text-sm text-slate-500">No managed staff accounts found.</td>
                  </tr>
                ) : (
                  managedUsers.map((userItem) => (
                    <tr key={userItem._id || userItem.id} className="rounded-lg sm:rounded-2xl bg-slate-50 text-xs sm:text-sm text-slate-700">
                      <td className="rounded-l-lg sm:rounded-l-2xl px-2 sm:px-3 py-2 sm:py-3 font-semibold text-slate-800 truncate">{userItem.name}</td>
                      <td className="px-2 sm:px-3 py-2 sm:py-3 truncate">{userItem.username || '—'}</td>
                      <td className="px-2 sm:px-3 py-2 sm:py-3 truncate">{userItem.role}</td>
                      <td className="px-2 sm:px-3 py-2 sm:py-3 truncate">{userItem.status || 'ACTIVE'}</td>
                      <td className="rounded-r-lg sm:rounded-r-2xl px-2 sm:px-3 py-2 sm:py-3">
                        <button
                          type="button"
                          onClick={() => setPasswordForm({ userId: userItem._id || userItem.id, password: '', confirmPassword: '' })}
                          className="rounded-lg border border-slate-200 bg-white px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                        >
                          Update Password
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {passwordForm.userId && (
          <div className="rounded-lg sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
            <h2 className="mb-3 sm:mb-4 text-base sm:text-xl font-semibold text-slate-900">Reset password</h2>
            <form onSubmit={handlePasswordReset} className="grid gap-3 sm:gap-4 md:grid-cols-3">
              <label className="block md:col-span-1">
                <span className="mb-2 block text-xs sm:text-sm font-medium text-slate-700">New password</span>
                <input
                  type="password"
                  value={passwordForm.password}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:py-3 text-xs sm:text-sm outline-none focus:border-[#1d74d2]"
                  placeholder="Enter new password"
                />
              </label>
              <label className="block md:col-span-1">
                <span className="mb-2 block text-xs sm:text-sm font-medium text-slate-700">Confirm password</span>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:py-3 text-xs sm:text-sm outline-none focus:border-[#1d74d2]"
                  placeholder="Confirm password"
                />
              </label>
              <div className="flex items-end">
                <button type="submit" className="w-full rounded-lg sm:rounded-xl bg-[#1d74d2] px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white hover:bg-[#185fb5] whitespace-nowrap">Save Password</button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'account-management') {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Employee</p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Update Username</h1>
        </div>

        <div className="rounded-lg sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <form onSubmit={handleAccountChange} className="grid gap-3 sm:gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-2 block text-xs sm:text-sm font-medium text-slate-700">Username</span>
              <input
                type="text"
                value={accountForm.username}
                onChange={(e) => setAccountForm((prev) => ({ ...prev, username: e.target.value }))}
                className="w-full rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:py-3 text-xs sm:text-sm outline-none focus:border-[#1d74d2]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs sm:text-sm font-medium text-slate-700">Current Password</span>
              <input
                type="password"
                value={accountForm.currentPassword}
                onChange={(e) => setAccountForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:py-3 text-xs sm:text-sm outline-none focus:border-[#1d74d2]"
                placeholder="Current password"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs sm:text-sm font-medium text-slate-700">New Password</span>
              <input
                type="password"
                value={accountForm.newPassword}
                onChange={(e) => setAccountForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                className="w-full rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:py-3 text-xs sm:text-sm outline-none focus:border-[#1d74d2]"
                placeholder="New password"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-xs sm:text-sm font-medium text-slate-700">Confirm New Password</span>
              <input
                type="password"
                value={accountForm.confirmPassword}
                onChange={(e) => setAccountForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:py-3 text-xs sm:text-sm outline-none focus:border-[#1d74d2]"
                placeholder="Confirm new password"
              />
            </label>

            {(usernameError || usernameMessage) && (
              <div className={`md:col-span-2 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm ${usernameError ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {usernameError || usernameMessage}
              </div>
            )}

            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className="rounded-lg sm:rounded-xl bg-[#1d74d2] px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white hover:bg-[#185fb5] whitespace-nowrap">Update Account</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      <div className="flex flex-col gap-3 sm:gap-4 lg:gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Welcome back</p>
          <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 break-words">{theme.title}</h1>
          <p className="mt-2 text-sm sm:text-base lg:text-lg text-slate-600 break-words">{theme.summary}</p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-center">
          <div className="w-full rounded-2xl border border-slate-200 bg-white px-3 sm:px-4 py-3 shadow-sm">
            <span className="text-xs sm:text-sm text-slate-500">Signed in as</span>
            <div className="mt-2 flex items-center gap-3">
              <div className={`flex h-9 sm:h-10 w-9 sm:w-10 flex-shrink-0 items-center justify-center rounded-full text-xs sm:text-sm font-bold text-white ${theme.accent}`}>
                {user?.name?.split(' ').map((part) => part[0]).slice(0, 2).join('') || 'AS'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800 truncate text-sm sm:text-base">{user?.name || 'Abdiqani Sh. Ibrahim'}</p>
                <p className="text-xs sm:text-sm text-slate-500 truncate">{user?.role || 'Role'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {role === 'EMPLOYEE' ? (
        // Task 5: Employee overview — the backend already filters jobs to only those
        // assigned to the logged-in employee, so we count directly from the jobs array.
        <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">My Assigned Jobs</p>
            <div className="mt-4 sm:mt-5 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {jobsLoading ? '…' : jobs.length}
            </div>
            <p className="mt-1 text-xs text-slate-400">Total jobs assigned to you</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">My Completed Jobs</p>
            <div className="mt-4 sm:mt-5 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {jobsLoading ? '…' : jobs.filter((job) => normalizeBookingStatus(job.status) === 'done').length}
            </div>
            <p className="mt-1 text-xs text-slate-400">Status: Done / Completed</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">My Pending Jobs</p>
            <div className="mt-4 sm:mt-5 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {jobsLoading ? '…' : jobs.filter((job) => normalizeBookingStatus(job.status) === 'pending').length}
            </div>
            <p className="mt-1 text-xs text-slate-400">Status: Pending / Scheduled</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">My In-Progress Jobs</p>
            <div className="mt-4 sm:mt-5 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {jobsLoading ? '…' : jobs.filter((job) => normalizeBookingStatus(job.status) === 'accepted').length}
            </div>
            <p className="mt-1 text-xs text-slate-400">Status: Accepted / In Progress</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-white to-[#f1f6ff] p-3 sm:p-4 shadow-sm border border-slate-100">
            <div className="flex h-9 sm:h-10 w-9 sm:w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#e6f0ff] text-[#1d74d2] text-base sm:text-lg font-bold">✓</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0f4fa8] truncate">Completed</p>
              <div className="mt-1 text-lg sm:text-xl font-bold text-[#0f346b]">{jobsLoading ? '…' : liveSummary.completedJobs}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-white to-[#ecfff6] p-3 sm:p-4 shadow-sm border border-slate-100">
            <div className="flex h-9 sm:h-10 w-9 sm:w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#dffaf0] text-[#059669] text-base sm:text-lg font-bold">⟳</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#05603a] truncate">In Progress</p>
              <div className="mt-1 text-lg sm:text-xl font-bold text-[#014f36]">{jobsLoading ? '…' : liveSummary.inProgressJobs}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-white to-[#fffaf0] p-3 sm:p-4 shadow-sm border border-slate-100">
            <div className="flex h-9 sm:h-10 w-9 sm:w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#fff3d9] text-[#b45309] text-base sm:text-lg font-bold">!</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7a4a05] truncate">Pending</p>
              <div className="mt-1 text-lg sm:text-xl font-bold text-[#6b3f05]">{jobsLoading ? '…' : liveSummary.pendingJobs}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-white to-[#eef8ff] p-3 sm:p-4 shadow-sm border border-slate-100">
            <div className="flex h-9 sm:h-10 w-9 sm:w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#e6f4ff] text-[#1d74d2] text-base sm:text-lg font-bold">$</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0f4fa8] truncate">Revenue</p>
              <div className="mt-1 text-lg sm:text-xl font-bold text-[#0f346b]">${jobsLoading ? '…' : liveSummary.totalRevenue.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Activity moved to dedicated page: /employee/activity */}
    </div>
  );
};

export default RoleDashboardPage;
