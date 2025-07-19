import { useEffect, useState } from 'react';
import { useCanvasStore } from '../store/canvas';
import { Element, Whiteboard } from '../types';

export const useWhiteboard = (whiteboardId: string) => {
  const [whiteboard, setWhiteboard] = useState<Whiteboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setElements } = useCanvasStore();

  useEffect(() => {
    const loadWhiteboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/whiteboards/${whiteboardId}`);
        
        if (!response.ok) {
          throw new Error('Failed to load whiteboard');
        }

        const data = await response.json();
        setWhiteboard(data.whiteboard);
        setElements(data.elements || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error loading whiteboard:', err);
      } finally {
        setLoading(false);
      }
    };

    if (whiteboardId) {
      loadWhiteboard();
    }
  }, [whiteboardId, setElements]);

  const createWhiteboard = async (name: string, isPublic = false) => {
    try {
      const response = await fetch('/api/whiteboards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, isPublic }),
      });

      if (!response.ok) {
        throw new Error('Failed to create whiteboard');
      }

      return await response.json();
    } catch (err) {
      console.error('Error creating whiteboard:', err);
      throw err;
    }
  };

  return {
    whiteboard,
    loading,
    error,
    createWhiteboard,
  };
};