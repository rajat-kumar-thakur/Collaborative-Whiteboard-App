import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';
import DatabaseManager from './database.js';
import RoomManager from './roomManager.js';

class CollaborativeDrawingServer {
  constructor() {
    this.server = http.createServer();
    this.wss = new WebSocketServer({ server: this.server });
    this.db = new DatabaseManager();
    this.roomManager = this.db.memoryMode ? new RoomManager() : null;
    this.clients = new Map(); // userId -> { ws, roomId, lastSeen }
    this.roomCursors = new Map(); // roomId -> Map(userId -> cursor)
    
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

  async handleMessage(ws, message) {
    const { type, data, userId, roomId, timestamp } = message;

    try {
      switch (type) {
        case 'create_room':
          await this.handleCreateRoom(ws, userId, data);
          break;

        case 'join_room':
          await this.handleJoinRoom(ws, userId, roomId, data);
          break;

        case 'leave_room':
          await this.handleLeaveRoom(ws, userId, roomId);
          break;

        case 'element_added':
          await this.handleElementAdded(ws, userId, roomId, data);
          break;

        case 'element_updated':
          await this.handleElementUpdated(ws, userId, roomId, data);
          break;

        case 'element_deleted':
          await this.handleElementDeleted(ws, userId, roomId, data);
          break;

        case 'cursor_moved':
          await this.handleCursorMoved(ws, userId, roomId, data);
          break;

        case 'clear_canvas':
          await this.handleClearCanvas(ws, userId, roomId);
          break;

        case 'get_rooms':
          await this.handleGetRooms(ws);
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

  async handleCreateRoom(ws, userId, data) {
    try {
      if (this.db.memoryMode) {
        const roomId = this.roomManager.generateRoomId();
        const room = this.roomManager.createRoom(roomId, data);
        
        this.sendToClient(ws, {
          type: 'room_created',
          data: {
            roomId: roomId,
            roomUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}?room=${roomId}`,
            room: room
          },
          userId: 'server',
          timestamp: Date.now()
        });
        
        console.log(`Room ${roomId} created successfully`);
      } else {
        let roomId;
        let attempts = 0;
        let result;

        // Generate unique room ID
        do {
          roomId = this.db.generateRoomId();
          result = await this.db.createRoom(roomId, data);
          attempts++;
        } while (!result.success && attempts < 10);

        if (result.success) {
          this.sendToClient(ws, {
            type: 'room_created',
            data: {
              roomId: roomId,
              roomUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}?room=${roomId}`,
              room: result.room
            },
            userId: 'server',
            timestamp: Date.now()
          });
          
          console.log(`Room ${roomId} created successfully`);
        } else {
          this.sendError(ws, 'Failed to create room after multiple attempts');
        }
      }
    } catch (error) {
      console.error('Error in handleCreateRoom:', error);
      this.sendError(ws, 'Failed to create room');
    }
  }

  async handleJoinRoom(ws, userId, roomId, userData) {
    try {
      if (!roomId) {
        this.sendError(ws, 'Room ID is required');
        return;
      }

      if (this.db.memoryMode) {
        // Check if room exists, create if it doesn't
        let room = this.roomManager.getRoom(roomId);
        if (!room) {
          room = this.roomManager.createRoom(roomId);
        }

        // Add user to room
        const user = this.roomManager.addUserToRoom(roomId, userId, userData || {});
        
        // Store client connection info
        this.clients.set(userId, { ws, roomId, lastSeen: Date.now() });

        // Initialize room cursors if needed
        if (!this.roomCursors.has(roomId)) {
          this.roomCursors.set(roomId, new Map());
        }

        // Get room data
        const elements = this.roomManager.getRoomElements(roomId);
        const users = this.roomManager.getRoomUsers(roomId);

        // Send current room state to new user
        this.sendToClient(ws, {
          type: 'room_joined',
          data: {
            roomId,
            elements,
            users,
            user: user
          },
          userId: 'server',
          timestamp: Date.now()
        });

        // Notify other users in the room
        this.broadcastToRoom(roomId, {
          type: 'user_joined',
          data: user,
          userId: 'server',
          timestamp: Date.now()
        }, userId);

        console.log(`User ${userId} joined room ${roomId}`);
      } else {
        // Check if room exists, create if it doesn't
        let room = await this.db.getRoom(roomId);
        if (!room) {
          const createResult = await this.db.createRoom(roomId);
          if (!createResult.success) {
            this.sendError(ws, createResult.error);
            return;
          }
          room = createResult.room;
        }

        // Add user to room
        const result = await this.db.addUserToRoom(roomId, userId, userData || {});
        
        if (result.success) {
          // Store client connection info
          this.clients.set(userId, { ws, roomId, lastSeen: Date.now() });

          // Initialize room cursors if needed
          if (!this.roomCursors.has(roomId)) {
            this.roomCursors.set(roomId, new Map());
          }

          // Get room data
          const [elements, users] = await Promise.all([
            this.db.getRoomElements(roomId),
            this.db.getRoomUsers(roomId)
          ]);

          // Send current room state to new user
          this.sendToClient(ws, {
            type: 'room_joined',
            data: {
              roomId,
              elements,
              users,
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

          console.log(`User ${userId} joined room ${roomId}`);
        } else {
          this.sendError(ws, result.error);
        }
      }
    } catch (error) {
      console.error('Error in handleJoinRoom:', error);
      this.sendError(ws, 'Failed to join room');
    }
  }

  async handleLeaveRoom(ws, userId, roomId) {
    try {
      let removed;
      if (this.db.memoryMode) {
        removed = this.roomManager.removeUserFromRoom(roomId, userId);
      } else {
        removed = await this.db.removeUserFromRoom(roomId, userId);
      }
      
      if (removed) {
        this.clients.delete(userId);
        
        // Remove cursor
        if (this.roomCursors.has(roomId)) {
          this.roomCursors.get(roomId).delete(userId);
        }
        
        // Notify other users in the room
        this.broadcastToRoom(roomId, {
          type: 'user_left',
          data: { userId },
          userId: 'server',
          timestamp: Date.now()
        }, userId);

        console.log(`User ${userId} left room ${roomId}`);
      }
    } catch (error) {
      console.error('Error in handleLeaveRoom:', error);
    }
  }

  async handleElementAdded(ws, userId, roomId, elementData) {
    try {
      let result;
      if (this.db.memoryMode) {
        result = { success: this.roomManager.addElement(roomId, elementData) };
      } else {
        result = await this.db.addElement(roomId, elementData);
      }
      
      if (result.success) {
        this.broadcastToRoom(roomId, {
          type: 'element_added',
          data: elementData,
          userId,
          timestamp: Date.now()
        }, userId);
      } else {
        this.sendError(ws, 'Failed to add element');
      }
    } catch (error) {
      console.error('Error in handleElementAdded:', error);
      this.sendError(ws, 'Failed to add element');
    }
  }

  async handleElementUpdated(ws, userId, roomId, elementData) {
    try {
      const result = await this.db.updateElement(roomId, elementData.id, elementData);
      
      if (result.success) {
        this.broadcastToRoom(roomId, {
          type: 'element_updated',
          data: elementData,
          userId,
          timestamp: Date.now()
        }, userId);
      } else {
        this.sendError(ws, 'Failed to update element');
      }
    } catch (error) {
      console.error('Error in handleElementUpdated:', error);
      this.sendError(ws, 'Failed to update element');
    }
  }

  async handleElementDeleted(ws, userId, roomId, elementId) {
    try {
      const success = await this.db.removeElement(roomId, elementId);
      
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
    } catch (error) {
      console.error('Error in handleElementDeleted:', error);
      this.sendError(ws, 'Failed to delete element');
    }
  }

  async handleCursorMoved(ws, userId, roomId, cursorData) {
    try {
      // Store cursor in memory (don't persist to database)
      if (!this.roomCursors.has(roomId)) {
        this.roomCursors.set(roomId, new Map());
      }
      this.roomCursors.get(roomId).set(userId, cursorData.position);

      // Update user activity
      await this.db.updateUserActivity(roomId, userId);
      
      this.broadcastToRoom(roomId, {
        type: 'cursor_moved',
        data: cursorData,
        userId,
        timestamp: Date.now()
      }, userId);
    } catch (error) {
      console.error('Error in handleCursorMoved:', error);
    }
  }

  async handleClearCanvas(ws, userId, roomId) {
    try {
      const success = await this.db.clearRoomElements(roomId);
      
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
    } catch (error) {
      console.error('Error in handleClearCanvas:', error);
      this.sendError(ws, 'Failed to clear canvas');
    }
  }

  async handleGetRooms(ws) {
    try {
      const stats = await this.db.getRoomStats();
      this.sendToClient(ws, {
        type: 'rooms_list',
        data: stats,
        userId: 'server',
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error in handleGetRooms:', error);
      this.sendError(ws, 'Failed to get rooms list');
    }
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
    setInterval(async () => {
      await this.db.cleanupInactiveRooms();
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

    // Log server stats every 10 minutes
    setInterval(async () => {
      const stats = await this.db.getRoomStats();
      console.log('📊 Server Stats:', {
        ...stats,
        connectedClients: this.clients.size,
        uptime: Math.floor(process.uptime() / 60) + ' minutes'
      });
    }, 10 * 60 * 1000);
  }

  start(port = 3001) {
    this.server.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Collaborative Drawing Server running on port ${port}`);
      console.log(`💾 Database integration enabled`);
      console.log(`🔗 WebSocket endpoint: ws://localhost:${port}`);
    });
  }

  async getServerStats() {
    const dbStats = await this.db.getRoomStats();
    return {
      ...dbStats,
      connectedClients: this.clients.size,
      uptime: process.uptime()
    };
  }
}

const server = new CollaborativeDrawingServer();
server.start();

export default CollaborativeDrawingServer;