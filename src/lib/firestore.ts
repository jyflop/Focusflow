import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Data Services
export const userService = {
  syncProfile: async (user: any) => {
    const path = `users/${user.uid}`;
    try {
      await setDoc(doc(db, path), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  updateProfile: async (uid: string, data: any) => {
    const path = `users/${uid}`;
    try {
      await updateDoc(doc(db, path), {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  getUsers: (callback: (users: any[]) => void) => {
    const path = 'users';
    const q = query(collection(db, path), orderBy('displayName', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(users);
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));
  }
};

export const projectService = {
  getProjects: (userId: string, callback: (projects: any[]) => void) => {
    const path = `users/${userId}/projects`;
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(projects);
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));
  },

  getProject: (userId: string, projectId: string, callback: (project: any) => void) => {
    const path = `users/${userId}/projects/${projectId}`;
    return onSnapshot(doc(db, path), (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() });
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, path));
  },

  createProject: async (userId: string, projectData: any) => {
    const path = `users/${userId}/projects`;
    try {
      const docRef = await addDoc(collection(db, path), {
        ...projectData,
        ownerId: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  updateProject: async (userId: string, projectId: string, projectData: any) => {
    const path = `users/${userId}/projects/${projectId}`;
    try {
      await updateDoc(doc(db, path), {
        ...projectData,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  deleteProject: async (userId: string, projectId: string) => {
    const path = `users/${userId}/projects/${projectId}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};

export const taskService = {
  getTasks: (userId: string, projectId: string, callback: (tasks: any[]) => void) => {
    const path = `users/${userId}/projects/${projectId}/tasks`;
    const q = query(collection(db, path), orderBy('order', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(tasks);
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));
  },

  getTask: (userId: string, projectId: string, taskId: string, callback: (task: any) => void) => {
    const path = `users/${userId}/projects/${projectId}/tasks/${taskId}`;
    return onSnapshot(doc(db, path), (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() });
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, path));
  },

  createTask: async (userId: string, projectId: string, taskData: any) => {
    const path = `users/${userId}/projects/${projectId}/tasks`;
    try {
      const docRef = await addDoc(collection(db, path), {
        ...taskData,
        projectId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  updateTask: async (userId: string, projectId: string, taskId: string, taskData: any) => {
    const path = `users/${userId}/projects/${projectId}/tasks/${taskId}`;
    try {
      await updateDoc(doc(db, path), {
        ...taskData,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  deleteTask: async (userId: string, projectId: string, taskId: string) => {
    const path = `users/${userId}/projects/${projectId}/tasks/${taskId}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};

export const milestoneService = {
  getMilestones: (userId: string, projectId: string, taskId: string, callback: (milestones: any[]) => void) => {
    const path = `users/${userId}/projects/${projectId}/tasks/${taskId}/milestones`;
    const q = query(collection(db, path), orderBy('order', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const milestones = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(milestones);
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));
  },

  createMilestone: async (userId: string, projectId: string, taskId: string, milestoneData: any) => {
    const path = `users/${userId}/projects/${projectId}/tasks/${taskId}/milestones`;
    try {
      const docRef = await addDoc(collection(db, path), {
        ...milestoneData,
        taskId,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  updateMilestone: async (userId: string, projectId: string, taskId: string, milestoneId: string, milestoneData: any) => {
    const path = `users/${userId}/projects/${projectId}/tasks/${taskId}/milestones/${milestoneId}`;
    try {
      await updateDoc(doc(db, path), milestoneData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  deleteMilestone: async (userId: string, projectId: string, taskId: string, milestoneId: string) => {
    const path = `users/${userId}/projects/${projectId}/tasks/${taskId}/milestones/${milestoneId}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};

export const timeLogService = {
  getTimeLogs: (userId: string, projectId: string, taskId: string, callback: (logs: any[]) => void) => {
    const path = `users/${userId}/projects/${projectId}/tasks/${taskId}/timeLogs`;
    const q = query(collection(db, path), orderBy('startTime', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(logs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));
  },

  createTimeLog: async (userId: string, projectId: string, taskId: string, logData: any) => {
    const path = `users/${userId}/projects/${projectId}/tasks/${taskId}/timeLogs`;
    try {
      const docRef = await addDoc(collection(db, path), {
        ...logData,
        taskId,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  deleteTimeLog: async (userId: string, projectId: string, taskId: string, logId: string) => {
    const path = `users/${userId}/projects/${projectId}/tasks/${taskId}/timeLogs/${logId}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};

export const inviteService = {
  createInvite: async (inviteData: any) => {
    const path = 'invites';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...inviteData,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  getInvitesForEmail: (email: string, callback: (invites: any[]) => void) => {
    const path = 'invites';
    const q = query(collection(db, path), where('email', '==', email), where('status', '==', 'pending'));
    return onSnapshot(q, (snapshot) => {
      const invites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(invites);
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));
  },

  updateInviteStatus: async (inviteId: string, status: 'accepted' | 'declined') => {
    const path = `invites/${inviteId}`;
    try {
      await updateDoc(doc(db, path), {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
};

export const chatService = {
  getConversations: (userId: string, callback: (conversations: any[]) => void) => {
    const path = 'conversations';
    const q = query(
      collection(db, path),
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const convs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(convs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));
  },

  getMessages: (conversationId: string, callback: (messages: any[]) => void) => {
    const path = `conversations/${conversationId}/messages`;
    const q = query(collection(db, path), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(msgs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));
  },

  sendMessage: async (conversationId: string, messageData: any) => {
    const msgPath = `conversations/${conversationId}/messages`;
    const convPath = `conversations/${conversationId}`;
    try {
      await addDoc(collection(db, msgPath), {
        ...messageData,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, convPath), {
        lastMessage: messageData.type === 'text' ? messageData.content : `[${messageData.type}]`,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, msgPath);
    }
  },

  getOrCreateConversation: async (participants: string[]) => {
    const path = 'conversations';
    const sortedParticipants = [...participants].sort();
    const q = query(collection(db, path), where('participants', '==', sortedParticipants));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    }

    const docRef = await addDoc(collection(db, path), {
      participants: sortedParticipants,
      lastMessage: '',
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  }
};
