import React, { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { projectService } from '../lib/firestore';
import { Project, Task } from '../types';
import { 
  format, 
  differenceInDays, 
  startOfMonth, 
  addDays, 
  eachDayOfInterval,
  isSameDay,
  startOfDay
} from 'date-fns';
import { BarChart3, ChevronLeft, ChevronRight, Briefcase } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface GanttChartProps {
  onSelectProject: (id: string) => void;
}

export default function GanttChart({ onSelectProject }: GanttChartProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(startOfMonth(new Date()));
  const [selectedProjectId, setSelectedProjectId] = useState<string>('All');
  const [timeRange, setTimeRange] = useState<'week' | '1month' | '3months' | '6months' | '1year'>('1month');

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribe = projectService.getProjects(auth.currentUser.uid, (data) => {
      setProjects(data.filter(p => p.startDate && p.endDate));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const rangeConfigs = {
    week: { days: 7, label: 'Week', step: 7 },
    '1month': { days: 30, label: '1 Month', step: 7 },
    '3months': { days: 90, label: '3 Months', step: 30 },
    '6months': { days: 180, label: '6 Months', step: 30 },
    '1year': { days: 365, label: '1 Year', step: 30 }
  };

  const daysToShow = rangeConfigs[timeRange].days;
  const timelineDays = eachDayOfInterval({
    start: viewDate,
    end: addDays(viewDate, daysToShow - 1)
  });

  // Filter timeline days for display to avoid overcrowding
  const displayDays = timelineDays.filter((_, index) => {
    if (timeRange === 'week' || timeRange === '1month') return true;
    if (timeRange === '3months') return index % 3 === 0;
    if (timeRange === '6months') return index % 7 === 0;
    return index % 14 === 0;
  });

  const getProjectPosition = (project: Project) => {
    const start = startOfDay(new Date(project.startDate));
    const end = startOfDay(new Date(project.endDate));
    const timelineStart = startOfDay(viewDate);
    
    const offset = differenceInDays(start, timelineStart);
    const duration = differenceInDays(end, start) + 1;
    
    return { offset, duration };
  };

  const filteredProjects = projects.filter(p => selectedProjectId === 'All' || p.id === selectedProjectId);

  return (
    <div className="p-8 lg:p-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-[var(--text-main)]">Project Timeline</h2>
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Gantt Visualization</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Project Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Project:</span>
            <select 
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-[var(--card-bg)] text-[var(--text-main)] border border-[var(--border)] rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 shadow-sm"
            >
              <option value="All">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Time Range Filter */}
          <div className="flex bg-[var(--bg)] p-1 rounded-xl border border-[var(--border)]">
            {(Object.keys(rangeConfigs) as Array<keyof typeof rangeConfigs>).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  timeRange === range 
                    ? "bg-[var(--card-bg)] text-[var(--text-main)] shadow-sm" 
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                )}
              >
                {rangeConfigs[range].label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setViewDate(addDays(viewDate, -rangeConfigs[timeRange].step))}
              className="p-2 hover:bg-[var(--bg)] rounded-xl border border-[var(--border)] transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => {
                const now = new Date();
                setViewDate(timeRange === 'week' ? now : startOfMonth(now));
              }}
              className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-main)] hover:bg-[var(--bg)] rounded-xl border border-[var(--border)] transition-all"
            >
              Today
            </button>
            <button 
              onClick={() => setViewDate(addDays(viewDate, rangeConfigs[timeRange].step))}
              className="p-2 hover:bg-[var(--bg)] rounded-xl border border-[var(--border)] transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] shadow-sm overflow-x-auto">
        <div className="min-w-[1200px]">
          {/* Timeline Header */}
          <div className="flex border-b border-[var(--border)] bg-[var(--bg)] opacity-50">
            <div className="w-64 shrink-0 p-4 border-r border-[var(--border)] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Project Name
            </div>
            <div className="flex-1 flex">
              {displayDays.map((day) => (
                <div 
                  key={day.toString()} 
                  className={cn(
                    "flex-1 min-w-[40px] py-3 text-center border-r border-[var(--border)]",
                    (day.getDay() === 0 || day.getDay() === 6) && "bg-[var(--bg)]/50 opacity-40"
                  )}
                >
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{format(day, 'MMM d')}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Rows */}
          <div className="divide-y divide-[var(--border)]">
            {filteredProjects.length === 0 ? (
              <div className="p-12 text-center text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">
                No projects to display in timeline
              </div>
            ) : (
              filteredProjects.map((project) => {
                const { offset, duration } = getProjectPosition(project);
                
                return (
                  <div key={project.id} className="flex group hover:bg-[var(--bg)] transition-colors">
                    <div className="w-64 shrink-0 p-4 border-r border-[var(--border)] flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        project.status === 'Completed' ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500"
                      )}>
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <span 
                        className="text-xs font-bold text-[var(--text-main)] truncate cursor-pointer hover:text-[var(--accent)]"
                        onClick={() => onSelectProject(project.id)}
                      >
                        {project.name}
                      </span>
                    </div>
                    <div className="flex-1 flex relative h-14 items-center">
                      {/* Grid Lines */}
                      {displayDays.map((day) => (
                        <div 
                          key={day.toString()} 
                          className={cn(
                            "flex-1 min-w-[40px] h-full border-r border-[var(--border)]",
                            (day.getDay() === 0 || day.getDay() === 6) && "bg-[var(--bg)]/20"
                          )}
                        />
                      ))}

                      {/* Project Bar */}
                      {(offset + duration > 0 && offset < daysToShow) && (
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={cn(
                            "absolute h-8 rounded-lg shadow-sm flex items-center px-3 overflow-hidden group/bar",
                            project.status === 'Completed' ? "bg-green-500" : "bg-indigo-500"
                          )}
                          style={{
                            left: `${Math.max(0, offset) * (100 / daysToShow)}%`,
                            width: `${Math.min(daysToShow - Math.max(0, offset), duration + Math.min(0, offset)) * (100 / daysToShow)}%`
                          }}
                        >
                          <div 
                            className="absolute inset-0 bg-black/10 transition-all"
                            style={{ width: `${project.progress}%` }}
                          />
                          <span className="relative z-10 text-[9px] font-bold text-white truncate">
                            {project.progress}%
                          </span>
                        </motion.div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
