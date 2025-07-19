import { useEffect, useRef } from 'react';
import { useCanvasStore } from '../store/canvas';
import { useCollaborationStore } from '../store/collaboration';
import { socketClient } from '../lib/socket/client';
import { Element } from '../types';

export const useSocket = (whiteboardId: string) => {
  const socketRef = useRef(socketClient);
  const {
    addElement,
    updateElement,
    deleteElement,
    setElements,
  } = useCanvasStore();
  
  const {
    setConnectionStatus,
    addUser,
    removeUser,
    updateUserCursor,
    setLastSyncTime,
  } = useCollaborationStore();

  useEffect(() => {
    if (!whiteboardId) return;

    const socket = socketRef.current.connect(whiteboardId);

    // Connection events
    socket.on('connect', () => {
      setConnectionStatus('connected');
      socket.emit('user:join', { whiteboardId });
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', () => {
      setConnectionStatus('error');
    });

    // Element events
    socket.on('element:created', ({ element, tempId, userId }) => {
      if (tempId) {
        // Replace temporary element with real one
        updateElement(tempId, element);
      } else {
        addElement(element);
      }
      setLastSyncTime(new Date());
    });

    socket.on('element:updated', ({ elementId, changes, version, userId }) => {
      updateElement(elementId, { properties: changes, version });
      setLastSyncTime(new Date());
    });

    socket.on('element:deleted', ({ elementId, userId }) => {
      deleteElement(elementId);
      setLastSyncTime(new Date());
    });

    // User events
    socket.on('user:joined', ({ user, activeUsers }) => {
      addUser(user);
      setLastSyncTime(new Date());
    });

    socket.on('user:left', ({ userId }) => {
      removeUser(userId);
      setLastSyncTime(new Date());
    });

    socket.on('cursor:moved', ({ userId, x, y }) => {
      updateUserCursor(userId, { x, y });
    });

    // Error events
    socket.on('error:permission', ({ message }) => {
      console.error('Permission error:', message);
      setConnectionStatus('error');
    });

    socket.on('error:conflict', ({ message, elementId }) => {
      console.error('Conflict error:', message, elementId);
      // TODO: Handle conflict resolution
    });

    socket.on('error:validation', ({ message, field }) => {
      console.error('Validation error:', message, field);
    });

    // Cleanup
    return () => {
      socket.emit('user:leave', { whiteboardId });
      socketRef.current.disconnect();
      setConnectionStatus('disconnected');
    };
  }, [whiteboardId, setConnectionStatus, addElement, updateElement, deleteElement, addUser, removeUser, updateUserCursor, setLastSyncTime]);

  // Return socket methods for components to use
  return {
    emitElementCreate: (element: Partial<Element>, tempId: string) => {
      socketRef.current.emit('element:create', { whiteboardId, element, tempId });
    },
    
    emitElementUpdate: (elementId: string, changes: any, version: number) => {
      socketRef.current.emit('element:update', { whiteboardId, elementId, changes, version });
    },
    
    emitElementDelete: (elementId: string) => {
      socketRef.current.emit('element:delete', { whiteboardId, elementId });
    },
    
    emitCursorMove: (x: number, y: number) => {
      socketRef.current.emit('cursor:move', { whiteboardId, x, y });
    },
  };
};