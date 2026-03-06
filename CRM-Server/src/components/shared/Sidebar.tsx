"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  GitBranch,
  Database,
  LogOut,
  HeartHandshake,
  Mail,
  MapPin,
  Activity,
} from "lucide-react";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/dashboard",      label: "Dashboard",  icon: LayoutDashboard },
  { href: "/accounts",       label: "Businesses", icon: Building2 },
  { href: "/properties",     label: "Properties", icon: MapPin },
  { href: "/contacts",       label: "Contacts",   icon: Users },
  { href: "/pipeline",       label: "Pipeline",   icon: GitBranch },
  { href: "/activities",     label: "Activities", icon: Activity },
  { href: "/communications", label: "Outreach",   icon: Mail },
  { href: "/query",          label: "Query",      icon: Database },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-14 bg-[#0d1526] flex flex-col z-30 border-r border-white/[0.06]">
      {/* Logo */}
      <div className="flex items-center justify-center py-[18px]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-900/40">
          <HeartHandshake size={16} className="text-white" strokeWidth={2.5} />
        </div>
      </div>

      <div className="mx-3 h-px bg-white/[0.06] mb-2" />

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center py-2 gap-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "group relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-150",
                isActive
                  ? "bg-white/[0.10] text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400 rounded-r-full -ml-px" />
              )}
              <Icon size={17} className={isActive ? "text-blue-400" : ""} strokeWidth={isActive ? 2.5 : 2} />

              {/* Tooltip */}
              <span className="pointer-events-none absolute left-full ml-3 px-2 py-1 rounded-md bg-gray-900 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg z-50">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="mx-3 h-px bg-white/[0.06] mb-2" />
      <div className="flex items-center justify-center py-3">
        <button
          title="Sign Out"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="group relative flex items-center justify-center w-10 h-10 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-all"
        >
          <LogOut size={16} strokeWidth={2} />
          <span className="pointer-events-none absolute left-full ml-3 px-2 py-1 rounded-md bg-gray-900 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg z-50">
            Sign Out
          </span>
        </button>
      </div>
    </aside>
  );
}
