"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/shared/ui";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/guru", label: "Beranda", icon: "Chalkboard" },
  { href: "/guru/materi", label: "Materi", icon: "Cards" },
  { href: "/guru/instruksi-cepat", label: "Instruksi Cepat", icon: "NotePencil" },
  { href: "/guru/pengaturan", label: "Pengaturan", icon: "GearSix" },
  { href: "/guru/bantuan", label: "Bantuan", icon: "Question" },
];

export function TeacherSidebar() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Menu navigasi guru"
      className="hidden md:flex w-64 shrink-0 flex-col border-r-2 border-[var(--border)] bg-[var(--surface)] p-4 min-h-[calc(100dvh-65px)]"
    >
      <nav className="flex flex-col gap-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/guru"
              ? pathname === "/guru"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-[var(--r-tombol)] font-bold text-base transition-colors ${
                isActive
                  ? "bg-[var(--primary)] text-[var(--on-primary)] shadow-[0_4px_0_0_var(--primary-edge)]"
                  : "text-[var(--ink)] hover:bg-[var(--surface-2)]"
              }`}
            >
              <Icon name={item.icon} size={24} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function TeacherBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Menu navigasi cepat"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t-2 border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg"
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/guru"
            ? pathname === "/guru"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg font-bold text-xs ${
              isActive
                ? "text-[var(--link)] font-extrabold"
                : "text-[var(--muted)]"
            }`}
          >
            <Icon name={item.icon} size={24} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
