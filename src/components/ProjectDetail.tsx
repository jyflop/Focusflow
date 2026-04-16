import React, { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { projectService, taskService, userService } from '../lib/firestore';
import { Project, Task, TaskPriority, TaskStatus, UserProfile } from '../types';
import { 
  ArrowLeft, 
  Plus, 
  Clock, 
  Calendar, 
  MoreVertical,
  GripVertical,
  Trash2,
  CheckCircle2,
  Circle,
  Target,
  Play,
  Pause,
  RotateCcw,
  Edit2,
  ExternalLink,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn, formatDuration } from '../lib/utils';
import TaskDetail from './TaskDetail';
import UserPicker from './UserPicker';

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
}

export default function ProjectDetail({ projectId, onBack }: ProjectDetailProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>('All');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'All'>('All');
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // New Task Form
  const [taskName, setTaskName] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('Medium');
  const [taskDueDate, setTaskDueDate] = useState('');

  // Edit Project Form
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDescription, setEditProjectDescription] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribeProject = projectService.getProject(auth.currentUser.uid, projectId, (data) => {
      setProject(data);
      setEditProjectName(data.name);
      setEditProjectDescription(data.description);
    });

    const unsubscribeTasks = taskService.getTasks(auth.currentUser.uid, projectId, (data) => {
      setTasks(data);
      setLoading(false);
    });

    return () => {
      unsubscribeProject();
      unsubscribeTasks();
    };
  }, [projectId]);

  // Auto-update project progress whenever tasks change
  useEffect(() => {
    if (!auth.currentUser || !project || tasks.length === 0) return;

    const totalProgress = tasks.reduce((acc, task) => acc + (task.progress || 0), 0);
    const calculatedProgress = Math.round(totalProgress / tasks.length);

    if (calculatedProgress !== project.progress) {
      const status = calculatedProgress === 100 ? 'Completed' : 'Active';
      projectService.updateProject(auth.currentUser.uid, projectId, {
        progress: calculatedProgress,
        status,
      });
    }
  }, [tasks, project?.id]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !taskName.trim()) return;

    try {
      await taskService.createTask(auth.currentUser.uid, projectId, {
        name: taskName,
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        dueDate: taskDueDate,
        priority: taskPriority,
        status: 'Not Started',
        progress: 0,
        order: tasks.length,
        totalTimeSpent: 0,
      });
      setTaskName('');
      setTaskDueDate('');
      setIsAddTaskOpen(false);
    } catch (error) {
      // Error handled in service
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !auth.currentUser) return;

    const oldIndex = tasks.findIndex(t => t.id === active.id);
    const newIndex = tasks.findIndex(t => t.id === over.id);
    const newTasks: Task[] = arrayMove(tasks, oldIndex, newIndex);
    
    setTasks(newTasks);

    // Update orders in Firestore
    try {
      for (let i = 0; i < newTasks.length; i++) {
        await taskService.updateTask(auth.currentUser.uid, projectId, newTasks[i].id, { order: i });
      }
    } catch (error) {
      // Error handled in service
    }
  };


  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !editProjectName.trim()) return;

    try {
      await projectService.updateProject(auth.currentUser.uid, projectId, {
        name: editProjectName,
        description: editProjectDescription,
      });
      setIsEditProjectOpen(false);
    } catch (error) {
      // Error handled in service
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: TaskStatus) => {
    if (!auth.currentUser) return;
    try {
      await taskService.updateTask(auth.currentUser.uid, projectId, taskId, {
        status,
      });
    } catch (error) {
      // Error handled in service
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !editingTask || !editingTask.name.trim()) return;

    try {
      await taskService.updateTask(auth.currentUser.uid, projectId, editingTask.id, {
        name: editingTask.name,
        priority: editingTask.priority,
        dueDate: editingTask.dueDate,
      });
      setEditingTask(null);
    } catch (error) {
      // Error handled in service
    }
  };

  if (loading || !project) return null;

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = statusFilter === 'All' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'All' || task.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

  if (selectedTaskId) {
    return (
      <TaskDetail 
        projectId={projectId}
        taskId={selectedTaskId}
        onBack={() => setSelectedTaskId(null)}
      />
    );
  }

  return (
    <div className="p-8 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-main)] font-bold transition-colors w-fit text-[10px] uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-[var(--text-main)] tracking-tight">{project.name}</h1>
              <div className={cn(
                "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                project.status === 'Active' ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" :
                project.status === 'Completed' ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400" :
                "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
              )}>
                {project.status}
              </div>
              <button 
                onClick={() => setIsEditProjectOpen(true)}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/5 rounded-lg transition-all"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[var(--text-muted)] text-sm max-w-2xl leading-relaxed">{project.description}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-[var(--card-bg)] p-4 rounded-xl border border-[var(--border)] shadow-sm min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Delegated To</span>
              </div>
              <UserPicker 
                selectedUserId={project.assigneeId}
                onSelect={async (user) => {
                  try {
                    await projectService.updateProject(auth.currentUser!.uid, projectId, {
                      assigneeId: user.uid,
                      assigneeName: user.displayName || user.email,
                      assigneePhoto: user.photoURL || null
                    });
                  } catch (error) {}
                }}
              />
            </div>

            <div className="flex items-center gap-6 bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border)] shadow-sm h-full max-h-[100px]">
            <div className="text-right">
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Overall Progress</p>
              <p className="text-2xl font-bold text-[var(--text-main)] mt-1">{project.progress}%</p>
            </div>
            <div className="w-16 h-16 relative">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  className="text-slate-100 dark:text-slate-700 stroke-current"
                  strokeWidth="8"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                />
                <motion.circle
                  className="text-[var(--c-done)] stroke-current"
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 40}
                  initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - project.progress / 100) }}
                  strokeLinecap="round"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Task List */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-widest">Project Tasks</h2>
            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'Task' : 'Tasks'} Found
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {/* Status Filter */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Status:</span>
        <div className="flex bg-[var(--bg)] p-1 rounded-lg border border-[var(--border)]">
          {['All', 'Not Started', 'In Progress', 'Completed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as any)}
              className={cn(
                "px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all",
                statusFilter === status 
                  ? "bg-[var(--card-bg)] text-[var(--text-main)] shadow-sm" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

            {/* Priority Filter */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Priority:</span>
        <div className="flex bg-[var(--bg)] p-1 rounded-lg border border-[var(--border)]">
          {['All', 'Low', 'Medium', 'High'].map((priority) => (
            <button
              key={priority}
              onClick={() => setPriorityFilter(priority as any)}
              className={cn(
                "px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all",
                priorityFilter === priority 
                  ? "bg-[var(--card-bg)] text-[var(--text-main)] shadow-sm" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              )}
            >
              {priority}
            </button>
          ))}
        </div>
      </div>

            <button 
              onClick={() => setIsAddTaskOpen(true)}
              className="flex items-center gap-2 bg-[var(--btn-bg)] text-[var(--btn-text)] hover:bg-[var(--btn-hover)] px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/5 ml-auto"
            >
              <Plus className="w-4 h-4" />
              Add Task
            </button>
          </div>
        </div>

        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
          <div className="px-6 py-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg)] opacity-50">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4" /> {/* Spacer for drag handle */}
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Task Name</span>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
              <span className="w-24 text-center">Priority</span>
              <span className="w-24 text-center">Status</span>
            </div>
          </div>

          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={filteredTasks.map(t => t.id as any)}
              strategy={verticalListSortingStrategy}
            >
              <div className="divide-y divide-[var(--border)]">
                {filteredTasks.map((task) => (
                  <SortableTaskItem 
                    key={task.id} 
                    task={task} 
                    onClick={() => setSelectedTaskId(task.id)}
                    onStart={() => handleUpdateTaskStatus(task.id, 'In Progress')}
                    onEdit={() => setEditingTask(task)}
                    onDelete={async (e) => {
                      e.stopPropagation();
                      if (!auth.currentUser) return;
                      await taskService.deleteTask(auth.currentUser.uid, projectId, task.id);
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {filteredTasks.length === 0 && !isAddTaskOpen && (
            <div className="text-center py-20">
              <p className="text-[var(--text-muted)] text-xs">No tasks match your filters.</p>
            </div>
          )}
        </div>

        {isAddTaskOpen && (
          <motion.form 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleAddTask}
            className="bg-[var(--card-bg)] p-6 rounded-2xl border-2 border-[var(--accent)] shadow-xl space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Task Name</label>
                <input
                  autoFocus
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="What needs to be done?"
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Priority</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] font-bold"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Due Date</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button"
                onClick={() => setIsAddTaskOpen(false)}
                className="px-4 py-2 text-[var(--text-muted)] font-bold hover:bg-[var(--bg)] rounded-lg text-xs uppercase tracking-widest"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-6 py-2 bg-[var(--btn-bg)] text-[var(--btn-text)] hover:bg-[var(--btn-hover)] font-bold rounded-lg transition-all text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/5"
              >
                Save Task
              </button>
            </div>
          </motion.form>
        )}

        {/* Edit Project Modal */}
        <AnimatePresence>
          {isEditProjectOpen && (
            <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsEditProjectOpen(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-[var(--card-bg)] border border-[var(--border)] w-full max-w-lg rounded-2xl shadow-2xl relative z-10 overflow-hidden"
              >
                <div className="p-8">
                  <h3 className="text-xl font-bold text-[var(--text-main)] mb-6">Edit Project</h3>
                  <form onSubmit={handleUpdateProject} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Project Name</label>
                      <input
                        autoFocus
                        value={editProjectName}
                        onChange={(e) => setEditProjectName(e.target.value)}
                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Description</label>
                      <textarea
                        value={editProjectDescription}
                        onChange={(e) => setEditProjectDescription(e.target.value)}
                        rows={4}
                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <button 
                        type="button"
                        onClick={() => setIsEditProjectOpen(false)}
                        className="px-6 py-2.5 text-[var(--text-muted)] font-bold hover:bg-[var(--bg)] rounded-xl text-[10px] uppercase tracking-widest"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="px-8 py-2.5 bg-[var(--btn-bg)] text-[var(--btn-text)] hover:bg-[var(--btn-hover)] font-bold rounded-xl transition-all text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/5"
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

        {/* Edit Task Modal */}
        <AnimatePresence>
          {editingTask && (
            <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setEditingTask(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-[var(--card-bg)] border border-[var(--border)] w-full max-w-lg rounded-2xl shadow-2xl relative z-10 overflow-hidden"
              >
                <div className="p-8">
                  <h3 className="text-xl font-bold text-[var(--text-main)] mb-6">Edit Task</h3>
                  <form onSubmit={handleUpdateTask} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Task Name</label>
                      <input
                        autoFocus
                        value={editingTask.name}
                        onChange={(e) => setEditingTask({...editingTask, name: e.target.value})}
                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Priority</label>
                        <select
                          value={editingTask.priority}
                          onChange={(e) => setEditingTask({...editingTask, priority: e.target.value as TaskPriority})}
                          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] font-bold"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Due Date</label>
                        <input
                          type="date"
                          value={editingTask.dueDate || ''}
                          onChange={(e) => setEditingTask({...editingTask, dueDate: e.target.value})}
                          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)]"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <button 
                        type="button"
                        onClick={() => setEditingTask(null)}
                        className="px-6 py-2.5 text-[var(--text-muted)] font-bold hover:bg-[var(--bg)] rounded-xl text-[10px] uppercase tracking-widest"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="px-8 py-2.5 bg-[var(--btn-bg)] text-[var(--btn-text)] hover:bg-[var(--btn-hover)] font-bold rounded-xl transition-all text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/5"
                      >
                        Update Task
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SortableTaskItem({ task, onClick, onStart, onEdit, onDelete }: { task: Task, onClick: () => void, onStart: () => void, onEdit: () => void, onDelete: (e: any) => void, [key: string]: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  const priorityColors = {
    Low: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30',
    Medium: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30',
    High: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30'
  };

  const priorityDots = {
    Low: 'bg-blue-500',
    Medium: 'bg-orange-500',
    High: 'bg-red-500'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-4 p-4 hover:bg-[var(--bg)] transition-all cursor-pointer",
        task.status === 'Completed' && "opacity-60 grayscale",
        isDragging && "bg-[var(--card-bg)] shadow-xl z-50"
      )}
    >
      <div 
        {...attributes} 
        {...listeners}
        className="p-1 text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0 flex items-center gap-3">
        <div className={cn("priority-dot shrink-0", priorityDots[task.priority])} />
        <div className="flex-1 min-w-0">
          <h4 className={cn(
            "text-sm font-bold text-[var(--text-main)] truncate",
            task.status === 'Completed' && "line-through opacity-50"
          )}>
            {task.name}
          </h4>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 h-2 bg-[var(--bg)] rounded-full overflow-hidden border border-[var(--border)]">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${task.progress}%` }}
                className={cn(
                  "h-full transition-all",
                  task.progress === 100 ? "bg-[var(--c-done)]" : "bg-[var(--accent)]"
                )}
              />
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-main)] uppercase tracking-widest">
              {task.progress}%
              {task.status === 'Completed' && <Target className="w-3 h-3 text-green-500 ml-1" />}
            </div>
            {task.dueDate && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                <Calendar className="w-3 h-3" />
                {task.dueDate}
              </div>
            )}
            {task.totalTimeSpent > 0 && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                <Clock className="w-3 h-3" />
                {formatDuration(task.totalTimeSpent)}
              </div>
            )}
            {task.assigneeId && (
              <div className="flex items-center gap-1 border-l border-[var(--border)] pl-3">
                <div className="w-4 h-4 rounded-full overflow-hidden border border-[var(--border)] bg-[var(--bg)]">
                  {task.assigneePhoto ? (
                    <img src={task.assigneePhoto} alt={task.assigneeName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--accent)] font-bold text-[7px]">
                      {task.assigneeName?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest truncate max-w-[60px]">
                  {task.assigneeName?.split(' ')[0]}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        {task.status === 'Not Started' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStart();
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--accent)]/20 transition-all"
          >
            <Play className="w-3 h-3" />
            Start
          </button>
        )}
        <div className="w-24 flex justify-center">
          <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider", priorityColors[task.priority])}>
            {task.priority}
          </span>
        </div>
        <div className="w-24 flex justify-center">
          <div className={cn(
            "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider",
            task.status === 'Completed' ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400" :
            task.status === 'In Progress' ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" :
            "bg-[var(--bg)] text-[var(--text-muted)]"
          )}>
            {task.status}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1.5 text-slate-300 hover:text-[var(--accent)] hover:bg-[var(--accent)]/5 rounded-lg transition-all"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={onDelete}
            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
