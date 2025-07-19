const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = createServer(app);

// Enable CORS
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// Create Socket.io server
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('user:join', ({ whiteboardId, token }) => {
    try {
      // Join the whiteboard room
      socket.join(whiteboardId);
      
      // Broadcast user joined
      socket.to(whiteboardId).emit('user:joined', {
        user: {
          _id: 'anonymous-user',
          email: 'anonymous@example.com',
          name: `User ${socket.id.slice(-4)}`,
          createdAt: new Date(),
          lastActive: new Date(),
        },
        activeUsers: [],
      });

      console.log(`User ${socket.id} joined whiteboard ${whiteboardId}`);
    } catch (error) {
      console.error('Error joining whiteboard:', error);
      socket.emit('error:permission', { 
        message: 'Failed to join whiteboard', 
        code: 'PERMISSION_DENIED' 
      });
    }
  });

  socket.on('element:create', ({ whiteboardId, element, tempId }) => {
    try {
      // Broadcast to all users in the room
      socket.to(whiteboardId).emit('element:created', {
        element: { ...element, _id: tempId },
        tempId,
        userId: 'anonymous-user',
      });

      console.log(`Element created in whiteboard ${whiteboardId}`);
    } catch (error) {
      console.error('Error creating element:', error);
      socket.emit('error:validation', { 
        message: 'Failed to create element', 
        field: 'element' 
      });
    }
  });

  socket.on('element:update', ({ whiteboardId, elementId, changes, version }) => {
    try {
      // Broadcast to all users in the room
      socket.to(whiteboardId).emit('element:updated', {
        elementId,
        changes,
        version: version + 1,
        userId: 'anonymous-user',
      });

      console.log(`Element ${elementId} updated in whiteboard ${whiteboardId}`);
    } catch (error) {
      console.error('Error updating element:', error);
      socket.emit('error:validation', { 
        message: 'Failed to update element', 
        field: 'element' 
      });
    }
  });

  socket.on('element:delete', ({ whiteboardId, elementId }) => {
    try {
      // Broadcast to all users in the room
      socket.to(whiteboardId).emit('element:deleted', {
        elementId,
        userId: 'anonymous-user',
      });

      console.log(`Element ${elementId} deleted from whiteboard ${whiteboardId}`);
    } catch (error) {
      console.error('Error deleting element:', error);
      socket.emit('error:validation', { 
        message: 'Failed to delete element', 
        field: 'elementId' 
      });
    }
  });

  socket.on('cursor:move', ({ whiteboardId, x, y }) => {
    try {
      // Broadcast cursor movement
      socket.to(whiteboardId).emit('cursor:moved', {
        userId: 'anonymous-user',
        x,
        y,
      });
    } catch (error) {
      console.error('Error updating cursor:', error);
    }
  });

  socket.on('user:leave', ({ whiteboardId }) => {
    try {
      // Leave room
      socket.leave(whiteboardId);

      // Broadcast user left
      socket.to(whiteboardId).emit('user:left', {
        userId: 'anonymous-user',
      });

      console.log(`User ${socket.id} left whiteboard ${whiteboardId}`);
    } catch (error) {
      console.error('Error leaving whiteboard:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`);
}); 