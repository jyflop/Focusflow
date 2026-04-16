import { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { inviteService, userService } from '../lib/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Check, X, UserPlus } from 'lucide-react';

export default function InvitationManager() {
  const [invites, setInvites] = useState<any[]>([]);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user?.email) return;

    const unsubscribe = inviteService.getInvitesForEmail(user.email, (data) => {
      setInvites(data);
    });

    return () => unsubscribe();
  }, [user?.email]);

  const handleAccept = async (invite: any) => {
    try {
      // 1. Update invite status
      await inviteService.updateInviteStatus(invite.id, 'accepted');
      
      // 2. Here we could add logic to join a specific workspace.
      // For now, since it's a shared flat DB in this demo, accepting just clears the notice.
      // In a real multi-tenant app, we'd add the user to the project's 'members' array.
      
      console.log('Accepted invite from', invite.senderName);
    } catch (error) {
      console.error('Error accepting invite:', error);
    }
  };

  const handleDecline = async (invite: any) => {
    try {
      await inviteService.updateInviteStatus(invite.id, 'declined');
    } catch (error) {
      console.error('Error declining invite:', error);
    }
  };

  if (invites.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] w-full max-w-sm">
      <AnimatePresence>
        {invites.map((invite) => (
          <motion.div
            key={invite.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-2xl p-5 mb-3 overflow-hidden relative group"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-[var(--accent)]" />
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
                <UserPlus className="w-5 h-5 text-[var(--accent)]" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-[var(--text-main)] truncate">
                  Team Invitation
                </h4>
                <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">
                  <span className="text-[var(--text-main)] font-semibold">{invite.senderName}</span> has invited you to join as a <span className="text-[var(--accent)] font-semibold">{invite.position || 'Member'}</span>.
                </p>
                
                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={() => handleAccept(invite)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--btn-bg)] text-[var(--btn-text)] hover:bg-[var(--btn-hover)] rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/10"
                  >
                    <Check className="w-3 h-3" />
                    Accept
                  </button>
                  <button
                    onClick={() => handleDecline(invite)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg)] rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                  >
                    <X className="w-3 h-3" />
                    Decline
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
