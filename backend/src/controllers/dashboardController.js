const Job = require('../models/Job');
const Payment = require('../models/Payment');

const normalizeStatus = (value = '') => String(value || '').trim().toLowerCase();

const getJobDurationHours = (job = {}) => {
  const startValue = job.startDate || job.createdAt || null;
  const endValue = job.endDate || job.updatedAt || job.createdAt || null;

  if (!startValue || !endValue) return 0;

  const diffMs = new Date(endValue) - new Date(startValue);
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 0;

  return Number((diffMs / (1000 * 60 * 60)).toFixed(1));
};

const getOverviewStats = (jobs = []) => {
  const completedJobs = jobs.filter((job) => normalizeStatus(job.status) === 'completed').length;
  const inProgressJobs = jobs.filter((job) => ['in progress', 'scheduled', 'editing', 'review'].includes(normalizeStatus(job.status))).length;
  const pendingJobs = jobs.filter((job) => normalizeStatus(job.status) === 'pending').length;
  const cancelledJobs = jobs.filter((job) => normalizeStatus(job.status) === 'cancelled').length;

  return {
    completedJobs,
    inProgressJobs,
    pendingJobs,
    cancelledJobs,
    totalRevenue: jobs.reduce((sum, job) => sum + (Number(job.budget || job.money || 0) || 0), 0)
  };
};

const buildEmployeeActivity = (jobs = []) => {
  const employeeMap = new Map();

  jobs.forEach((job) => {
    const assignedEmployees = Array.isArray(job.assignedEmployees) ? job.assignedEmployees : [];
    if (!assignedEmployees.length) return;

    assignedEmployees.forEach((employee) => {
      const employeeId = String(employee?._id || employee?.id || employee?.email || '');
      if (!employeeId) return;

      const employeeName = employee?.name || employee?.fullName || employee?.email || 'Unassigned';
      const current = employeeMap.get(employeeId) || {
        employeeId,
        employeeName,
        assignedJobs: 0,
        completedJobs: 0,
        inProgressJobs: 0,
        pendingJobs: 0,
        cancelledJobs: 0,
        totalWorkingTime: 0,
        completionDurations: [],
        totalMoneyEarned: 0
      };

      current.assignedJobs += 1;

      const status = normalizeStatus(job.status);
      if (status === 'completed') {
        current.completedJobs += 1;
        const duration = getJobDurationHours(job);
        current.totalWorkingTime += duration;
        current.completionDurations.push(duration);
        current.totalMoneyEarned += Number(job.budget || job.money || 0) || 0;
      }

      if (['in progress', 'scheduled', 'editing', 'review'].includes(status)) {
        current.inProgressJobs += 1;
      }

      if (status === 'pending') {
        current.pendingJobs += 1;
      }

      if (status === 'cancelled') {
        current.cancelledJobs += 1;
      }

      employeeMap.set(employeeId, current);
    });
  });

  return Array.from(employeeMap.values())
    .map((employee) => {
      const completedCount = employee.completedJobs || 0;
      const totalDuration = employee.completionDurations.reduce((sum, duration) => sum + duration, 0);
      const completionRate = employee.assignedJobs > 0 ? Number(((completedCount / employee.assignedJobs) * 100).toFixed(1)) : 0;
      const avgCompletionTime = completedCount > 0 ? Number((totalDuration / completedCount).toFixed(1)) : 0;

      return {
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
        totalAssignedBookings: employee.assignedJobs,
        completedBookings: completedCount,
        inProgressBookings: employee.inProgressJobs,
        pendingBookings: employee.pendingJobs,
        cancelledBookings: employee.cancelledJobs,
        completionRate,
        totalWorkingTime: Number(employee.totalWorkingTime.toFixed(1)),
        averageCompletionTime: avgCompletionTime,
        totalMoneyEarned: Number(employee.totalMoneyEarned.toFixed(2)),
        completionTimes: employee.completionDurations
      };
    })
    .sort((a, b) => b.completedBookings - a.completedBookings || a.employeeName.localeCompare(b.employeeName));
};

