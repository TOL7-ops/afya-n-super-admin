import AuthGuard from '@/components/layout/AuthGuard';
import AdminShell from '@/components/layout/AdminShell';

export default function Page() {
  return (
    <AuthGuard>
      <AdminShell />
    </AuthGuard>
  );
}
