class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  createRoom(roomId = null) {
    const id = roomId || this.generateRoomId();
    
    if (this.rooms.has(id)) {
      return { success: false, error: 'Room already exists' };
    }

    const room = {
      id,
      elements: [],
      users: new Map(),
      createdAt: Date.now(),
      lastActivity: Date.now(),
      settings: {
        maxUsers: 50,
        isPublic: true,
        allowAnonymous: true
      }
    };

    this.rooms.set(id, room);
    console.log(`Room created: ${id}`);
    
    return { success: true, roomId: id, room };
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  getRoomsList() {
    return Array.from(this.rooms.entries()).map(([id, room]) => ({
      id,
      userCount: room.users.size,
      createdAt: room.createdAt,
      lastActivity: room.lastActivity,
      isPublic: room.settings.isPublic
    }));
  }

  addUserToRoom(roomId, userId, userData) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.users.size >= room.settings.maxUsers) {
      return { success: false, error: 'Room is full' };
    }

    const user = {
      id: userId,
      name: userData.name || `User ${userId.slice(0, 6)}`,
      color: userData.color || `hsl(${Math.random() * 360}, 70%, 60%)`,
      joinedAt: Date.now(),
      cursor: null,
      isActive: true
    };

    room.users.set(userId, user);
    room.lastActivity = Date.now();

    console.log(`User ${userId} joined room ${roomId}`);
    return { success: true, user, room };
  }

  removeUserFromRoom(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const removed = room.users.delete(userId);
    if (removed) {
      room.lastActivity = Date.now();
      console.log(`User ${userId} left room ${roomId}`);
      
      // Clean up empty rooms after 5 minutes
      if (room.users.size === 0) {
        setTimeout(() => {
          if (this.rooms.has(roomId) && this.rooms.get(roomId).users.size === 0) {
            this.rooms.delete(roomId);
            console.log(`Empty room ${roomId} cleaned up`);
          }
        }, 5 * 60 * 1000);
      }
    }

    return removed;
  }

  addElementToRoom(roomId, element) {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.elements.push(element);
    room.lastActivity = Date.now();
    return true;
  }

  updateElementInRoom(roomId, elementId, updates) {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const elementIndex = room.elements.findIndex(el => el.id === elementId);
    if (elementIndex === -1) return false;

    room.elements[elementIndex] = { ...room.elements[elementIndex], ...updates };
    room.lastActivity = Date.now();
    return true;
  }

  removeElementFromRoom(roomId, elementId) {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const initialLength = room.elements.length;
    room.elements = room.elements.filter(el => el.id !== elementId);
    room.lastActivity = Date.now();
    
    return room.elements.length < initialLength;
  }

  clearRoomCanvas(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.elements = [];
    room.lastActivity = Date.now();
    return true;
  }

  updateUserCursor(roomId, userId, cursor) {
    const room = this.rooms.get(roomId);
    if (!room || !room.users.has(userId)) return false;

    const user = room.users.get(userId);
    user.cursor = cursor;
    room.lastActivity = Date.now();
    return true;
  }

  generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Clean up inactive rooms (older than 24 hours with no activity)
  cleanupInactiveRooms() {
    const now = Date.now();
    const maxInactiveTime = 24 * 60 * 60 * 1000; // 24 hours

    for (const [roomId, room] of this.rooms.entries()) {
      if (now - room.lastActivity > maxInactiveTime) {
        this.rooms.delete(roomId);
        console.log(`Inactive room ${roomId} cleaned up`);
      }
    }
  }

  getRoomStats() {
    return {
      totalRooms: this.rooms.size,
      totalUsers: Array.from(this.rooms.values()).reduce((sum, room) => sum + room.users.size, 0),
      rooms: this.getRoomsList()
    };
  }

  getRoomElements(roomId) {
    const room = this.rooms.get(roomId);
    return room ? room.elements : [];
  }

  getRoomUsers(roomId) {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.users.values()) : [];
  }
}

export default RoomManager;