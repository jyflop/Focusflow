import React, { useState, useEffect } from 'react';
import { userService } from '../lib/firestore';
import { UserProfile } from '../types';
import { User, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface UserPickerProps {
  selectedUserId?: string;
  onSelect: (user: UserProfile) => void;
  label?: string;
}

export default function UserPicker({ selectedUserId, onSelect, label }: UserPickerProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = userService.getUsers((data) => {
      setUsers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const selectedUser = users.find(u => u.uid === selectedUserId);

  return (
    <div className="relative">
      {label && <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1 mb-1 block">{label}</label>}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-main)] transition-all hover:border-[var(--accent)]"
      >
        <div className="flex items-center gap-2 truncate">
          {selectedUser ? (
            <>
              <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-[var(--border)] bg-[var(--bg)]">
                {selectedUser.photoURL ? (
                  <img src={selectedUser.photoURL} alt={selectedUser.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--accent)] font-bold text-[8px]">
                    {(selectedUser.displayName || selectedUser.email).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="truncate">{selectedUser.displayName || selectedUser.email}</span>
            </>
          ) : (
            <>
              <User className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-[var(--text-muted)]">Select team member...</span>
            </>
          )}
        </div>
        <ChevronDown className={cn("w-4 h-4 text-[var(--text-muted)] transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[70]" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute left-0 right-0 mt-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-xl z-[80] max-h-60 overflow-y-auto p-1"
            >
              {loading ? (
                <div className="p-4 text-center text-xs text-[var(--text-muted)]">Loading team...</div>
              ) : users.length === 0 ? (
                <div className="p-4 text-center text-xs text-[var(--text-muted)]">No team members found</div>
              ) : (
                users.map(user => (
                  <button
                    key={user.uid}
                    onClick={() => {
                      onSelect(user);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                      selectedUserId === user.uid 
                        ? "bg-[var(--accent)]/10 text-[var(--accent)]" 
                        : "hover:bg-[var(--bg)] text-[var(--text-main)]"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-[var(--border)] bg-[var(--bg)]">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--accent)] font-bold text-[10px]">
                            {(user.displayName || user.email).charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="text-left truncate">
                        <p className="font-bold text-xs truncate">{user.displayName || 'Unnamed'}</p>
                        <p className="text-[9px] text-[var(--text-muted)] truncate">{user.email}</p>
                      </div>
                    </div>
                    {selectedUserId === user.uid && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                ))
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
