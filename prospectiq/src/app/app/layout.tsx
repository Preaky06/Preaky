import { requireUser } from '@/lib/auth';
import { usageOf } from '@/lib/quota';
import { AppShell } from '@/components/app-shell';
import { one } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const usage = await usageOf(user.orgId);
  const unread = (await one<{ n: number }>('select count(*)::int as n from notifications where org_id = $1 and read_at is null', [user.orgId]))?.n || 0;
  return (
    <AppShell user={{ name: user.name, email: user.email, orgName: user.orgName, isAdmin: user.isAdmin, plan: { name: user.plan.name, prospects: user.plan.prospects, aiMessages: user.plan.aiMessages }, usage: { prospects: usage.prospects, aiMessages: usage.aiMessages }, unread }}>
      {children}
    </AppShell>
  );
}
