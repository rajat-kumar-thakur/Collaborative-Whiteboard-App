import { NextRequest } from 'next/server';
import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { getDatabase } from '@/lib/database/connection';
import { ElementModel, SessionModel, WhiteboardModel } from '@/lib/database/models';
import { ClientEvents, ServerEvents } from '@/types';

interface SocketServer extends NetServer {
  io?: SocketIOServer<ClientEvents, ServerEvents>;
}

const SocketHandler = async (req: NextRequest) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const res = new Response();
  const server = res as any as SocketServer;

  if (!server.io) {
    console.log('Setting up Socket.io server...');
    
    const io = new SocketIOServer(server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
    });

    io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      socket.on('user:join', async ({ whiteboardId, token }) => {
        try {
          // Join the whiteboard room
          socket.join(whiteboardId);
          
          // Create session record
          const session = await SessionModel.create({
            whiteboardId,
            userId: 'anonymous-user', // TODO: Get from auth token
            socketId: socket.id,
            cursor: { x: 0, y: 0, visible: false },
            activeAt: new Date(),
          });

          // Get active users in this whiteboard
          const activeSessions = await SessionModel.findByWhiteboardId(whiteboardId);
          
          // Broadcast user joined
          socket.to(whiteboardId).emit('user:joined', {
            user: {
              _id: 'anonymous-user',
              email: 'anonymous@example.com',
              name: `User ${socket.id.slice(-4)}`,
              createdAt: new Date(),
              lastActive: new Date(),
            },
            activeUsers: activeSessions.map(s => ({
              _id: s.userId,
              email: 'anonymous@example.com',
              name: `User ${s.socketId.slice(-4)}`,
              createdAt: new Date(),
              lastActive: new Date(),
              cursor: s.cursor,
            })),
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

      socket.on('element:create', async ({ whiteboardId, element, tempId }) => {
        try {
          // Create element in database
          const newElement = await ElementModel.create({
            ...element,
            whiteboardId,
            createdBy: 'anonymous-user', // TODO: Get from auth
            version: 1,
            isDeleted: false,
          });

          // Update whiteboard version
          await WhiteboardModel.updateVersion(whiteboardId);

          // Broadcast to all users in the room
          socket.to(whiteboardId).emit('element:created', {
            element: newElement,
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

      socket.on('element:update', async ({ whiteboardId, elementId, changes, version }) => {
        try {
          // Update element in database
          const updatedElement = await ElementModel.updateById(elementId, {
            properties: changes,
            version: version + 1,
          });

          if (!updatedElement) {
            socket.emit('error:conflict', { 
              message: 'Element not found or version conflict', 
              elementId 
            });
            return;
          }

          // Update whiteboard version
          await WhiteboardModel.updateVersion(whiteboardId);

          // Broadcast to all users in the room
          socket.to(whiteboardId).emit('element:updated', {
            elementId,
            changes,
            version: updatedElement.version,
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

      socket.on('element:delete', async ({ whiteboardId, elementId }) => {
        try {
          // Soft delete element
          const deleted = await ElementModel.deleteById(elementId);

          if (!deleted) {
            socket.emit('error:validation', { 
              message: 'Element not found', 
              field: 'elementId' 
            });
            return;
          }

          // Update whiteboard version
          await WhiteboardModel.updateVersion(whiteboardId);

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

      socket.on('cursor:move', async ({ whiteboardId, x, y }) => {
        try {
          // Update cursor position in session
          await SessionModel.updateCursor(socket.id, { x, y, visible: true });

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

      socket.on('user:leave', async ({ whiteboardId }) => {
        try {
          // Remove session
          await SessionModel.deleteBySocketId(socket.id);

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

      socket.on('disconnect', async () => {
        try {
          // Clean up session on disconnect
          await SessionModel.deleteBySocketId(socket.id);
          console.log('User disconnected:', socket.id);
        } catch (error) {
          console.error('Error on disconnect:', error);
        }
      });
    });

    server.io = io;
  }

  return new Response('Socket.io server initialized', { status: 200 });
};

export { SocketHandler as GET };