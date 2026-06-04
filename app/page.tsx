import AuthGuard from '@/components/layout/AuthGuard';
import Topbar from '@/components/layout/Topbar';
import AdminShell from '@/components/layout/AdminShell';

export default function Page() {
  return (
    <AuthGuard>
      <Topbar />
      <AdminShell />
    </AuthGuard>
  );
}
