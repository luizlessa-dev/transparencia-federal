"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SiteNavLink } from "~/lib/site-config";

interface Props {
  items: SiteNavLink[];
}

function isActive(pathname: string, href?: string): boolean {
  if (!href) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function topLevelStyle(active: boolean): React.CSSProperties {
  return {
    padding: "0.5rem 0.875rem",
    fontSize: "0.875rem",
    fontWeight: active ? 600 : 500,
    color: active ? "hsl(var(--text-headline))" : "hsl(var(--text-body))",
    borderRadius: "2px",
    textDecoration: "none",
    backgroundColor: active ? "hsl(var(--surface))" : "transparent",
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    whiteSpace: "nowrap",
  };
}

function NavDropdown({ item, pathname, open, onOpen, onClose }: { item: SiteNavLink; pathname: string; open: boolean; onOpen: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  // Click outside fecha
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function escHandler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [open, onClose]);

  const children = item.children ?? [];
  const hasActive = children.some((c) => isActive(pathname, c.href));

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => (open ? onClose() : onOpen())}
        onMouseEnter={() => onOpen()}
        aria-expanded={open}
        aria-haspopup="true"
        style={topLevelStyle(hasActive)}
      >
        {item.label}
        <span
          style={{
            fontSize: "0.625rem",
            color: "hsl(var(--text-caption))",
            transition: "transform 0.15s",
            transform: open ? "rotate(180deg)" : "rotate(0)",
            display: "inline-block",
          }}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          onMouseLeave={() => onClose()}
          style={{
            position: "absolute",
            top: "calc(100% + 0.25rem)",
            right: 0,
            minWidth: "13rem",
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "2px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            padding: "0.375rem",
            zIndex: 60,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children.map((child) => {
            const active = isActive(pathname, child.href);
            // GRUPO aninhado (ex.: estado "Minas Gerais" com seus eixos)
            if (child.children && child.children.length > 0) {
              return (
                <div key={child.label} style={{ borderTop: "1px solid hsl(var(--border))", marginTop: "0.25rem", paddingTop: "0.25rem" }}>
                  {child.href ? (
                    <Link
                      href={child.href}
                      onClick={() => onClose()}
                      style={{ display: "block", padding: "0.5rem 0.75rem 0.25rem", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "hsl(var(--accent))", textDecoration: "none" }}
                    >
                      {child.label}
                    </Link>
                  ) : (
                    <div style={{ padding: "0.5rem 0.75rem 0.25rem", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "hsl(var(--text-caption))" }}>{child.label}</div>
                  )}
                  {child.children.map((g) =>
                    g.href ? (
                      <Link
                        key={g.href}
                        href={g.href}
                        onClick={() => onClose()}
                        style={{ display: "block", padding: "0.375rem 0.75rem 0.375rem 1.25rem", fontSize: "0.8125rem", fontWeight: isActive(pathname, g.href) ? 700 : 500, color: isActive(pathname, g.href) ? "hsl(var(--text-headline))" : "hsl(var(--text-body))", backgroundColor: isActive(pathname, g.href) ? "hsl(var(--surface))" : "transparent", textDecoration: "none", borderRadius: "2px" }}
                      >
                        {g.label}
                      </Link>
                    ) : null,
                  )}
                </div>
              );
            }
            if (child.external && child.href) {
              return (
                <a
                  key={child.href}
                  href={child.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onClose()}
                  style={{
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.8125rem",
                    color: "hsl(var(--text-body))",
                    textDecoration: "none",
                    borderRadius: "2px",
                  }}
                >
                  {child.label} ↗
                </a>
              );
            }
            if (!child.href) return null;
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={() => onClose()}
                style={{
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.8125rem",
                  fontWeight: active ? 700 : 500,
                  color: active ? "hsl(var(--text-headline))" : "hsl(var(--text-body))",
                  backgroundColor: active ? "hsl(var(--surface))" : "transparent",
                  textDecoration: "none",
                  borderRadius: "2px",
                }}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function NavLinks({ items }: Props) {
  const pathname = usePathname();
  const [openLabel, setOpenLabel] = useState<string | null>(null);

  return (
    <nav style={{ display: "flex", alignItems: "center", gap: "0.25rem", flexWrap: "wrap" }}>
      {items.map((item) => {
        // Dropdown
        if (item.children && item.children.length > 0) {
          return (
            <NavDropdown
              key={item.label}
              item={item}
              pathname={pathname}
              open={openLabel === item.label}
              onOpen={() => setOpenLabel(item.label)}
              onClose={() => setOpenLabel(null)}
            />
          );
        }

        // External link
        if (item.external && item.href) {
          return (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              style={topLevelStyle(false)}
            >
              {item.label}
            </a>
          );
        }

        // Link interno simples
        if (!item.href) return null;
        return (
          <Link key={item.href} href={item.href} style={topLevelStyle(isActive(pathname, item.href))}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
