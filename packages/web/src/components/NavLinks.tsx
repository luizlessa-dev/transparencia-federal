"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "Ranking", href: "/ranking" },
  { label: "Orç. Secreto", href: "/rp9" },
  { label: "Emendas", href: "/amendments" },
  { label: "Despesas", href: "/expenses" },
  { label: "Financiamento", href: "/funding" },
  { label: "CEAPS Senado", href: "/senate-expenses" },
  { label: "Votações", href: "/voting" },
  { label: "Proposições", href: "/proposicoes" },
  { label: "Risco", href: "/risco" },
  { label: "Frentes", href: "/frentes" },
  { label: "Sobre", href: "/about" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
      {NAV.map((item) => {
        const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              padding: "0.5rem 0.875rem",
              fontSize: "0.875rem",
              fontWeight: active ? 600 : 500,
              color: active ? "hsl(var(--text-headline))" : "hsl(var(--text-body))",
              borderRadius: "2px",
              textDecoration: "none",
              backgroundColor: active ? "hsl(var(--surface))" : "transparent",
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
