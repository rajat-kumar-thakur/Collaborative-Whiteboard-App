import { createClient } from '@supabase/supabase-js';

class DatabaseManager {
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️  Supabase environment variables not found. Running in memory-only mode.');
      console.warn('   To enable database persistence, please set up Supabase connection.');
      this.supabase = null;
      this.memoryMode = true;
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.memoryMode = false;
    console.log('✅ Database connection established');
  }

  // Room Management
  async createRoom(roomId, settings = {}) {
    try {
      const { data, error } = await this.supabase
        .from('rooms')
        .insert({
          id: roomId,
          max_users: settings.maxUsers || 50,
          is_public: settings.isPublic !== false,
          allow_anonymous: settings.allowAnonymous !== false
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, room: data };
    } catch (error) {
      console.error('Error creating room:', error);
      return { success: false, error: error.message };
    }
  }

  async getRoom(roomId) {
    try {
      const { data, error } = await this.supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error getting room:', error);
      return null;
    }
  }

  async updateRoomActivity(roomId) {
    try {
      const { error } = await this.supabase
        .from('rooms')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', roomId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating room activity:', error);
      return false;
    }
  }

  async getRoomsList() {
    try {
      const { data, error } = await this.supabase
        .from('rooms')
        .select(`
          id,
          created_at,
          last_activity,
          is_public,
          room_users!inner(user_id)
        `)
        .eq('is_public', true)
        .order('last_activity', { ascending: false });

      if (error) throw error;

      return data.map(room => ({
        id: room.id,
        userCount: room.room_users.length,
        createdAt: room.created_at,
        lastActivity: room.last_activity,
        isPublic: room.is_public
      }));
    } catch (error) {
      console.error('Error getting rooms list:', error);
      return [];
    }
  }

  // User Management
  async addUserToRoom(roomId, userId, userData) {
    try {
      const { data, error } = await this.supabase
        .from('room_users')
        .upsert({
          room_id: roomId,
          user_id: userId,
          name: userData.name || `User ${userId.slice(0, 6)}`,
          color: userData.color || `hsl(${Math.random() * 360}, 70%, 60%)`,
          is_active: true,
          last_seen: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Update room activity
      await this.updateRoomActivity(roomId);

      return { success: true, user: data };
    } catch (error) {
      console.error('Error adding user to room:', error);
      return { success: false, error: error.message };
    }
  }

  async removeUserFromRoom(roomId, userId) {
    try {
      const { error } = await this.supabase
        .from('room_users')
        .update({ is_active: false })
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing user from room:', error);
      return false;
    }
  }

  async getRoomUsers(roomId) {
    try {
      const { data, error } = await this.supabase
        .from('room_users')
        .select('*')
        .eq('room_id', roomId)
        .eq('is_active', true)
        .order('joined_at');

      if (error) throw error;
      return data.map(user => ({
        id: user.user_id,
        name: user.name,
        color: user.color,
        joinedAt: user.joined_at,
        cursor: null
      }));
    } catch (error) {
      console.error('Error getting room users:', error);
      return [];
    }
  }

  async updateUserActivity(roomId, userId) {
    try {
      const { error } = await this.supabase
        .from('room_users')
        .update({ last_seen: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating user activity:', error);
      return false;
    }
  }

  // Drawing Elements Management
  async addElement(roomId, element) {
    try {
      const { data, error } = await this.supabase
        .from('drawing_elements')
        .insert({
          id: element.id,
          room_id: roomId,
          type: element.type,
          points: element.points,
          style: element.style,
          text: element.text || null,
          user_id: element.userId
        })
        .select()
        .single();

      if (error) throw error;

      // Update room activity
      await this.updateRoomActivity(roomId);

      return { success: true, element: data };
    } catch (error) {
      console.error('Error adding element:', error);
      return { success: false, error: error.message };
    }
  }

  async updateElement(roomId, elementId, updates) {
    try {
      const { data, error } = await this.supabase
        .from('drawing_elements')
        .update({
          points: updates.points,
          style: updates.style,
          text: updates.text || null
        })
        .eq('id', elementId)
        .eq('room_id', roomId)
        .select()
        .single();

      if (error) throw error;

      // Update room activity
      await this.updateRoomActivity(roomId);

      return { success: true, element: data };
    } catch (error) {
      console.error('Error updating element:', error);
      return { success: false, error: error.message };
    }
  }

  async removeElement(roomId, elementId) {
    try {
      const { error } = await this.supabase
        .from('drawing_elements')
        .delete()
        .eq('id', elementId)
        .eq('room_id', roomId);

      if (error) throw error;

      // Update room activity
      await this.updateRoomActivity(roomId);

      return true;
    } catch (error) {
      console.error('Error removing element:', error);
      return false;
    }
  }

  async getRoomElements(roomId) {
    try {
      const { data, error } = await this.supabase
        .from('drawing_elements')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at');

      if (error) throw error;

      return data.map(element => ({
        id: element.id,
        type: element.type,
        points: element.points,
        style: element.style,
        text: element.text,
        userId: element.user_id,
        timestamp: new Date(element.created_at).getTime()
      }));
    } catch (error) {
      console.error('Error getting room elements:', error);
      return [];
    }
  }

  async clearRoomElements(roomId) {
    try {
      const { error } = await this.supabase
        .from('drawing_elements')
        .delete()
        .eq('room_id', roomId);

      if (error) throw error;

      // Update room activity
      await this.updateRoomActivity(roomId);

      return true;
    } catch (error) {
      console.error('Error clearing room elements:', error);
      return false;
    }
  }

  // Utility Functions
  async cleanupInactiveRooms() {
    try {
      const { error } = await this.supabase.rpc('cleanup_inactive_rooms');
      if (error) throw error;
      console.log('✅ Inactive rooms cleaned up');
      return true;
    } catch (error) {
      console.error('Error cleaning up inactive rooms:', error);
      return false;
    }
  }

  async getRoomStats() {
    try {
      const { data, error } = await this.supabase.rpc('get_room_stats');
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting room stats:', error);
      return {
        total_rooms: 0,
        active_rooms: 0,
        total_users: 0,
        total_elements: 0
      };
    }
  }

  generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

export default DatabaseManager;