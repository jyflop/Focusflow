import React, { useState, useEffect } from 'react';
import { User, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { 
  LayoutDashboard, 
  Briefcase, 
  Calendar, 
  BarChart3, 
  LogOut, 
  Target,
  Menu,
  X,
  Sun,
  Moon,
  Users,
  MessageSquare,
  User as UserIcon,
  Bell
} from 'lucide-react';
import { cn } from '../lib/utils';

interface DashboardLayoutProps {
  user: User;
  children: React.ReactNode;
  currentView: 'dashboard' | 'projects' | 'calendar' | 'gantt' | 'team' | 'messages' | 'profile';
  onViewChange: (view: 'dashboard' | 'projects' | 'calendar' | 'gantt' | 'team' | 'messages' | 'profile') => void;
}

export default function DashboardLayout({ user, children, currentView, onViewChange }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'My Projects', icon: Briefcase },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'gantt', label: 'Gantt Chart', icon: BarChart3 },
    { id: 'team', label: 'My Team', icon: Users },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ] as const;

  return (
    <div className="min-h-screen bg-[var(--bg)] flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-[220px] bg-[var(--sidebar-bg)] text-[var(--text-muted)] z-50 transform transition-transform duration-300 lg:relative lg:translate-x-0 border-r border-[var(--border)]",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col py-6">
          <div className="logo-container px-6 pb-8 flex items-center gap-3">
            <div className="target-logo-geo" />
            <span className="text-xl font-bold text-[var(--text-main)] tracking-tight">FocusFlow</span>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onViewChange(item.id);
                  setIsSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-6 py-3 text-sm transition-all font-bold uppercase tracking-widest text-[10px]",
                  currentView === item.id 
                    ? "text-[var(--accent)] bg-[var(--accent)]/5 border-r-4 border-[var(--accent)]" 
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--accent)]/5"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-[var(--border)]">
            <div className="flex items-center gap-3 px-6 mb-6">
              <div className="w-9 h-9 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] font-bold border border-[var(--border)]">
                {user.displayName?.[0] || user.email?.[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--text-main)] truncate">{user.displayName || 'User'}</p>
                <p className="text-[10px] text-[var(--text-muted)] truncate font-medium">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => signOut(auth)}
              className="w-full flex items-center gap-3 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-500 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-[var(--sidebar-bg)] border-b border-[var(--border)] flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 -ml-2 text-[var(--text-muted)] hover:bg-[var(--accent)]/5 rounded-lg"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <div className="project-info">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Project Dashboard /</p>
              <h2 className="text-lg font-bold text-[var(--text-main)] capitalize">
                {currentView === 'gantt' ? 'Project Timeline' : currentView}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-[var(--text-muted)] hover:bg-[var(--accent)]/5 rounded-lg transition-colors"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full text-[11px] font-bold transition-colors">
              <span className="w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse" />
              Live Sync
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto bg-[var(--bg)]">
          {children}
        </div>
      </main>
    </div>
  );
}
