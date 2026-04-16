import React, { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { projectService } from '../lib/firestore';
import { Project, ProjectStatus } from '../types';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Calendar, 
  Trash2, 
  Edit2,
  AlertCircle,
  Briefcase
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { safelyFormatDate } from '../lib/dateUtils';

interface ProjectListProps {
  onSelectProject: (id: string) => void;
}

export default function ProjectList({ onSelectProject }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'All'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  // New Project Form
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');

  // Edit Project Form
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribe = projectService.getProjects(auth.currentUser.uid, (data) => {
      setProjects(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      await projectService.createProject(auth.currentUser.uid, {
        name: newName,
        description: newDesc,
        startDate: newStart,
        endDate: newEnd,
        status: 'Active',
        progress: 0,
      });
      setIsModalOpen(false);
      setNewName('');
      setNewDesc('');
      setNewStart('');
      setNewEnd('');
    } catch (error) {
      // Error handled in service
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!auth.currentUser || !window.confirm('Are you sure you want to delete this project?')) return;
    
    try {
      await projectService.deleteProject(auth.currentUser.uid, id);
    } catch (error) {
      // Error handled in service
    }
  };

  const handleEditProject = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(project);
    setEditName(project.name);
    setEditDesc(project.description);
    setEditStart(project.startDate || '');
    setEditEnd(project.endDate || '');
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !editingProject) return;

    try {
      await projectService.updateProject(auth.currentUser.uid, editingProject.id, {
        name: editName,
        description: editDesc,
        startDate: editStart,
        endDate: editEnd,
      });
      setEditingProject(null);
    } catch (error) {
      // Error handled in service
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 lg:p-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-[var(--bg)] p-1 rounded-xl border border-[var(--border)]">
            {(['All', 'Active', 'Completed'] as (ProjectStatus | 'All')[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                  statusFilter === status 
                    ? "bg-[var(--card-bg)] text-[var(--text-main)] shadow-sm" 
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                )}
              >
                {status}
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2 bg-[var(--btn-bg)] text-[var(--btn-text)] hover:bg-[var(--btn-hover)] rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/5 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] animate-pulse" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[var(--card-bg)] rounded-3xl border border-dashed border-[var(--border)]">
          <div className="w-16 h-16 bg-[var(--accent)]/10 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-[var(--accent)]" />
          </div>
          <h3 className="text-lg font-bold text-[var(--text-main)]">No projects found</h3>
          <p className="text-[var(--text-muted)] mt-1">Try adjusting your search or create a new project</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project) => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                onClick={() => onSelectProject(project.id)}
                className={cn(
                  "group bg-[var(--card-bg)] rounded-xl border border-[var(--border)] shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col",
                  project.status === 'Completed' && "bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30"
                )}
              >
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      project.status === 'Active' ? "bg-blue-500/10 text-blue-500" : "bg-green-500/10 text-green-500"
                    )}>
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                        project.status === 'Active' ? "bg-blue-500/10 text-blue-500" :
                        project.status === 'Completed' ? "bg-green-500/10 text-green-500" :
                        "bg-orange-500/10 text-orange-500"
                      )}>
                        {project.status}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={(e) => handleEditProject(project, e)}
                          className="p-1.5 text-slate-300 hover:text-[var(--accent)] hover:bg-[var(--accent)]/5 rounded-lg transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteProject(project.id, e)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-[var(--text-main)] mb-2 group-hover:text-[var(--accent)] transition-colors truncate">
                    {project.name}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-6 leading-relaxed h-8">
                    {project.description || 'No description provided.'}
                  </p>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                      <span>Progress</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${project.progress}%` }}
                        className={cn(
                          "h-full rounded-full",
                          project.status === 'Completed' ? "bg-[var(--c-done)]" : "bg-[var(--accent)]"
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 bg-[var(--bg)] border-t border-[var(--border)] flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)]">
                      <Calendar className="w-3.5 h-3.5" />
                      {safelyFormatDate(project.endDate, 'MMM d, yyyy', 'No deadline')}
                    </div>
                    {project.assigneeId && (
                      <div className="flex items-center gap-2 border-l border-[var(--border)] pl-4">
                        <div className="w-5 h-5 rounded-full overflow-hidden border border-[var(--border)] bg-[var(--bg)]">
                          {project.assigneePhoto ? (
                            <img src={project.assigneePhoto} alt={project.assigneeName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[var(--accent)] font-bold text-[8px]">
                              {project.assigneeName?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest truncate max-w-[80px]">
                          {project.assigneeName?.split(' ')[0]}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-bold text-[var(--accent)] group-hover:underline">View Details</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* New Project Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[var(--card-bg)] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-[var(--border)]"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-[var(--text-main)]">Create New Project</h3>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-[var(--bg)] rounded-xl transition-colors"
                  >
                    <Plus className="w-5 h-5 rotate-45 text-[var(--text-muted)]" />
                  </button>
                </div>

                <form onSubmit={handleCreateProject} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Project Name</label>
                    <input
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 transition-all text-[var(--text-main)]"
                      placeholder="e.g. Website Redesign"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Description</label>
                    <textarea
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-3 px-4 h-24 resize-none text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
                      placeholder="What's this project about?"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Start Date</label>
                      <input
                        type="date"
                        value={newStart}
                        onChange={(e) => setNewStart(e.target.value)}
                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-3 px-4 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">End Date</label>
                      <input
                        type="date"
                        value={newEnd}
                        onChange={(e) => setNewEnd(e.target.value)}
                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-3 px-4 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-6 py-3 border border-[var(--border)] text-[var(--text-muted)] font-bold rounded-xl hover:bg-[var(--bg)] transition-all text-[10px] uppercase tracking-widest"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-[var(--btn-bg)] text-[var(--btn-text)] hover:bg-[var(--btn-hover)] font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/5 text-[10px] uppercase tracking-widest"
                    >
                      Create Project
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Project Modal */}
      <AnimatePresence>
        {editingProject && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[var(--card-bg)] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-[var(--border)]"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-[var(--text-main)]">Edit Project</h3>
                  <button 
                    onClick={() => setEditingProject(null)}
                    className="p-2 hover:bg-[var(--bg)] rounded-xl transition-colors"
                  >
                    <Plus className="w-5 h-5 rotate-45 text-[var(--text-muted)]" />
                  </button>
                </div>

                <form onSubmit={handleUpdateProject} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Project Name</label>
                    <input
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-3 px-4 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Description</label>
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-3 px-4 h-24 resize-none text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Start Date</label>
                      <input
                        type="date"
                        value={editStart}
                        onChange={(e) => setEditStart(e.target.value)}
                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-3 px-4 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">End Date</label>
                      <input
                        type="date"
                        value={editEnd}
                        onChange={(e) => setEditEnd(e.target.value)}
                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-3 px-4 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setEditingProject(null)}
                      className="flex-1 px-6 py-3 border border-[var(--border)] text-[var(--text-muted)] font-bold rounded-xl hover:bg-[var(--bg)] transition-all text-[10px] uppercase tracking-widest"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-[var(--btn-bg)] text-[var(--btn-text)] hover:bg-[var(--btn-hover)] font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/5 text-[10px] uppercase tracking-widest"
                    >
                      Update Project
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
