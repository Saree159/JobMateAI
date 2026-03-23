import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Briefcase,
  LayoutDashboard,
  FileText,
  User,
  LogOut,
  CreditCard,
  BarChart3,
  Globe,
  Linkedin,
} from "lucide-react";
import logo from "@/assets/logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';

  const navigationItems = [
    { title: t('nav.dashboard'),    url: createPageUrl("Dashboard"),    icon: LayoutDashboard },
    { title: t('nav.jobs'),         url: createPageUrl("Jobs"),         icon: Briefcase       },
    { title: t('nav.israeliJobs'),  url: createPageUrl("IsraeliJobs"),  icon: Globe           },
    { title: t('nav.linkedinJobs'), url: createPageUrl("LinkedInJobs"), icon: Linkedin        },
    { title: t('nav.applications'), url: createPageUrl("Applications"), icon: FileText        },
    { title: t('nav.analytics'),    url: createPageUrl("Analytics"),    icon: BarChart3       },
    { title: t('nav.profile'),      url: createPageUrl("Profile"),      icon: User            },
    { title: t('nav.pricing'),      url: createPageUrl("Pricing"),      icon: CreditCard      },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.full_name
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background overflow-x-hidden">

        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <Sidebar
          side={isRTL ? "right" : "left"}
          className="ltr:border-r rtl:border-l border-white/[0.06]"
        >
          {/* Logo */}
          <SidebarHeader className="px-5 py-4 border-b border-white/[0.06]">
            <img
              src={logo}
              alt="HireMatrix"
              className="w-full max-w-[148px] h-auto object-contain opacity-90"
            />
          </SidebarHeader>

          {/* Nav */}
          <SidebarContent className="px-3 py-3">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {navigationItems.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <Link
                            to={item.url}
                            className={`
                              relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                              font-medium transition-all duration-150 group
                              ${isActive
                                ? 'bg-blue-600/15 text-blue-300'
                                : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.05]'
                              }
                            `}
                          >
                            {/* Active left indicator */}
                            {isActive && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400 rounded-r-full" />
                            )}
                            <item.icon
                              className={`w-4 h-4 shrink-0 transition-colors ${
                                isActive ? 'text-blue-400' : 'text-gray-600 group-hover:text-gray-400'
                              }`}
                              strokeWidth={isActive ? 2.5 : 2}
                            />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          {/* Footer / User */}
          <SidebarFooter className="border-t border-white/[0.06] p-3">
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.04] transition-colors group">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shrink-0 shadow-lg">
                <span className="text-white font-semibold text-xs tracking-wide">{initials}</span>
              </div>

              {/* Name + email */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate leading-none mb-0.5">
                  {user?.full_name || 'User'}
                </p>
                <p className="text-[11px] text-gray-600 truncate">{user?.email}</p>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                title={t('nav.logout')}
                className="p-1.5 rounded-md text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* ── Main ─────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Mobile top bar */}
          <header className="bg-[hsl(222_50%_4.5%)] border-b border-white/[0.06] px-4 py-3 md:hidden sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/[0.06] transition-colors" />
              <img src={logo} alt="HireMatrix" className="max-w-[110px] h-auto object-contain opacity-90" />
            </div>
          </header>

          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
