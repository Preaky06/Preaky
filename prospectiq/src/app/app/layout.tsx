import { requireUser } from '@/lib/auth';
import { usageOf } from '@/lib/quota';
import { AppShell } from '@/components/app-shell';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const usage = await usageOf(user.orgId);
  return (
    <AppShell user={{ name: user.name, email: user.email, orgName: user.orgName, isAdmin: user.isAdmin, plan: { name: user.plan.name, prospects: user.plan.prospects, aiMessages: user.plan.aiMessages }, usage: { prospects: usage.prospects, aiMessages: usage.aiMessages } }}>
      {children}
    </AppShell>
  );
}
