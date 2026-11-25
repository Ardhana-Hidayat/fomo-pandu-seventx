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
  { href: "/guru/kelas", label: "Kelas", icon: "UsersThree" },
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
      className="hidden md:flex w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] p-4 h-full overflow-hidden select-none"
    >
      <div className="mb-4 pb-3 border-b border-[var(--border)]">
        <Link
          href="/guru"
          className="text-base font-bold tracking-tight text-[var(--ink)] flex items-center gap-2 hover:text-[var(--primary)] transition-colors duration-[120ms]"
        >
          <span>PANDU</span>
          <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] font-semibold">
            Ruang Guru
          </span>
        </Link>
      </div>
      <nav className="flex flex-col gap-1.5">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/guru"
              ? pathname === "/guru"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[44px] items-center gap-3 px-3.5 py-2.5 rounded-[var(--r-tombol)] font-semibold text-sm sm:text-base transition-colors duration-[120ms] ${
                isActive
                  ? "bg-[var(--primary)] text-[var(--on-primary)]"
                  : "text-[var(--ink)] hover:bg-[var(--surface-2)]"
              }`}
            >
              <Icon name={item.icon} size={20} />
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
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 grid grid-cols-6 gap-1 border-t border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 shadow-lg"
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
            className={`flex min-h-[48px] flex-col items-center justify-center gap-1 px-1 py-1.5 rounded-[var(--r-tombol)] font-semibold text-[11px] leading-tight text-center transition-colors duration-[120ms] ${
              isActive
                ? "bg-[var(--accent-subtle)] text-[var(--primary)] font-bold"
                : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
            }`}
          >
            <Icon name={item.icon} size={22} />
            <span className="truncate max-w-full">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
