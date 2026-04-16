import React, { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { projectService, taskService } from '../lib/firestore';
import { Project, Task } from '../types';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  addWeeks,
  subWeeks,
  addYears,
  subYears,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  isToday 
} from 'date-fns';
import { ChevronLeft, ChevronRight, Briefcase, Calendar as CalendarIcon, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { safelyFormatDate, parseDate } from '../lib/dateUtils';
import { isValid } from 'date-fns';

interface CalendarViewProps {
  onSelectProject: (id: string) => void;
}

export default function CalendarView({ onSelectProject }: CalendarViewProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'week' | 'month' | 'year'>('month');
  const [selectedProjectTasks, setSelectedProjectTasks] = useState<{ project: Project; tasks: Task[] } | null>(null);
  const [selectedDayProjects, setSelectedDayProjects] = useState<{ day: Date; projects: Project[] } | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribe = projectService.getProjects(auth.currentUser.uid, (data) => {
      setProjects(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDayClick = (day: Date) => {
    const dayProjects = getProjectsForDay(day);
    if (dayProjects.length > 0) {
      setSelectedDayProjects({ day, projects: dayProjects });
    }
  };

  const handleProjectClick = async (project: Project, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!auth.currentUser) return;

    // Show immediate loading or just clear previous
    setSelectedProjectTasks({ project, tasks: [] });
    setSelectedDayProjects(null); // Close the day view if it was open

    taskService.getTasks(auth.currentUser.uid, project.id, (tasks) => {
      setSelectedProjectTasks({ project, tasks });
    });
  };

  const handlePrevious = () => {
    if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
    else setCurrentDate(subYears(currentDate, 1));
  };

  const handleNext = () => {
    if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
    else setCurrentDate(addYears(currentDate, 1));
  };

  const getProjectsForDay = (day: Date) => {
    return projects.filter(p => {
      const start = parseDate(p.startDate);
      const end = parseDate(p.endDate);
      if (!start || !end) return false;
      return isSameDay(day, start) || isSameDay(day, end) || (day >= start && day <= end);
    });
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--bg)] opacity-50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-3 text-center text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 divide-x divide-y divide-[var(--border)]">
          {calendarDays.map((day) => {
            const isCurrentMonth = isSameMonth(day, monthStart);
            const dayProjects = getProjectsForDay(day);
            
            return (
              <div 
                key={day.toString()} 
                onClick={() => handleDayClick(day)}
                className={cn(
                  "min-h-[120px] p-2 transition-colors cursor-pointer hover:bg-[var(--bg)]/80",
                  !isCurrentMonth && "bg-[var(--bg)] opacity-30",
                  isToday(day) && "bg-[var(--accent)]/5"
                )}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className={cn(
                    "text-xs font-bold",
                    isToday(day) ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
                  )}>
                    {safelyFormatDate(day, 'd')}
                  </span>
                </div>
                <div className="space-y-1">
                  {dayProjects.slice(0, 3).map(project => (
                    <button
                      key={project.id}
                      onClick={(e) => handleProjectClick(project, e)}
                      className={cn(
                        "w-full text-left px-2 py-1 rounded-md text-[9px] font-bold truncate transition-all",
                        project.status === 'Completed' 
                          ? "bg-green-500/10 text-green-500 border-green-500/20" 
                          : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                      )}
                    >
                      {project.name}
                    </button>
                  ))}
                  {dayProjects.length > 3 && (
                    <div className="text-[8px] font-bold text-[var(--accent)] px-1 mt-1">
                      + {dayProjects.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startDate = startOfWeek(currentDate);
    const endDate = endOfWeek(currentDate);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--bg)] opacity-50">
          {calendarDays.map(day => (
            <div key={day.toString()} className="py-4 text-center space-y-1">
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{safelyFormatDate(day, 'EEE')}</p>
              <p className={cn(
                "text-lg font-bold",
                isToday(day) ? "text-[var(--accent)]" : "text-[var(--text-main)]"
              )}>{safelyFormatDate(day, 'd')}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 divide-x divide-[var(--border)] min-h-[400px]">
          {calendarDays.map((day) => {
            const dayProjects = getProjectsForDay(day);
            return (
              <div 
                key={day.toString()} 
                onClick={() => handleDayClick(day)}
                className={cn(
                  "p-4 space-y-2 cursor-pointer hover:bg-[var(--bg)]/80 transition-all",
                  isToday(day) && "bg-[var(--accent)]/5"
                )}
              >
                {dayProjects.map(project => (
                  <button
                    key={project.id}
                    onClick={(e) => handleProjectClick(project, e)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl text-[10px] font-bold transition-all border shadow-sm",
                      project.status === 'Completed' 
                        ? "bg-green-500/10 text-green-500 border-green-500/20" 
                        : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                    )}
                  >
                    <p className="truncate">{project.name}</p>
                    <p className="text-[8px] opacity-70 mt-1 uppercase tracking-widest">{project.status}</p>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderYearView = () => {
    const yearStart = startOfYear(currentDate);
    const yearEnd = endOfYear(currentDate);
    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {months.map((month) => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(monthStart);
          const startDate = startOfWeek(monthStart);
          const endDate = endOfWeek(monthEnd);
          const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

          return (
            <div key={month.toString()} className="bg-[var(--card-bg)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
              <h3 className="text-sm font-bold text-[var(--text-main)] mb-4 px-1">{safelyFormatDate(month, 'MMMM')}</h3>
              <div className="grid grid-cols-7 gap-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i} className="text-[8px] font-bold text-[var(--text-muted)] text-center py-1">{d}</div>
                ))}
                {calendarDays.map((day) => {
                  const isCurrentMonth = isSameMonth(day, month);
                  const dayProjects = getProjectsForDay(day);
                  const hasProjects = dayProjects.length > 0;
                  
                  return (
                    <button 
                      key={day.toString()}
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        "aspect-square flex items-center justify-center text-[9px] rounded-md transition-all",
                        !isCurrentMonth && "opacity-0 pointer-events-none",
                        isToday(day) && "bg-[var(--accent)] text-[var(--bg)]",
                        hasProjects && !isToday(day) && "bg-[var(--accent)]/10 text-[var(--accent)] font-bold cursor-pointer hover:bg-[var(--accent)]/20 shadow-sm"
                      )}
                    >
                      {safelyFormatDate(day, 'd')}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-8 lg:p-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-[var(--text-main)]">
            {view === 'year' ? safelyFormatDate(currentDate, 'yyyy') : safelyFormatDate(currentDate, 'MMMM yyyy')}
          </h2>
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Project Schedule</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* View Toggles */}
          <div className="flex bg-[var(--bg)] p-1 rounded-xl border border-[var(--border)]">
            {(['week', 'month', 'year'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  view === v 
                    ? "bg-[var(--card-bg)] text-[var(--text-main)] shadow-sm" 
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                )}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrevious}
              className="p-2 hover:bg-[var(--bg)] rounded-xl border border-[var(--border)] transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-main)] hover:bg-[var(--bg)] rounded-xl border border-[var(--border)] transition-all"
            >
              Today
            </button>
            <button 
              onClick={handleNext}
              className="p-2 hover:bg-[var(--bg)] rounded-xl border border-[var(--border)] transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={view + currentDate.toString()}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {view === 'week' && renderWeekView()}
          {view === 'month' && renderMonthView()}
          {view === 'year' && renderYearView()}
        </motion.div>
      </AnimatePresence>

      {/* Day Details Popup */}
      <AnimatePresence>
        {selectedDayProjects && (
          <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDayProjects(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[var(--card-bg)] border border-[var(--border)] w-full max-w-sm rounded-2xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-main)]">{safelyFormatDate(selectedDayProjects.day, 'MMMM d, yyyy')}</h3>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-0.5">Projects on this day</p>
                </div>
                <button onClick={() => setSelectedDayProjects(null)} className="p-2 hover:bg-[var(--bg)] rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-2">
                {selectedDayProjects.projects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectClick(project)}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-[var(--border)] group hover:border-[var(--accent)] transition-all bg-[var(--bg)]/40 hover:bg-[var(--bg)]/80"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                        <Briefcase className="w-4 h-4 text-[var(--accent)]" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-[var(--text-main)] group-hover:text-[var(--accent)] transition-colors">{project.name}</p>
                        <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest mt-0.5">{project.status}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-all translate-x-0 group-hover:translate-x-1" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Task List Popup */}
      <AnimatePresence>
        {selectedProjectTasks && (
          <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProjectTasks(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[var(--card-bg)] border border-[var(--border)] w-full max-w-lg rounded-2xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-main)]">{selectedProjectTasks.project.name}</h3>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">
                    Project Tasks ({selectedProjectTasks.tasks.length})
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedProjectTasks(null)}
                  className="p-2 hover:bg-[var(--bg)] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 max-h-[400px] overflow-y-auto space-y-3">
                {selectedProjectTasks.tasks.length === 0 ? (
                  <p className="text-center py-8 text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest">
                    No tasks found for this project
                  </p>
                ) : (
                  selectedProjectTasks.tasks.map(task => (
                    <div 
                      key={task.id}
                      className={cn(
                        "p-4 rounded-xl border border-[var(--border)] flex items-center justify-between group hover:border-[var(--accent)] transition-all",
                        task.status === 'Completed' && "bg-[var(--bg)]/50 opacity-60"
                      )}
                    >
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-2">
                          <h4 className={cn(
                            "text-sm font-bold text-[var(--text-main)] truncate",
                            task.status === 'Completed' && "line-through"
                          )}>
                            {task.name}
                          </h4>
                          {task.status === 'Completed' && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <div className={cn(
                            "px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider",
                            task.priority === 'High' ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400" :
                            task.priority === 'Medium' ? "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" :
                            "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                          )}>
                            {task.priority}
                          </div>
                          <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                            {task.progress}% Complete
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedProjectTasks(null);
                          onSelectProject(selectedProjectTasks.project.id);
                        }}
                        className="p-2 bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                      >
                         <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="p-6 bg-[var(--bg)]/50 border-t border-[var(--border)] flex justify-end">
                <button 
                  onClick={() => {
                    onSelectProject(selectedProjectTasks.project.id);
                    setSelectedProjectTasks(null);
                  }}
                  className="px-6 py-2.5 bg-[var(--btn-bg)] text-[var(--btn-text)] hover:bg-[var(--btn-hover)] font-bold rounded-xl transition-all text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/5"
                >
                  View Full Project
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
