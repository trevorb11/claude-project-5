"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Crosshair,
  Building2,
  Shield,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/competitor", label: "Case Files", icon: Crosshair },
  { href: "/intelligence", label: "Intelligence", icon: Shield },
  { href: "/setup", label: "My Company", icon: Building2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-bg-secondary border-r border-border flex flex-col shrink-0">
      <div className="p-5 border-b border-border">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-accent-blue flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-accent-blue">
              Builder Studio
            </h1>
            <p className="text-[11px] text-text-muted tracking-wide uppercase">
              Competitive Intel
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? "bg-accent-blue/15 text-accent-blue border border-accent-blue/30"
                  : "text-text-secondary hover:bg-bg-card hover:text-text-primary border border-transparent"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 px-2">
          <div className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse" />
          <span className="text-xs text-text-muted">System Online</span>
        </div>
      </div>
    </aside>
  );
}
