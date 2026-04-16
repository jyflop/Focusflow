import { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { projectService } from '../lib/firestore';
import { Project, Task } from '../types';
import { 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Plus,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { formatDuration, cn } from '../lib/utils';

interface DashboardProps {
  onSelectProject: (id: string) => void;
}

export default function Dashboard({ onSelectProject }: DashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribeProjects = projectService.getProjects(auth.currentUser.uid, (projectsData) => {
      setProjects(projectsData);
      setLoading(false);
    });

    return () => unsubscribeProjects();
  }, []);

  const stats = [
    { 
      label: 'Active Projects', 
      value: projects.filter(p => p.status === 'Active').length, 
      icon: Briefcase, 
      color: 'text-blue-600 dark:text-blue-400', 
      bg: 'bg-blue-100 dark:bg-blue-900/30' 
    },
    { 
      label: 'Completed', 
      value: projects.filter(p => p.status === 'Completed').length, 
      icon: CheckCircle2, 
      color: 'text-green-600 dark:text-green-400', 
      bg: 'bg-green-100 dark:bg-green-900/30' 
    },
    { 
      label: 'Total Progress', 
      value: projects.length > 0 
        ? Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / projects.length) 
        : 0, 
      unit: '%',
      icon: TrendingUp, 
      color: 'text-purple-600 dark:text-purple-400', 
      bg: 'bg-purple-100 dark:bg-purple-900/30' 
    },
    { 
      label: 'Time Tracked', 
      value: projects.length > 0 ? '12:45:00' : '00:00:00', // Placeholder for now
      icon: Clock, 
      color: 'text-orange-600 dark:text-orange-400', 
      bg: 'bg-orange-100 dark:bg-orange-900/30' 
    },
  ];

  const chartData = projects.slice(0, 5).map(p => ({
    name: p.name.length > 10 ? p.name.substring(0, 10) + '...' : p.name,
    progress: p.progress
  }));

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-[var(--card-bg)] rounded-2xl border border-[var(--border)]" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-10 space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2.5 rounded-lg", stat.bg)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-2xl font-bold text-[var(--text-main)] mt-1">
                {stat.value}{stat.unit}
              </h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8">
        {/* Progress Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[var(--card-bg)] p-8 rounded-xl border border-[var(--border)] shadow-sm"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-base font-bold text-[var(--text-main)]">Project Progress Overview</h3>
            <div className="flex gap-2">
              <span className="pill pill-active">This Week</span>
              <span className="pill">This Month</span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }}
                  dx={-10}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  contentStyle={{ 
                    backgroundColor: 'var(--card-bg)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '8px',
                    color: 'var(--text-main)',
                    fontSize: '12px'
                  }}
                />
                <Bar 
                  dataKey="progress" 
                  fill="var(--accent)" 
                  radius={[4, 4, 0, 0]} 
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Recent Projects */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[var(--card-bg)] p-8 rounded-xl border border-[var(--border)] shadow-sm flex flex-col"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-[var(--text-main)]">Recent Projects</h3>
            <button 
              onClick={() => onSelectProject('new')}
              className="p-1.5 bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg hover:bg-[var(--accent)]/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3 flex-1">
            {projects.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-[var(--text-muted)] text-xs">No projects yet</p>
              </div>
            ) : (
              projects.slice(0, 4).map((project) => (
                <button
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  className={cn(
                    "w-full group flex items-center gap-4 p-4 rounded-xl hover:bg-[var(--accent)]/5 transition-all border border-[var(--border)]",
                    project.status === 'Completed' && "bg-green-500/5 dark:bg-green-900/10 border-green-500/20"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    project.status === 'Active' ? "bg-blue-500/10 text-blue-500" : "bg-slate-500/10 text-slate-500"
                  )}>
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <h4 className="font-bold text-[var(--text-main)] text-sm truncate">{project.name}</h4>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[var(--c-done)] rounded-full" 
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-[var(--text-muted)]">{project.progress}%</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[var(--accent)] transition-colors" />
                </button>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
