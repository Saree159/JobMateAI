import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import logo from '@/assets/logo.png';
import {
  LayoutDashboard, DollarSign, Users, Cpu, Zap, Activity,
  Filter, TrendingUp, Megaphone, Server, Bell, Settings,
  ChevronLeft, ChevronRight, Menu, X, Search, Calendar,
  ArrowUpRight, LogOut, MousePointerClick, BarChart2
} from 'lucide-react';

const primaryNav = [
  { label: 'User Analytics', path: '/admin/user-analytics', icon: BarChart2 },
];

const legacyNav = [
  { label: 'Overview',       path: '/admin',              icon: LayoutDashboard },
  { label: 'Revenue',        path: '/admin/revenue',      icon: DollarSign },
  { label: 'Users',          path: '/admin/users',        icon: Users },
  { label: 'User Logs',      path: '/admin/user-logs',    icon: Activity },
  { label: 'Behavior',       path: '/admin/behavior',     icon: MousePointerClick },
  { label: 'AI Usage',       path: '/admin/ai-usage',     icon: Cpu },
  { label: 'Token Costs',    path: '/admin/token-costs',  icon: Zap },
  { label: 'Product',        path: '/admin/product',      icon: Activity },
  { label: 'Funnel',         path: '/admin/funnel',       icon: Filter },
  { label: 'Retention',      path: '/admin/retention',    icon: TrendingUp },
  { label: 'Marketing',      path: '/admin/marketing',    icon: Megaphone },
  { label: 'Infrastructure', path: '/admin/infra',        icon: Server },
  { label: 'Alerts',         path: '/admin/alerts',       icon: Bell,  badge: 3 },
  { label: 'Settings',       path: '/admin/settings',     icon: Settings },
];

const navItems = [...primaryNav, ...legacyNav];

export default function AdminLayout({ children }) {
  const location = useLocation();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path) =>
    path === '/admin'
      ? location.pathname === '/admin' || location.pathname === '/admin/'
      : location.pathname.startsWith(path);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
        {!collapsed && (
          <img src={logo} alt="HireMatrix" className="max-w-[120px] h-auto object-contain" />
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-lg flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-xs">HM</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && (
        <div className="px-4 py-2 border-b border-white/10">
          <span className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase">Admin Console</span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 p-3 overflow-y-auto">
        {/* Primary */}
        <div className="space-y-0.5 mb-3">
          {primaryNav.map(({ label, path, icon: Icon }) => {
            const active = isActive(path);
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 relative ${
                  active
                    ? 'bg-blue-500/20 text-blue-300 font-semibold'
                    : 'text-gray-300 hover:bg-white/8 hover:text-white'
                }`}
                title={collapsed ? label : ''}
              >
                <Icon className="shrink-0" style={{ width: 18, height: 18 }} />
                {!collapsed && <span className="text-sm">{label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Legacy divider */}
        {!collapsed && (
          <div className="px-3 pb-1">
            <span className="text-[10px] font-semibold tracking-widest text-gray-600 uppercase">Legacy</span>
          </div>
        )}
        {collapsed && <div className="border-t border-white/10 my-2" />}

        {/* Legacy pages */}
        <div className="space-y-0.5 opacity-50">
          {legacyNav.map(({ label, path, icon: Icon, badge }) => {
            const active = isActive(path);
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 group relative ${
                  active
                    ? 'bg-blue-500/20 text-blue-300 font-semibold'
                    : 'text-gray-400 hover:bg-white/8 hover:text-white'
                }`}
                title={collapsed ? label : ''}
              >
                <Icon className="shrink-0" style={{ width: 16, height: 16 }} />
                {!collapsed && <span className="text-xs">{label}</span>}
                {!collapsed && badge && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {badge}
                  </span>
                )}
                {collapsed && badge && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xs">A</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.full_name || 'Admin'}</p>
              <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
            </div>
            <Link to="/dashboard" className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors" title="Back to App">
              <LogOut className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <Link to="/dashboard" className="flex justify-center p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  );

  const currentPage = navItems.find(n => isActive(n.path))?.label ?? 'Overview';

  return (
    <div className="dark flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-white/10 bg-[hsl(222,47%,5%)] transition-all duration-300 ${
          collapsed ? 'w-[64px]' : 'w-[220px]'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[220px] bg-[hsl(222,47%,5%)] border-r border-white/10 z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="shrink-0 h-14 border-b border-white/10 bg-background/95 backdrop-blur px-6 flex items-center gap-4 z-10">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-gray-400"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 flex items-center gap-3">
            <h1 className="text-sm font-semibold text-white">Business Overview</h1>
            <span className="text-gray-600">/</span>
            <span className="text-sm text-gray-400">{currentPage}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Date range */}
            <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-gray-300 transition-colors">
              <Calendar className="w-3.5 h-3.5" />
              Mar 1 – Mar 7, 2026
              <ChevronRight className="w-3 h-3 rotate-90" />
            </button>

            {/* Alerts bell */}
            <Link to="/admin/alerts" className="relative p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
              <Bell className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Link>

            {/* Back to app */}
            <Link
              to="/dashboard"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-lg text-xs font-medium transition-colors"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              App
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
