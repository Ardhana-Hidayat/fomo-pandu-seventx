"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { List } from "@phosphor-icons/react";
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

function isNavItemActive(pathname: string, href: string): boolean {
  return href === "/guru" ? pathname === "/guru" : pathname.startsWith(href);
}

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
          const isActive = isNavItemActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
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
      <div className="mt-auto pt-4 border-t border-[var(--border)]">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex w-full min-h-[44px] items-center gap-3 px-3.5 py-2.5 rounded-[var(--r-tombol)] font-semibold text-sm sm:text-base text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] transition-colors duration-[120ms]"
          >
            <Icon name="DoorOpen" size={20} />
            <span>Keluar</span>
          </button>
        </form>
      </div>
    </aside>
  );
}

export function TeacherMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <header className="md:hidden sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--surface)] select-none">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/guru"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2 text-base font-bold tracking-tight text-[var(--ink)] hover:text-[var(--primary)] transition-colors duration-[120ms]"
        >
          <span>PANDU</span>
          <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] font-semibold">
            Ruang Guru
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-controls="teacher-mobile-menu"
          aria-label={open ? "Tutup menu navigasi" : "Buka menu navigasi"}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--r-tombol)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors duration-[120ms]"
        >
          {open ? (
            <Icon name="X" size={20} />
          ) : (
            <List size={20} weight="bold" aria-hidden="true" focusable={false} />
          )}
          <span>{open ? "Tutup" : "Menu"}</span>
        </button>
      </div>

      {open && (
        <>
          <div
            className="fixed inset-0 top-16 z-30 bg-black/20"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <nav
            id="teacher-mobile-menu"
            aria-label="Menu navigasi guru"
            className="absolute left-0 right-0 top-full z-40 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-lg"
          >
            <div className="flex flex-col gap-1.5">
              {NAV_ITEMS.map((item) => {
                const isActive = isNavItemActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex min-h-[44px] items-center gap-3 px-3.5 py-2.5 rounded-[var(--r-tombol)] font-semibold text-sm transition-colors duration-[120ms] ${
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
              <div className="mt-2 pt-2 border-t border-[var(--border)]">
                <form action="/api/auth/logout" method="POST">
                  <button
                    type="submit"
                    className="flex w-full min-h-[44px] items-center gap-3 px-3.5 py-2.5 rounded-[var(--r-tombol)] font-semibold text-sm text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] transition-colors duration-[120ms]"
                  >
                    <Icon name="DoorOpen" size={20} />
                    <span>Keluar</span>
                  </button>
                </form>
              </div>
            </div>
          </nav>
        </>
      )}
    </header>
  );
}
