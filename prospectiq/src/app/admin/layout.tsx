import { requireAdmin } from '@/lib/auth';
import { usageOf } from '@/lib/quota';
import { AppShell } from '@/components/app-shell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const usage = await usageOf(user.orgId);
  return (
    <AppShell user={{ name: user.name, email: user.email, orgName: user.orgName, isAdmin: true, plan: { name: user.plan.name, prospects: user.plan.prospects, aiMessages: user.plan.aiMessages }, usage: { prospects: usage.prospects, aiMessages: usage.aiMessages } }}>
      {children}
    </AppShell>
  );
}
