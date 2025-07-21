import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';
import RoomManager from './roomManager.js';

class CollaborativeDrawingServer {
  constructor() {
    this.server = http.createServer();
    this.wss = new WebSocketServer({ server: this.server });
    this.roomManager = new RoomManager();
    this.clients = new Map(); // userId -> { ws, roomId, lastSeen }
    
    this.setupWebSocketHandlers();
    this.startCleanupInterval();
  }

  setupWebSocketHandlers() {
    this.wss.on('connection', (ws, req) => {
      console.log('New client connected');
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('Error parsing message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected');
        this.handleClientDisconnect(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  handleMessage(ws, message) {
    const { type, data, userId, roomId, timestamp } = message;

    try {
      switch (type) {
        case 'create_room':
          this.handleCreateRoom(ws, userId, data);
          break;

        case 'join_room':
          this.handleJoinRoom(ws, userId, roomId, data);
          break;

        case 'leave_room':
          this.handleLeaveRoom(ws, userId, roomId);
          break;

        case 'element_added':
          this.handleElementAdded(ws, userId, roomId, data);
          break;

        case 'element_updated':
          this.handleElementUpdated(ws, userId, roomId, data);
          break;

        case 'element_deleted':
          this.handleElementDeleted(ws, userId, roomId, data);
          break;

        case 'cursor_moved':
          this.handleCursorMoved(ws, userId, roomId, data);
          break;

        case 'clear_canvas':
          this.handleClearCanvas(ws, userId, roomId);
          break;

        case 'get_rooms':
          this.handleGetRooms(ws);
          break;

        default:
          console.log('Unknown message type:', type);
          this.sendError(ws, 'Unknown message type');
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.sendError(ws, 'Server error processing message');
    }
  }

  handleCreateRoom(ws, userId, data) {
    const result = this.roomManager.createRoom(data?.roomId);
    
    if (result.success) {
      this.sendToClient(ws, {
        type: 'room_created',
        data: {
          roomId: result.roomId,
          roomUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}?room=${result.roomId}`
        },
        userId: 'server',
        timestamp: Date.now()
      });
    } else {
      this.sendError(ws, result.error);
    }
  }

  handleJoinRoom(ws, userId, roomId, userData) {
    if (!roomId) {
      this.sendError(ws, 'Room ID is required');
      return;
    }

    // Create room if it doesn't exist
    let room = this.roomManager.getRoom(roomId);
    if (!room) {
      const createResult = this.roomManager.createRoom(roomId);
      if (!createResult.success) {
        this.sendError(ws, createResult.error);
        return;
      }
      room = createResult.room;
    }

    const result = this.roomManager.addUserToRoom(roomId, userId, userData || {});
    
    if (result.success) {
      // Store client connection info
      this.clients.set(userId, { ws, roomId, lastSeen: Date.now() });

      // Send current room state to new user
      this.sendToClient(ws, {
        type: 'room_joined',
        data: {
          roomId,
          elements: room.elements,
          users: Array.from(room.users.values()),
          user: result.user
        },
        userId: 'server',
        timestamp: Date.now()
      });

      // Notify other users in the room
      this.broadcastToRoom(roomId, {
        type: 'user_joined',
        data: result.user,
        userId: 'server',
        timestamp: Date.now()
      }, userId);

    } else {
      this.sendError(ws, result.error);
    }
  }

  handleLeaveRoom(ws, userId, roomId) {
    const removed = this.roomManager.removeUserFromRoom(roomId, userId);
    
    if (removed) {
      this.clients.delete(userId);
      
      // Notify other users in the room
      this.broadcastToRoom(roomId, {
        type: 'user_left',
        data: { userId },
        userId: 'server',
        timestamp: Date.now()
      }, userId);
    }
  }

  handleElementAdded(ws, userId, roomId, elementData) {
    const success = this.roomManager.addElementToRoom(roomId, elementData);
    
    if (success) {
      this.broadcastToRoom(roomId, {
        type: 'element_added',
        data: elementData,
        userId,
        timestamp: Date.now()
      }, userId);
    } else {
      this.sendError(ws, 'Failed to add element');
    }
  }

  handleElementUpdated(ws, userId, roomId, elementData) {
    const success = this.roomManager.updateElementInRoom(roomId, elementData.id, elementData);
    
    if (success) {
      this.broadcastToRoom(roomId, {
        type: 'element_updated',
        data: elementData,
        userId,
        timestamp: Date.now()
      }, userId);
    } else {
      this.sendError(ws, 'Failed to update element');
    }
  }

  handleElementDeleted(ws, userId, roomId, elementId) {
    const success = this.roomManager.removeElementFromRoom(roomId, elementId);
    
    if (success) {
      this.broadcastToRoom(roomId, {
        type: 'element_deleted',
        data: elementId,
        userId,
        timestamp: Date.now()
      }, userId);
    } else {
      this.sendError(ws, 'Failed to delete element');
    }
  }

  handleCursorMoved(ws, userId, roomId, cursorData) {
    const success = this.roomManager.updateUserCursor(roomId, userId, cursorData.position);
    
    if (success) {
      this.broadcastToRoom(roomId, {
        type: 'cursor_moved',
        data: cursorData,
        userId,
        timestamp: Date.now()
      }, userId);
    }
  }

  handleClearCanvas(ws, userId, roomId) {
    const success = this.roomManager.clearRoomCanvas(roomId);
    
    if (success) {
      this.broadcastToRoom(roomId, {
        type: 'canvas_cleared',
        data: {},
        userId,
        timestamp: Date.now()
      });
    } else {
      this.sendError(ws, 'Failed to clear canvas');
    }
  }

  handleGetRooms(ws) {
    const stats = this.roomManager.getRoomStats();
    this.sendToClient(ws, {
      type: 'rooms_list',
      data: stats,
      userId: 'server',
      timestamp: Date.now()
    });
  }

  handleClientDisconnect(ws) {
    // Find and remove user from clients and room
    for (const [userId, client] of this.clients.entries()) {
      if (client.ws === ws) {
        this.handleLeaveRoom(ws, userId, client.roomId);
        break;
      }
    }
  }

  broadcastToRoom(roomId, message, excludeUserId = null) {
    const room = this.roomManager.getRoom(roomId);
    if (!room) return;

    const messageStr = JSON.stringify(message);
    
    for (const [userId, client] of this.clients.entries()) {
      if (client.roomId === roomId && 
          userId !== excludeUserId && 
          client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(messageStr);
        } catch (error) {
          console.error('Error broadcasting to user:', userId, error);
        }
      }
    }
  }

  sendToClient(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending message to client:', error);
      }
    }
  }

  sendError(ws, errorMessage) {
    this.sendToClient(ws, {
      type: 'error',
      data: { message: errorMessage },
      userId: 'server',
      timestamp: Date.now()
    });
  }

  startCleanupInterval() {
    // Clean up inactive rooms every hour
    setInterval(() => {
      this.roomManager.cleanupInactiveRooms();
    }, 60 * 60 * 1000);

    // Update client last seen every 30 seconds
    setInterval(() => {
      for (const [userId, client] of this.clients.entries()) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.lastSeen = Date.now();
        } else {
          this.clients.delete(userId);
        }
      }
    }, 30 * 1000);
  }

  start(port = 3001) {
    this.server.listen(port, () => {
      console.log(`🚀 Collaborative Drawing Server running on port ${port}`);
      console.log(`📊 Room management enabled`);
      console.log(`🔗 WebSocket endpoint: ws://localhost:${port}`);
    });
  }

  getServerStats() {
    return {
      ...this.roomManager.getRoomStats(),
      connectedClients: this.clients.size,
      uptime: process.uptime()
    };
  }
}

const server = new CollaborativeDrawingServer();
server.start();

export default CollaborativeDrawingServer;