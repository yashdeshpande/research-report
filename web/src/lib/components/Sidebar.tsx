"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/product-areas", label: "Product Areas", icon: "📦" },
  { href: "/projects", label: "Projects", icon: "📋" },
  { href: "/insights", label: "Insights", icon: "💡" },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 border-r border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="border-b border-slate-200 px-6 py-6">
          <h1 className="text-xl font-bold text-slate-900">Research Repo</h1>
          <p className="mt-1 text-xs text-slate-500">v1.0 - Phase 2</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-indigo-100 text-indigo-700"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-200 px-4 py-4 space-y-2">
          <Link
            href="/settings"
            className={`flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isActive("/settings")
                ? "bg-indigo-100 text-indigo-700"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span className="text-lg">⚙️</span>
            Settings
          </Link>
          <p className="px-4 text-xs text-slate-500">Logged in as User</p>
        </div>
      </div>
    </aside>
  );
}
