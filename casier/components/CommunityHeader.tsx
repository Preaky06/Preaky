import Link from "next/link";
import { FREE_MEMBER_LIMIT, isStaff, type Community, type Role } from "@/lib/data";

export function CommunityHeader({
  community,
  role,
  members,
}: {
  community: Community;
  role: Role | null;
  members: number;
}) {
  const base = `/c/${community.slug}`;
  return (
    <header className="community-header">
      <div>
        <h1>{community.name}</h1>
        <p className="muted">
          {community.platform} · {members}
          {community.plan === "free" ? ` / ${FREE_MEMBER_LIMIT}` : ""} membres
        </p>
      </div>
      {role && (
        <nav className="tabs" aria-label="Sections de la communauté">
          <Link href={base}>Accueil</Link>
          <Link href={`${base}/characters`}>Personnages</Link>
          {isStaff(role) && <Link href={`${base}/staff`}>Staff</Link>}
        </nav>
      )}
    </header>
  );
}
