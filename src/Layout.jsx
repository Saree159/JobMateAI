import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Briefcase, LayoutDashboard, FileText, User, LogOut, CreditCard, BarChart3, Globe, Linkedin } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader,
  SidebarFooter, SidebarProvider, SidebarTrigger,
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

  const navItems = [
    { title: t('nav.dashboard'),    url: createPageUrl("Dashboard"),    icon: LayoutDashboard },
    { title: t('nav.jobs'),         url: createPageUrl("Jobs"),         icon: Briefcase       },
    { title: t('nav.israeliJobs'),  url: createPageUrl("IsraeliJobs"),  icon: Globe           },
    { title: t('nav.linkedinJobs'), url: createPageUrl("LinkedInJobs"), icon: Linkedin        },
    { title: t('nav.applications'), url: createPageUrl("Applications"), icon: FileText        },
    { title: t('nav.analytics'),    url: createPageUrl("Analytics"),    icon: BarChart3       },
    { title: t('nav.profile'),      url: createPageUrl("Profile"),      icon: User            },
    { title: t('nav.pricing'),      url: createPageUrl("Pricing"),      icon: CreditCard      },
  ];

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const initials = user?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U';

  return (
    <SidebarProvider className="overflow-x-hidden" style={{ maxWidth: '100vw' }}>
      <div className="min-h-screen flex w-full bg-background overflow-x-hidden">

        <Sidebar side={isRTL ? "right" : "left"} className="ltr:border-r rtl:border-l border-gray-200">
          {/* Brand */}
          <SidebarHeader className="px-5 py-4 border-b border-gray-100">
            <span className="text-base font-bold text-gray-900 tracking-tight">HireMatrix</span>
          </SidebarHeader>

          {/* Nav */}
          <SidebarContent className="px-3 py-3">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {navItems.map((item) => {
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
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                              }
                            `}
                          >
                            {isActive && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-600 rounded-r-full" />
                            )}
                            <item.icon
                              className={`w-4 h-4 shrink-0 transition-colors ${
                                isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
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

          {/* Footer */}
          <SidebarFooter className="border-t border-gray-100 p-3">
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-white font-semibold text-xs">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate leading-none mb-0.5">{user?.full_name || 'User'}</p>
                <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                title={t('nav.logout')}
                className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* Main */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Mobile header */}
          <header className="bg-white border-b border-gray-200 px-4 py-3 md:hidden sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors" />
              <span className="text-sm font-bold text-gray-900 tracking-tight">HireMatrix</span>
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
