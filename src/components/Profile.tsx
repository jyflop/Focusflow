import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { userService, projectService } from '../lib/firestore';
import { db } from '../lib/firebase';
import { 
  User, 
  Mail, 
  Camera, 
  Save, 
  Settings, 
  Shield, 
  Bell, 
  LogOut,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';

export default function Profile() {
  const user = auth.currentUser;
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [projectCount, setProjectCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);

  React.useEffect(() => {
    if (!user) return;

    const unsubProjects = projectService.getProjects(user.uid, (projects) => {
      setProjectCount(projects.length);
      
      let totalTasks = 0;
      let projectsProcessed = 0;

      if (projects.length === 0) {
        setTaskCount(0);
        return;
      }

      projects.forEach(project => {
        const tasksPath = `users/${user.uid}/projects/${project.id}/tasks`;
        import('firebase/firestore').then(({ getDocs, collection }) => {
          getDocs(collection(db, tasksPath)).then(snapshot => {
            totalTasks += snapshot.size;
            projectsProcessed++;
            if (projectsProcessed === projects.length) {
              setTaskCount(totalTasks);
            }
          }).catch(err => {
            projectsProcessed++;
            if (projectsProcessed === projects.length) {
              setTaskCount(totalTasks);
            }
          });
        });
      });
    });

    return () => unsubProjects();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      await userService.updateProfile(user.uid, {
        displayName,
        photoURL
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Update profile failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-[var(--text-main)]">Profile Settings</h2>
          <p className="text-[var(--text-muted)] mt-1">Manage your digital identity and account preferences.</p>
        </div>
        <button 
          onClick={() => auth.signOut()}
          className="flex items-center gap-2 px-4 py-2 border border-red-500/20 text-red-500 hover:bg-red-500/5 rounded-xl transition-all font-medium"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Avatar & Basic Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-24 bg-[var(--accent)]" />
            
            <div className="relative mt-8 flex flex-col items-center">
              <div className="relative group/avatar">
                <img 
                  src={photoURL || `https://ui-avatars.com/api/?name=${displayName}`} 
                  className="w-32 h-32 rounded-3xl border-4 border-[var(--card-bg)] shadow-xl object-cover"
                  referrerPolicy="no-referrer"
                />
                <button className="absolute bottom-2 right-2 p-2 bg-[var(--accent)] text-white rounded-xl shadow-lg opacity-0 group-hover/avatar:opacity-100 transition-all scale-90 group-hover/avatar:scale-100">
                  <Camera className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-6 text-center">
                <h3 className="text-xl font-bold text-[var(--text-main)]">{user?.displayName || 'Set your name'}</h3>
                <p className="text-sm text-[var(--accent)] font-medium mt-1 uppercase tracking-widest">{user?.emailVerified ? 'Verified Member' : 'Pending Verification'}</p>
              </div>

              <div className="w-full grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-[var(--border)]">
                <div className="text-center">
                  <span className="text-lg font-bold text-[var(--text-main)]">{projectCount}</span>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold mt-1">Projects</p>
                </div>
                <div className="text-center border-l border-[var(--border)]">
                  <span className="text-lg font-bold text-[var(--text-main)]">{taskCount}</span>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold mt-1">Tasks</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-lg">
            <h4 className="text-sm font-bold text-[var(--text-main)] mb-4">Quick Stats</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-[var(--accent)]" />
                </div>
                <span className="text-xs text-[var(--text-muted)] truncate flex-1">{user?.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-[var(--accent)]" />
                </div>
                <span className="text-xs text-[var(--text-muted)] flex-1 truncate">Joined April 2024</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Profile Form */}
        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={handleUpdateProfile} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-8 shadow-xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
                <Settings className="w-6 h-6 text-[var(--accent)]" />
              </div>
              <h4 className="text-xl font-bold text-[var(--text-main)]">Account Basics</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] px-1">Display Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition-all font-medium"
                    placeholder="Enter your name"
                  />
                </div>
              </div>

              <div className="space-y-2 opacity-50">
                <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] px-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                  <input 
                    type="email" 
                    disabled
                    value={user?.email || ''}
                    className="w-full pl-11 pr-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl cursor-not-allowed font-medium"
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] px-1">Avatar URL</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] font-mono text-center">/</div>
                  <input 
                    type="text" 
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition-all font-medium"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
                <p className="text-[10px] text-[var(--text-muted)] px-1 mt-1">Provide a direct link to an image (JPEG, PNG, or GIF).</p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-10 pt-8 border-t border-[var(--border)]">
              <div className="flex items-center gap-2">
                {saveSuccess ? (
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-2 text-green-500 text-sm font-bold"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Profile Updated Successfully!
                  </motion.div>
                ) : (
                  <p className="text-xs text-[var(--text-muted)]">Unsaved changes will be lost.</p>
                )}
              </div>
              <button 
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-8 py-3 bg-[var(--btn-bg)] text-[var(--btn-text)] rounded-xl hover:bg-[var(--btn-hover)] transition-all font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Save Changes
              </button>
            </div>
          </form>

          {/* Additional Settings Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <Bell className="w-5 h-5 text-[var(--accent)]" />
                <h5 className="font-bold text-[var(--text-main)]">Notifications</h5>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mb-4 uppercase tracking-widest font-bold">Preferences</p>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-sm text-[var(--text-main)] group-hover:text-[var(--accent)] transition-colors">Email Alerts</span>
                  <input type="checkbox" className="w-5 h-5 rounded-md accent-[var(--accent)]" defaultChecked />
                </label>
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-sm text-[var(--text-main)] group-hover:text-[var(--accent)] transition-colors">In-App Notices</span>
                  <input type="checkbox" className="w-5 h-5 rounded-md accent-[var(--accent)]" defaultChecked />
                </label>
              </div>
            </div>

            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-5 h-5 text-amber-500" />
                <h5 className="font-bold text-[var(--text-main)]">Security</h5>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mb-4 uppercase tracking-widest font-bold">Account Protection</p>
              <button className="w-full py-2 px-4 border border-[var(--border)] hover:bg-[var(--bg)] rounded-xl text-xs font-bold transition-all">
                Enable 2FA Authentication
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
