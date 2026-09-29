const STORAGE_KEY = 'mediaflow_bookings';

export const getBookings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
};

export const getBookingById = (bookingId) => {
  const bookings = getBookings();
  return bookings.find((booking) => booking.id === bookingId) || null;
};

export const hasBookingMedia = (booking) => {
  if (!booking) return false;

  if (Array.isArray(booking.uploadedFiles) && booking.uploadedFiles.length > 0) {
    return true;
  }

  if (Array.isArray(booking.mediaFiles) && booking.mediaFiles.length > 0) {
    return true;
  }

  return Boolean(booking.uploadedFileData || booking.uploadedFileName);
};

export const saveBooking = (booking) => {
  const current = getBookings();
  const nextBooking = {
    id: booking.id || `booking-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    status: booking.status || 'pending',
    uploadedFiles: booking.uploadedFiles || [],
    ...booking
  };
  const next = [...current, nextBooking];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('mediaflow-bookings-updated'));
  return next;
};

export const updateBookingStatus = (bookingId, nextStatus) => {
  const current = getBookings();
  const next = current.map((booking) =>
    booking.id === bookingId ? { ...booking, status: nextStatus } : booking
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('mediaflow-bookings-updated'));
  return next;
};

export const updateBookingFiles = (bookingId, files) => {
  const current = getBookings();
  const next = current.map((booking) => {
    if (booking.id !== bookingId) return booking;

    const existingFiles = Array.isArray(booking.uploadedFiles) ? booking.uploadedFiles : [];
    const mergedFiles = [...existingFiles, ...files];

    return {
      ...booking,
      uploadedFiles: mergedFiles,
      uploadedFileName: files[0]?.name || booking.uploadedFileName || '',
      uploadedFileData: files[0]?.data || booking.uploadedFileData || ''
    };
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('mediaflow-bookings-updated'));
  return next;
};

export const subscribeToBookings = (callback) => {
  const handleStorage = () => callback(getBookings());
  const handleEvent = () => callback(getBookings());

  window.addEventListener('storage', handleStorage);
  window.addEventListener('mediaflow-bookings-updated', handleEvent);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('mediaflow-bookings-updated', handleEvent);
  };
};
