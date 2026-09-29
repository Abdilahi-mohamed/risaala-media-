const DashboardPage = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-slate-200">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-2 text-sm sm:text-base text-slate-600">Overview of jobs, projects, equipment, and performance.</p>
      </div>
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-slate-200">Total Jobs</div>
        <div className="rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-slate-200">Active Projects</div>
        <div className="rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-slate-200">Available Equipment</div>
      </div>
    </div>
  );
};

export default DashboardPage;
