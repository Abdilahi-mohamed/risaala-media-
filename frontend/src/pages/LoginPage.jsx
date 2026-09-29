import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const user = await login(form);
      if (user.role === 'CEO') navigate('/dashboard/ceo');
      else if (user.role === 'MANAGER') navigate('/dashboard/manager');
      else navigate('/dashboard/staff');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#dfe8f2] px-4 py-6 sm:px-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1d74d2] text-xl font-bold text-white">
            R
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Risaala Media</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to your agency dashboard</p>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          <p className="font-semibold text-slate-700">Agency sign in</p>
          <p className="mt-2 text-slate-500">Use your real manager, staff, or executive account credentials.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 sm:py-3 text-base outline-none transition focus:border-[#1d74d2] focus:ring-2 focus:ring-[#1d74d2]/20"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 sm:py-3 text-base outline-none transition focus:border-[#1d74d2] focus:ring-2 focus:ring-[#1d74d2]/20"
              required
            />
          </label>

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-[#1d74d2] px-4 py-2.5 sm:py-3 font-semibold text-white transition hover:bg-[#185fb5] disabled:cursor-not-allowed disabled:opacity-70 text-base sm:text-base"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
