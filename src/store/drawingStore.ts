import { create } from 'zustand';
import { DrawingElement, User, Point } from '../types/drawing';

interface DrawingStore {
  elements: DrawingElement[];
  users: User[];
  selectedTool: string;
  selectedColor: string;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  addElement: (element: DrawingElement) => void;
  updateElement: (id: string, updates: Partial<DrawingElement>) => void;
  removeElement: (id: string) => void;
  setUsers: (users: User[]) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  setSelectedTool: (tool: string) => void;
  setSelectedColor: (color: string) => void;
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  resetViewport: () => void;
  clearCanvas: () => void;
}

export const useDrawingStore = create<DrawingStore>((set, get) => ({
  elements: [],
  users: [],
  selectedTool: 'pen',
  selectedColor: '#3b82f6',
  viewport: { x: 0, y: 0, zoom: 1 },

  addElement: (element) => set(state => ({
    elements: [...state.elements, element]
  })),

  updateElement: (id, updates) => set(state => ({
    elements: state.elements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    )
  })),

  removeElement: (id) => set(state => ({
    elements: state.elements.filter(el => el.id !== id)
  })),

  setUsers: (users) => set({ users }),

  updateUser: (userId, updates) => set(state => ({
    users: state.users.map(user => 
      user.id === userId ? { ...user, ...updates } : user
    )
  })),

  setSelectedTool: (tool) => set({ selectedTool: tool }),

  setSelectedColor: (color) => set({ selectedColor: color }),
  setViewport: (viewport) => set({ viewport }),

  resetViewport: () => set({ viewport: { x: 0, y: 0, zoom: 1 } }),

  clearCanvas: () => set({ elements: [] })
}));