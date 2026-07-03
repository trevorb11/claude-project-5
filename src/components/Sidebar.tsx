"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Crosshair,
  BarChart3,
  Bell,
  Cable,
  Home,
  Building2,
  Shield,
  Menu,
  X,
  Activity,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/competitor", label: "Case Files", icon: Crosshair },
  { href: "/compare", label: "Compare", icon: BarChart3 },
  { href: "/floorplans", label: "Floor Plans", icon: Home },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/intelligence", label: "Intelligence", icon: Shield },
  { href: "/setup", label: "My Company", icon: Building2 },
  { href: "/integrations", label: "Integrations", icon: Cable },
];

export function Sidebar() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [researching, setResearching] = useState<string[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fetchStatus = () => {
      fetch("/api/alerts?unread_only=true&limit=100")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setUnreadCount(data.length);
        })
        .catch(() => {});
      fetch("/api/competitors")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setResearching(
              data
                .filter((c) => c.status === "researching")
                .map((c) => c.name as string)
            );
          }
        })
        .catch(() => {});
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close the mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const nav = (
    <nav className="flex-1 p-3 space-y-0.5 mt-1">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href));
        const isAlerts = item.href === "/alerts";
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
              isActive
                ? "bg-accent-blue text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <item.icon className={`w-[18px] h-[18px] ${isActive ? "text-white" : "text-gray-400"}`} />
            <span className="flex-1">{item.label}</span>
            {isAlerts && unreadCount > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                isActive ? "bg-white/20 text-white" : "bg-accent-amber text-white"
              }`}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const statusFooter = (
    <div className="p-4 border-t border-gray-100">
      {researching.length > 0 ? (
        <div className="flex items-start gap-2 px-2">
          <Activity className="w-3.5 h-3.5 text-accent-blue animate-pulse shrink-0 mt-0.5" />
          <span className="text-[11px] text-accent-blue leading-snug">
            Researching {researching.slice(0, 2).join(", ")}
            {researching.length > 2 ? ` +${researching.length - 2} more` : ""}…
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-2">
          <div className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse" />
          <span className="text-[11px] text-gray-400">System Online</span>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 print:hidden">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/logo.png"
            alt="Homebuilder Studio"
            width={120}
            height={36}
            className="object-contain"
            style={{ width: "auto", height: "auto", maxWidth: 120, maxHeight: 36 }}
            priority
          />
        </Link>
        <div className="flex items-center gap-3">
          {researching.length > 0 && (
            <Activity className="w-4 h-4 text-accent-blue animate-pulse" />
          )}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg hover:bg-gray-50 text-gray-600"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 print:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute top-14 left-0 bottom-0 w-64 bg-white border-r border-gray-200 flex flex-col shadow-xl">
            {nav}
            {statusFooter}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col shrink-0 print:hidden relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-blue via-accent-cyan to-accent-amber" />

        <div className="px-5 pt-6 pb-4 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/images/logo.png"
              alt="Homebuilder Studio"
              width={160}
              height={48}
              className="object-contain"
              style={{ width: "auto", height: "auto", maxWidth: 160, maxHeight: 48 }}
              priority
            />
          </Link>
          <p className="text-[10px] text-text-muted tracking-[0.15em] uppercase mt-1.5 ml-1">
            Competitive Intelligence
          </p>
        </div>

        {nav}
        {statusFooter}
      </aside>
    </>
  );
}
