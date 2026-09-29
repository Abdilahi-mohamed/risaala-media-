const JobsPage = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg sm:text-xl font-semibold">Jobs</h2>
        <p className="mt-1 text-sm sm:text-base text-slate-500">Manage jobs, assignments, and status updates.</p>
      </div>
      <div className="rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-slate-200 text-sm sm:text-base">List of jobs will appear here.</div>
    </div>
  );
};

export default JobsPage;
