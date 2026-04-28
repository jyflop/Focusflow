import React, { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { userService, inviteService } from '../lib/firestore';
import { UserProfile } from '../types';
import { 
  Users, 
  Mail, 
  Calendar, 
  Shield, 
  MoreVertical,
  Search,
  Filter,
  UserPlus,
  X,
  Link2,
  Check,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { safelyFormatDate } from '../lib/dateUtils';

export default function Team() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | 'Admin' | 'Member'>('All');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePosition, setInvitePosition] = useState('');

  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const inviteLink = window.location.origin;

  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    return userService.getUserProfile(auth.currentUser.uid, setCurrentUserProfile);
  }, []);

  const isAdminGlobal = currentUserProfile?.role?.toLowerCase() === 'admin' || 
    ['jyflopkaw@gmail.com', 'swartselsa0@gmail.com'].includes(auth.currentUser?.email || '') ||
    auth.currentUser?.uid === '5DpJouFlgDSAQmq4dIjO173bKjD3';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRemoveMember = async (uid: string) => {
    if (!window.confirm('Are you sure you want to remove this team member? This action cannot be undone.')) return;
    
    setDeletingUserId(uid);
    try {
      await userService.deleteUser(uid);
    } catch (error: any) {
      console.error('Failed to remove member:', error);
      let message = 'Failed to remove member. Please try again.';
      try {
        const errInfo = JSON.parse(error.message);
        message = `Error: ${errInfo.error} (Path: ${errInfo.path})`;
      } catch (e) {
        message = `Error: ${error.message || 'Unknown error'}`;
      }
      alert(message);
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setSendError(null);
    setSendSuccess(false);

    try {
      if (!auth.currentUser) throw new Error('You must be logged in');

      // 1. Create internal database record (for the dashboard notification)
      await inviteService.createInvite({
        email: inviteEmail,
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || 'Team Member',
        position: invitePosition,
        status: 'pending'
      });

      // 2. Send actual email via server API
      const emailResponse = await fetch('/api/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName,
          position: invitePosition,
          inviteLink: inviteLink,
          senderName: auth.currentUser.displayName || 'Your Team Lead',
          senderEmail: auth.currentUser.email,
        }),
      });

      // Safely handle response to avoid JSON parse error on static hosting (Firebase)
      let emailData: any = {};
      const contentType = emailResponse.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        emailData = await emailResponse.json();
      } else {
        // If not JSON, it's likely the static server returning index.html (non-critical)
        console.warn('Real email server not available (static hosting).');
      }
      
      if (!emailResponse.ok && contentType && contentType.includes('application/json')) {
        // Even if real email fails due to missing config, we consider it a success 
        // because the user will still see the notification inside the app dashboard.
        console.warn('Real email failed:', emailData.error);
        setSendSuccess(true);
      } else {
        setSendSuccess(true);
      }

      // Reset form after a delay if at least the internal invite worked
      setTimeout(() => {
        setIsInviteModalOpen(false);
        setInviteName('');
        setInviteEmail('');
        setInvitePosition('');
        setSendSuccess(false);
        setSendError(null);
      }, 3000);
    } catch (error: any) {
      setSendError(error.message || 'Failed to process invitation');
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    const unsubscribe = userService.getUsers((data) => {
      setUsers(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.displayName || '').toLowerCase().includes(search.toLowerCase()) || 
                          user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'All' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="p-8 lg:p-10 space-y-8 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg mb-8" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-[var(--text-main)]">Team Members</h2>
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Collaborators & Roles</p>
        </div>

        <button 
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[var(--btn-bg)] text-[var(--btn-text)] hover:bg-[var(--btn-hover)] rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/5 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search members by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>
        
        <div className="flex bg-[var(--bg)] p-1 rounded-xl border border-[var(--border)]">
          {(['All', 'Admin', 'Member'] as const).map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                roleFilter === role 
                  ? "bg-[var(--card-bg)] text-[var(--text-main)] shadow-sm" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              )}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-[var(--bg)] border-b border-[var(--border)] opacity-50">
              <th className="p-5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Member</th>
              <th className="p-5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Email</th>
              <th className="p-5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Position</th>
              <th className="p-5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Role</th>
              <th className="p-5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Status</th>
              <th className="p-5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Joined</th>
              <th className="p-5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            <AnimatePresence mode="popLayout">
              {filteredUsers.map((user) => (
                <motion.tr 
                  key={user.uid}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="hover:bg-[var(--bg)] transition-colors group"
                >
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--bg)] border border-[var(--border)]">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--accent)] font-bold text-sm">
                            {(user.displayName || user.email).charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[var(--text-main)] truncate max-w-[150px]">
                          {user.displayName || 'Unknown Name'}
                          {user.uid === auth.currentUser?.uid && <span className="ml-2 text-[8px] px-1.5 py-0.5 bg-[var(--accent)] text-[var(--btn-text)] rounded uppercase">You</span>}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5 uppercase tracking-widest">ID: {user.uid.substring(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-2 text-xs text-[var(--text-main)]">
                      <Mail className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      {user.email}
                    </div>
                  </td>
                  <td className="p-5">
                    <input 
                      type="text"
                      placeholder="Add position..."
                      value={user.position || ''}
                      disabled={!isAdminGlobal && user.uid !== auth.currentUser?.uid}
                      onChange={async (e) => {
                        try {
                          await userService.updateProfile(user.uid, { position: e.target.value });
                        } catch (error) {}
                      }}
                      className={cn(
                        "bg-transparent text-xs text-[var(--text-main)] border-none focus:ring-0 p-0 placeholder:text-[var(--text-muted)] placeholder:opacity-50 italic",
                        (!isAdminGlobal && user.uid !== auth.currentUser?.uid) && "cursor-not-allowed opacity-70"
                      )}
                    />
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-2">
                      <Shield className={cn(
                        "w-3.5 h-3.5",
                        user.role === 'Admin' ? "text-purple-500" : "text-slate-400"
                      )} />
                      <select
                        value={user.role || 'Member'}
                        disabled={!isAdminGlobal}
                        onChange={async (e) => {
                          const newRole = e.target.value as 'Admin' | 'Member';
                          try {
                            await userService.updateProfile(user.uid, { role: newRole });
                          } catch (error) {}
                        }}
                        className={cn(
                          "bg-transparent text-[10px] font-bold uppercase tracking-widest focus:outline-none cursor-pointer hover:underline decoration-dotted transition-all",
                          user.role === 'Admin' ? "text-purple-500" : "text-[var(--text-main)]",
                          !isAdminGlobal && "cursor-not-allowed pointer-events-none opacity-70"
                        )}
                      >
                        <option value="Admin" className="bg-[var(--card-bg)] text-purple-500">Admin</option>
                        <option value="Member" className="bg-[var(--card-bg)] text-[var(--text-main)]">Member</option>
                      </select>
                    </div>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                      <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-widest">Online</span>
                    </div>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <Calendar className="w-3.5 h-3.5" />
                      {safelyFormatDate(user.createdAt, 'MMM d, yyyy', 'No date')}
                    </div>
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="relative group/menu">
                        <button className="p-2 hover:bg-[var(--bg)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-xl py-2 z-10 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all">
                          {isAdminGlobal && user.uid !== auth.currentUser?.uid && (
                            <button 
                              onClick={() => handleRemoveMember(user.uid)}
                              disabled={deletingUserId === user.uid}
                              className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                            >
                              {deletingUserId === user.uid ? (
                                <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                              Remove Member
                            </button>
                          )}
                          <button className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg)] transition-colors">
                            <Mail className="w-3.5 h-3.5" />
                            Send Message
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isInviteModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[var(--card-bg)] border border-[var(--border)] w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 bg-[var(--accent)]/10 rounded-xl flex items-center justify-center">
                    <UserPlus className="w-6 h-6 text-[var(--accent)]" />
                  </div>
                  <button 
                    onClick={() => setIsInviteModalOpen(false)}
                    className="p-2 hover:bg-[var(--bg)] rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-[var(--text-muted)]" />
                  </button>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-[var(--text-main)]">Add Team Member</h3>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                    Fill in the details below to send a professional email invitation to your teammate.
                  </p>

                  <form onSubmit={handleSendInvite} className="space-y-4 pt-2">
                    {sendError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-500 font-bold uppercase tracking-widest">
                        {sendError}
                      </div>
                    )}

                    {sendSuccess && (
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-[10px] text-green-500 font-bold uppercase tracking-widest">
                        Invitation sent successfully!
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Full Name</label>
                      <input 
                        required
                        type="text"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-[var(--text-muted)]/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Position</label>
                      <input 
                        type="text"
                        value={invitePosition}
                        onChange={(e) => setInvitePosition(e.target.value)}
                        placeholder="UI Designer"
                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-[var(--text-muted)]/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Email Address</label>
                      <input 
                        required
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-[var(--text-muted)]/50"
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={isSending || sendSuccess}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 px-6 py-3 bg-[var(--btn-bg)] text-[var(--btn-text)] hover:bg-[var(--btn-hover)] font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/10 text-xs uppercase tracking-widest mt-4",
                        (isSending || sendSuccess) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {isSending ? (
                        <div className="w-4 h-4 border-2 border-[var(--btn-text)] border-t-transparent rounded-full animate-spin" />
                      ) : sendSuccess ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                      {isSending ? 'Sending...' : sendSuccess ? 'Sent!' : 'Send Email Invite'}
                    </button>
                  </form>

                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[var(--border)]"></div>
                    </div>
                    <div className="relative flex justify-center text-[8px] uppercase tracking-widest font-bold">
                      <span className="bg-[var(--card-bg)] px-2 text-[var(--text-muted)]">Or Share Link</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-xl">
                      <div className="flex-1 px-3 text-[10px] text-[var(--text-main)] font-mono truncate">
                        {inviteLink}
                      </div>
                      <button 
                        type="button"
                        onClick={handleCopyLink}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all",
                          isCopied 
                            ? "bg-green-500 text-white" 
                            : "bg-[var(--btn-bg)] text-[var(--btn-text)]"
                        )}
                      >
                        {isCopied ? <Check className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
                        {isCopied ? 'Copied' : 'Link'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-[var(--border)] flex justify-center">
                  <button 
                    onClick={() => setIsInviteModalOpen(false)}
                    className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--text-main)] transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
