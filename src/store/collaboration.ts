import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { User, CollaborationState } from '../types';

interface CollaborationStore extends CollaborationState {
  // Actions
  setConnectionStatus: (status: CollaborationState['connectionStatus']) => void;
  addUser: (user: User & { cursor: { x: number; y: number } }) => void;
  removeUser: (userId: string) => void;
  updateUserCursor: (userId: string, cursor: { x: number; y: number }) => void;
  setActiveUsers: (users: Array<User & { cursor: { x: number; y: number } }>) => void;
  setLastSyncTime: (time: Date) => void;
  reset: () => void;
}

export const useCollaborationStore = create<CollaborationStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      activeUsers: new Map(),
      isConnected: false,
      connectionStatus: 'disconnected',
      lastSyncTime: null,

      // Actions
      setConnectionStatus: (status) => {
        set({ 
          connectionStatus: status,
          isConnected: status === 'connected'
        });
      },
      
      addUser: (user) => {
        const { activeUsers } = get();
        const newActiveUsers = new Map(activeUsers);
        newActiveUsers.set(user._id, user);
        set({ activeUsers: newActiveUsers });
      },
      
      removeUser: (userId) => {
        const { activeUsers } = get();
        const newActiveUsers = new Map(activeUsers);
        newActiveUsers.delete(userId);
        set({ activeUsers: newActiveUsers });
      },
      
      updateUserCursor: (userId, cursor) => {
        const { activeUsers } = get();
        const user = activeUsers.get(userId);
        if (user) {
          const newActiveUsers = new Map(activeUsers);
          newActiveUsers.set(userId, { ...user, cursor });
          set({ activeUsers: newActiveUsers });
        }
      },
      
      setActiveUsers: (users) => {
        const newActiveUsers = new Map();
        users.forEach(user => {
          newActiveUsers.set(user._id, user);
        });
        set({ activeUsers: newActiveUsers });
      },
      
      setLastSyncTime: (time) => set({ lastSyncTime: time }),
      
      reset: () => set({
        activeUsers: new Map(),
        isConnected: false,
        connectionStatus: 'disconnected',
        lastSyncTime: null,
      }),
    }),
    {
      name: 'collaboration-store',
    }
  )
);