import Link from "next/link";
import { ParentSwitcher } from "@/app/parent-switcher";

type ParentOption = { id: number; name: string };

export function SiteHeader({
  parents,
  currentParentId,
}: {
  parents: ParentOption[];
  currentParentId: number | null;
}) {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        Meridian
        <span>Trial classes</span>
      </Link>
      <nav>
        <Link href="/">Book</Link>
        <Link href="/roster">Roster</Link>
      </nav>
      <ParentSwitcher parents={parents} currentParentId={currentParentId} />
    </header>
  );
}
