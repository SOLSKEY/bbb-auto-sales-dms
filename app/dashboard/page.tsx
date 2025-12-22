import { redirect } from 'next/navigation';
import { getSessionUserWithRole } from '@/lib/auth';

const DashboardPage = async () => {
  const authUser = await getSessionUserWithRole();

  if (!authUser) {
    redirect('/login');
  }

  if (authUser.role !== 'admin') {
    redirect('/login?error=unauthorized');
  }

  return (
    <main className="min-h-screen bg-slate-950 p-10 text-white">
      <section className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl">
        <h1 className="text-4xl font-bold tracking-tight">Dealer Dashboard</h1>
        <p className="mt-2 text-slate-300">
          Signed in as <span className="font-semibold">{authUser.email}</span> ({authUser.role}).
        </p>

        <div className="mt-8 space-y-4 text-slate-200">
          <p>🚗 Inventory snapshot, KPIs, and analytics will render here.</p>
          <p>
            {/* Role-based rendering example: */}
            {/* if (authUser.role === 'basic_user') { return <BasicDashboard /> } */}
          </p>
        </div>
      </section>
    </main>
  );
};

export default DashboardPage;
