import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Element, ElementType, Viewport, CanvasState } from '../types';

interface CanvasStore extends CanvasState {
  // Actions
  setTool: (tool: ElementType | 'select' | 'pan') => void;
  setElements: (elements: Element[]) => void;
  addElement: (element: Element) => void;
  updateElement: (id: string, changes: Partial<Element>) => void;
  deleteElement: (id: string) => void;
  selectElements: (ids: string[]) => void;
  clearSelection: () => void;
  setViewport: (viewport: Partial<Viewport>) => void;
  setIsDrawing: (isDrawing: boolean) => void;
  setCurrentElement: (element: Partial<Element> | null) => void;
  
  // Undo/Redo
  history: Element[][];
  historyIndex: number;
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
}

const initialViewport: Viewport = {
  x: 0,
  y: 0,
  zoom: 1,
  width: 1200,
  height: 800,
};

export const useCanvasStore = create<CanvasStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      elements: [],
      selectedElementIds: [],
      tool: 'select',
      viewport: initialViewport,
      isDrawing: false,
      currentElement: null,
      history: [[]],
      historyIndex: 0,

      // Actions
      setTool: (tool) => set({ tool }),
      
      setElements: (elements) => set({ elements }),
      
      addElement: (element) => {
        set((state) => ({
          elements: [...state.elements, element],
        }));
        get().saveToHistory();
      },
      
      updateElement: (id, changes) => {
        set((state) => ({
          elements: state.elements.map((el) =>
            el._id === id ? { ...el, ...changes } : el
          ),
        }));
      },
      
      deleteElement: (id) => {
        set((state) => ({
          elements: state.elements.filter((el) => el._id !== id),
          selectedElementIds: state.selectedElementIds.filter((selectedId) => selectedId !== id),
        }));
        get().saveToHistory();
      },
      
      selectElements: (ids) => set({ selectedElementIds: ids }),
      
      clearSelection: () => set({ selectedElementIds: [] }),
      
      setViewport: (viewport) =>
        set((state) => ({
          viewport: { ...state.viewport, ...viewport },
        })),
      
      setIsDrawing: (isDrawing) => set({ isDrawing }),
      
      setCurrentElement: (currentElement) => set({ currentElement }),
      
      // Undo/Redo functionality
      saveToHistory: () => {
        const { elements, history, historyIndex } = get();
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push([...elements]);
        
        set({
          history: newHistory.slice(-50), // Keep last 50 states
          historyIndex: Math.min(newHistory.length - 1, 49),
        });
      },
      
      undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          set({
            elements: [...history[newIndex]],
            historyIndex: newIndex,
          });
        }
      },
      
      redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1;
          set({
            elements: [...history[newIndex]],
            historyIndex: newIndex,
          });
        }
      },
    }),
    {
      name: 'canvas-store',
    }
  )
);