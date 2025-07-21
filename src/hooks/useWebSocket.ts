import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketMessage, User, DrawingElement } from '../types/drawing';

interface UseWebSocketReturn {
  isConnected: boolean;
  users: User[];
  currentRoom: string | null;
  sendMessage: (message: Omit<WebSocketMessage, 'userId' | 'timestamp'>) => void;
  createRoom: () => void;
  joinRoom: (roomId: string, userData?: any) => void;
  leaveRoom: () => void;
  error: string | null;
}

export const useWebSocket = (
  userId: string, 
  onMessage: (message: WebSocketMessage) => void
): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3001';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
      reconnectAttempts.current = 0;
      console.log('✅ Connected to WebSocket server');
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        // Handle server-specific messages
        switch (message.type) {
          case 'room_created':
            const roomCreatedData = message.data as any;
            console.log('🏠 Room created:', roomCreatedData);
            // Auto-join the created room
            if (roomCreatedData.roomId) {
              setCurrentRoom(roomCreatedData.roomId);
              // Send join message for the created room
              const joinMessage = {
                type: 'join_room',
                data: { name: `User ${userId.slice(0, 6)}` },
                userId,
                roomId: roomCreatedData.roomId,
                timestamp: Date.now()
              };
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify(joinMessage));
              }
            }
            break;
            
          case 'room_joined':
            const roomData = message.data as any;
            setCurrentRoom(roomData.roomId);
            setUsers(roomData.users || []);
            console.log('🚪 Joined room:', roomData.roomId);
            break;
            
          case 'user_joined':
            const newUser = message.data as User;
            setUsers(prev => {
              const exists = prev.find(u => u.id === newUser.id);
              return exists ? prev : [...prev, newUser];
            });
            break;
            
          case 'user_left':
            const leftUserData = message.data as { userId: string };
            setUsers(prev => prev.filter(u => u.id !== leftUserData.userId));
            break;
            
          case 'error':
            const errorData = message.data as { message: string };
            setError(errorData.message);
            console.error('❌ Server error:', errorData.message);
            break;
            
          default:
            // Pass other messages to the callback
            onMessage(message);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      console.log('🔌 Disconnected from WebSocket server');
      
      // Attempt to reconnect if not a clean close
      if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
        console.log(`🔄 Attempting to reconnect in ${delay}ms... (${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, delay);
      } else if (reconnectAttempts.current >= maxReconnectAttempts) {
        setError('Connection lost. Please refresh the page.');
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Connection error occurred');
    };
  }, [onMessage]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: Omit<WebSocketMessage, 'userId' | 'timestamp'>) => {
    if (wsRef.current && isConnected) {
      const fullMessage = {
        ...message,
        userId,
        roomId: currentRoom,
        timestamp: Date.now()
      };
      
      try {
        wsRef.current.send(JSON.stringify(fullMessage));
      } catch (error) {
        console.error('Error sending message:', error);
        setError('Failed to send message');
      }
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }, [isConnected, userId, currentRoom]);

  const createRoom = useCallback(() => {
    sendMessage({
      type: 'create_room',
      data: {}
    });
  }, [sendMessage]);

  const joinRoom = useCallback((roomId: string, userData?: any) => {
    sendMessage({
      type: 'join_room',
      data: userData || { name: `User ${userId.slice(0, 6)}` }
    });
    // Note: roomId is passed separately in sendMessage
    setCurrentRoom(roomId);
  }, [sendMessage, userId]);

  const leaveRoom = useCallback(() => {
    if (currentRoom) {
      sendMessage({
        type: 'leave_room',
        data: {}
      });
      setCurrentRoom(null);
      setUsers([]);
    }
  }, [sendMessage, currentRoom]);

  return {
    isConnected,
    users,
    currentRoom,
    sendMessage,
    createRoom,
    joinRoom,
    leaveRoom,
    error
  };
};