const buildSixMonthTrends = (jobs = [], employees = []) => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();

  const calendar = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: `${monthNames[date.getMonth()]} ${date.getFullYear()}`
    };
  });

  const employeesById = new Map((employees || []).map((employee) => [String(employee.employeeId), employee]));

  return calendar.map((month) => {
    const monthRows = Array.from(employeesById.values()).map((employee) => {
      const completedCount = jobs.filter((job) => {
        const assigned = Array.isArray(job.assignedEmployees) ? job.assignedEmployees : [];
        const isAssigned = assigned.some((member) => String(member?._id || member?.id || member?.email || '') === String(employee.employeeId));
        if (!isAssigned || normalizeStatus(job.status) !== 'completed') return false;

        const completedDate = new Date(job.updatedAt || job.endDate || job.createdAt || Date.now());
        const key = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}`;
        return key === month.key;
      }).length;

      const assignedCount = jobs.filter((job) => {
        const assigned = Array.isArray(job.assignedEmployees) ? job.assignedEmployees : [];
        return assigned.some((member) => String(member?._id || member?.id || member?.email || '') === String(employee.employeeId));
      }).length;

      const workingHours = jobs.reduce((sum, job) => {
        const assigned = Array.isArray(job.assignedEmployees) ? job.assignedEmployees : [];
        const isAssigned = assigned.some((member) => String(member?._id || member?.id || member?.email || '') === String(employee.employeeId));
        if (!isAssigned || normalizeStatus(job.status) !== 'completed') return sum;

        const completedDate = new Date(job.updatedAt || job.endDate || job.createdAt || Date.now());
        const key = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}`;
        if (key !== month.key) return sum;

        return sum + getJobDurationHours(job);
      }, 0);

      return {
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
        completedJobs: completedCount,
        assignedJobs: assignedCount,
        completionRate: assignedCount > 0 ? Number(((completedCount / assignedCount) * 100).toFixed(1)) : 0,
        workingHours: Number(workingHours.toFixed(1))
      };
    });

    return {
      ...month,
      employees: monthRows
    };
  });
};

const getDashboardOverview = async (req, res, next) => {
  try {
    const jobs = await Job.find({}).populate('assignedEmployees projectId clientId').sort({ createdAt: -1 });
    const stats = getOverviewStats(jobs);

    const paymentsTotal = await Payment.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalRevenue = Number(stats.totalRevenue.toFixed(2));

    res.json({
      success: true,
      message: 'Dashboard overview retrieved',
      data: {
        summary: {
          ...stats,
          totalRevenue
        },
        jobs,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

const getEmployeeActivity = async (req, res, next) => {
  try {
    const jobs = await Job.find({}).populate('assignedEmployees projectId clientId').sort({ createdAt: -1 });
    const employees = buildEmployeeActivity(jobs);
    const sixMonthAnalytics = buildSixMonthTrends(jobs, employees);

    res.json({
      success: true,
      message: 'Employee activity retrieved',
      data: {
        employees,
        sixMonthAnalytics,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

const getEmployeePerformance = async (req, res, next) => {
  try {
    const jobs = await Job.find({}).populate('assignedEmployees projectId clientId').sort({ createdAt: -1 });
    const employees = buildEmployeeActivity(jobs);
    const sixMonthAnalytics = buildSixMonthTrends(jobs, employees);

    res.json({
      success: true,
      message: 'Employee performance retrieved',
      data: {
        employees,
        sixMonthAnalytics,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

const getRevenueStats = async (req, res, next) => {
  try {
    const jobs = await Job.find({}).populate('assignedEmployees projectId clientId').sort({ createdAt: -1 });
    const paymentSummary = await Payment.aggregate([
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
    ]);

    const totalRevenue = paymentSummary[0]?.totalRevenue || 0;
    const completedRevenue = jobs
      .filter((job) => normalizeStatus(job.status) === 'completed')
      .reduce((sum, job) => sum + (Number(job.budget || job.money || 0) || 0), 0);

    res.json({
      success: true,
      message: 'Revenue statistics retrieved',
      data: {
        totalRevenue: Number((totalRevenue || completedRevenue).toFixed(2)),
        paymentRevenue: Number((paymentSummary[0]?.totalRevenue || 0).toFixed(2)),
        jobRevenue: Number(completedRevenue.toFixed(2)),
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardOverview,
  getEmployeeActivity,
  getEmployeePerformance,
  getRevenueStats
};
