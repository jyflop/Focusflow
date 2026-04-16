import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../lib/firebase';
import { taskService, milestoneService, timeLogService } from '../lib/firestore';
import { Task, Milestone } from '../types';
import { 
  ArrowLeft, 
  Plus, 
  Clock, 
  Play, 
  Pause, 
  RotateCcw,
  CheckCircle2,
  Circle,
  GripVertical,
  Trash2,
  Target,
  Calendar,
  Edit2,
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
import UserPicker from './UserPicker';

interface TaskDetailProps {
  projectId: string;
  taskId: string;
  onBack: () => void;
}

export default function TaskDetail({ projectId, taskId, onBack }: TaskDetailProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [newMilestoneName, setNewMilestoneName] = useState('');
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribeTask = taskService.getTask(auth.currentUser.uid, projectId, taskId, (data) => {
      setTask(data);
      setElapsedTime(data.totalTimeSpent || 0);
    });

    const unsubscribeMilestones = milestoneService.getMilestones(auth.currentUser.uid, projectId, taskId, (data) => {
      setMilestones(data);
      setLoading(false);
    });

    return () => {
      unsubscribeTask();
      unsubscribeMilestones();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [projectId, taskId]);

  // Auto-update task progress whenever milestones change
  useEffect(() => {
    if (!auth.currentUser || !task) return;

    const completedCount = milestones.filter(m => m.completed).length;
    const progress = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;
    const status = progress === 100 ? 'Completed' : (progress > 0 ? 'In Progress' : task.status === 'Completed' ? 'In Progress' : task.status);

    // Only update if there's a real change to avoid loops
    if (progress !== task.progress || status !== task.status) {
      taskService.updateTask(auth.currentUser.uid, projectId, taskId, {
        progress,
        status,
      });
    }
  }, [milestones, task?.id]); // Depend on milestones and task ID to ensure we have the right task context

  const toggleTimer = async () => {
    if (!auth.currentUser || !task) return;

    if (isTimerRunning) {
      // Stop timer and save
      if (timerRef.current) clearInterval(timerRef.current);
      setIsTimerRunning(false);
      
      const duration = Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000);
      
      await taskService.updateTask(auth.currentUser.uid, projectId, taskId, {
        totalTimeSpent: (task.totalTimeSpent || 0) + duration,
      });

      await timeLogService.createTimeLog(auth.currentUser.uid, projectId, taskId, {
        duration,
        startTime: new Date(startTimeRef.current!).toISOString(),
        endTime: new Date().toISOString()
      });
    } else {
      // Start timer
      setIsTimerRunning(true);
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newMilestoneName.trim()) return;

    try {
      await milestoneService.createMilestone(auth.currentUser.uid, projectId, taskId, {
        name: newMilestoneName,
        completed: false,
        order: milestones.length,
      });
      setNewMilestoneName('');
    } catch (error) {
      // Error handled in service
    }
  };

  const toggleMilestone = async (milestone: Milestone) => {
    if (!auth.currentUser) return;
    await milestoneService.updateMilestone(auth.currentUser.uid, projectId, taskId, milestone.id, { 
      completed: !milestone.completed 
    });
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !auth.currentUser) return;

    const oldIndex = milestones.findIndex(m => m.id === active.id);
    const newIndex = milestones.findIndex(m => m.id === over.id);
    const newMilestones: Milestone[] = arrayMove(milestones, oldIndex, newIndex);
    
    setMilestones(newMilestones);

    try {
      for (let i = 0; i < newMilestones.length; i++) {
        await milestoneService.updateMilestone(auth.currentUser.uid, projectId, taskId, newMilestones[i].id, { order: i });
      }
    } catch (error) {
      // Error handled in service
    }
  };

  const handleUpdateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !editingMilestone || !editingMilestone.name.trim()) return;

    try {
      await milestoneService.updateMilestone(auth.currentUser.uid, projectId, taskId, editingMilestone.id, {
        name: editingMilestone.name,
      });
      setEditingMilestone(null);
    } catch (error) {
      // Error handled in service
    }
  };

  if (loading || !task) return null;

  return (
    <div className="p-8 lg:p-10 space-y-8 pb-20">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-main)] font-bold transition-colors w-fit text-[10px] uppercase tracking-widest mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Project
      </button>

      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="p-8 border-b border-[var(--border)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[var(--text-main)] tracking-tight">{task.name}</h1>
                <div className={cn(
                  "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                  task.priority === 'High' ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400" :
                  task.priority === 'Medium' ? "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" :
                  "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                )}>
                  {task.priority} Priority
                </div>
              </div>
              <p className="text-xs text-[var(--text-muted)]">{task.description || 'No description provided.'}</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-[var(--card-bg)] p-4 rounded-xl border border-[var(--border)] shadow-sm min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Task Assignee</span>
                </div>
                <UserPicker 
                  selectedUserId={task.assigneeId}
                  onSelect={async (user) => {
                    try {
                      await taskService.updateTask(auth.currentUser!.uid, projectId, taskId, {
                        assigneeId: user.uid,
                        assigneeName: user.displayName || user.email,
                        assigneePhoto: user.photoURL || null
                      });
                    } catch (error) {}
                  }}
                />
              </div>

              {/* Timer Widget */}
              <div className="bg-[var(--bg)] p-6 rounded-xl flex items-center gap-8 shadow-sm border border-[var(--border)]">
              <div className="text-center">
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Time Spent</p>
                <p className="text-2xl font-mono font-bold text-[var(--text-main)] tabular-nums">
                  {formatDuration(elapsedTime)}
                </p>
              </div>
              <button 
                onClick={toggleTimer}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg",
                  isTimerRunning 
                    ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 shadow-orange-500/10" 
                    : "bg-[var(--btn-bg)] text-[var(--btn-text)] shadow-indigo-500/5"
                )}
              >
                {isTimerRunning ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
              </button>
            </div>
          </div>
        </div>
      </div>

        <div className="p-8 bg-[var(--bg)]/50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-widest flex items-center gap-2">
              <Target className="w-4 h-4 text-[var(--accent)]" />
              Milestones
            </h3>
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
              {milestones.filter(m => m.completed).length} / {milestones.length} Completed
            </span>
          </div>

          {/* Task Progress Bar */}
          <div className="mb-6 space-y-2">
            <div className="h-2 bg-[var(--bg)] rounded-full overflow-hidden border border-[var(--border)]">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${task.progress}%` }}
                className={cn(
                  "h-full transition-all",
                  task.progress === 100 ? "bg-[var(--c-done)]" : "bg-[var(--accent)]"
                )}
              />
            </div>
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest text-right">
              {task.progress}% Task Completion
            </p>
          </div>

          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={milestones.map(m => m.id as any)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {milestones.map((milestone) => (
                  <SortableMilestoneItem 
                    key={milestone.id} 
                    milestone={milestone} 
                    onToggle={() => toggleMilestone(milestone)}
                    onEdit={() => setEditingMilestone(milestone)}
                    onDelete={async () => {
                      if (!auth.currentUser) return;
                      await milestoneService.deleteMilestone(auth.currentUser.uid, projectId, taskId, milestone.id);
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <form onSubmit={handleAddMilestone} className="mt-6 flex gap-3">
            <input
              value={newMilestoneName}
              onChange={(e) => setNewMilestoneName(e.target.value)}
              placeholder="Add a new milestone..."
              className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
            <button 
              type="submit"
              className="bg-[var(--btn-bg)] text-[var(--btn-text)] hover:bg-[var(--btn-hover)] px-6 py-2 rounded-xl text-xs font-bold transition-all"
            >
              Add
            </button>
          </form>
        </div>
      </div>

      {/* Edit Milestone Modal */}
      <AnimatePresence>
        {editingMilestone && (
          <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingMilestone(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[var(--card-bg)] border border-[var(--border)] w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8">
                <h3 className="text-xl font-bold text-[var(--text-main)] mb-6">Edit Milestone</h3>
                <form onSubmit={handleUpdateMilestone} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Milestone Name</label>
                    <input
                      autoFocus
                      value={editingMilestone.name}
                      onChange={(e) => setEditingMilestone({...editingMilestone, name: e.target.value})}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => setEditingMilestone(null)}
                      className="px-6 py-2.5 text-[var(--text-muted)] font-bold hover:bg-[var(--bg)] rounded-xl text-[10px] uppercase tracking-widest"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="px-8 py-2.5 bg-[var(--btn-bg)] text-[var(--btn-text)] hover:bg-[var(--btn-hover)] font-bold rounded-xl transition-all text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/5"
                    >
                      Update Milestone
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

function SortableMilestoneItem({ milestone, onToggle, onEdit, onDelete }: { milestone: Milestone, onToggle: () => void, onEdit: () => void, onDelete: () => void, [key: string]: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: milestone.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group bg-[var(--card-bg)] p-3 rounded-xl border border-[var(--border)] flex items-center gap-4 transition-all",
        milestone.completed && "opacity-60 grayscale bg-[var(--bg)]/50",
        isDragging && "shadow-xl z-50"
      )}
    >
      <div 
        {...attributes} 
        {...listeners}
        className="text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing shrink-0"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      <button 
        onClick={onToggle}
        className={cn(
          "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0",
          milestone.completed 
            ? "bg-green-500 border-green-500 text-white" 
            : "border-slate-300 dark:border-slate-600 hover:border-[var(--accent)]"
        )}
      >
        {milestone.completed && <Target className="w-3.5 h-3.5" />}
      </button>

      <span className={cn(
        "flex-1 text-sm font-medium text-[var(--text-main)]",
        milestone.completed && "line-through opacity-50"
      )}>
        {milestone.name}
      </span>

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

      {milestone.completed && (
        <div className="flex items-center gap-1 text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider shrink-0">
          <Target className="w-3 h-3" />
          Done
        </div>
      )}
    </div>
  );
}
