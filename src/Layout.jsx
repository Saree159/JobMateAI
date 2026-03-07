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
  Globe
} from "lucide-react";
import logo from "@/assets/logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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
    {
      title: t('nav.dashboard'),
      url: createPageUrl("Dashboard"),
      icon: LayoutDashboard,
    },
    {
      title: t('nav.jobs'),
      url: createPageUrl("Jobs"),
      icon: Briefcase,
    },
    {
      title: t('nav.israeliJobs'),
      url: createPageUrl("IsraeliJobs"),
      icon: Globe,
    },
    {
      title: t('nav.applications'),
      url: createPageUrl("Applications"),
      icon: FileText,
    },
    {
      title: t('nav.analytics'),
      url: createPageUrl("Analytics"),
      icon: BarChart3,
    },
    {
      title: t('nav.profile'),
      url: createPageUrl("Profile"),
      icon: User,
    },
    {
      title: t('nav.pricing'),
      url: createPageUrl("Pricing"),
      icon: CreditCard,
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 to-gray-100">
        <Sidebar side={isRTL ? "right" : "left"} className="ltr:border-r rtl:border-l border-gray-200 bg-white/80 backdrop-blur-xl">
          <SidebarHeader className="border-b border-gray-200 p-4">
            <div className="flex items-center gap-2">
              <img src={logo} alt="HireMatrix" className="h-10 w-auto" />
              <p className="text-xs text-gray-500">{t('nav.appTagline')}</p>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 rounded-xl mb-1 ${
                          location.pathname === item.url
                            ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 font-semibold shadow-sm'
                            : 'text-gray-700'
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                          <item.icon className="w-5 h-5 shrink-0" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-200 p-4 bg-white/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-indigo-700 font-semibold text-sm">
                    {user?.full_name?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all duration-200"
                title={t('nav.logout')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 px-6 py-4 md:hidden sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors" />
              <div className="flex items-center gap-2">
                <img src={logo} alt="HireMatrix" className="h-8 w-auto" />
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
