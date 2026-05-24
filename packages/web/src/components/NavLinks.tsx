"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SiteNavLink } from "~/lib/site-config";

interface Props {
  items: SiteNavLink[];
}

export function NavLinks({ items }: Props) {
  const pathname = usePathname();

  return (
    <nav style={{ display: "flex", alignItems: "center", gap: "0.25rem", flexWrap: "wrap" }}>
      {items.map((item) => {
        // Links externos não destacam por pathname
        if (item.external) {
          return (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "0.5rem 0.875rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "hsl(var(--text-body))",
                borderRadius: "2px",
                textDecoration: "none",
                backgroundColor: "transparent",
              }}
            >
              {item.label}
            </a>
          );
        }

        const active =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href));

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
