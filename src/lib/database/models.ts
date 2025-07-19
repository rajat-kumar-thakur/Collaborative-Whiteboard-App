import { getDatabase } from './connection';
import { User, Whiteboard, Element, Session } from '@/types';
import { ObjectId } from 'mongodb';

export class UserModel {
  static async create(userData: Omit<User, '_id' | 'createdAt' | 'lastActive'>): Promise<User> {
    const db = await getDatabase();
    const now = new Date();
    
    const user = {
      ...userData,
      createdAt: now,
      lastActive: now,
    };
    
    const result = await db.collection('users').insertOne(user);
    return { ...user, _id: result.insertedId.toString() };
  }
  
  static async findById(id: string): Promise<User | null> {
    const db = await getDatabase();
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    return user ? { ...user, _id: user._id.toString() } : null;
  }
  
  static async findByEmail(email: string): Promise<User | null> {
    const db = await getDatabase();
    const user = await db.collection('users').findOne({ email });
    return user ? { ...user, _id: user._id.toString() } : null;
  }
  
  static async updateLastActive(id: string): Promise<void> {
    const db = await getDatabase();
    await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: { lastActive: new Date() } }
    );
  }
}

export class WhiteboardModel {
  static async create(whiteboardData: Omit<Whiteboard, '_id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<Whiteboard> {
    const db = await getDatabase();
    const now = new Date();
    
    const whiteboard = {
      ...whiteboardData,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    
    const result = await db.collection('whiteboards').insertOne(whiteboard);
    return { ...whiteboard, _id: result.insertedId.toString() };
  }
  
  static async findById(id: string): Promise<Whiteboard | null> {
    const db = await getDatabase();
    const whiteboard = await db.collection('whiteboards').findOne({ _id: new ObjectId(id) });
    return whiteboard ? { ...whiteboard, _id: whiteboard._id.toString() } : null;
  }
  
  static async findByShareToken(shareToken: string): Promise<Whiteboard | null> {
    const db = await getDatabase();
    const whiteboard = await db.collection('whiteboards').findOne({ shareToken });
    return whiteboard ? { ...whiteboard, _id: whiteboard._id.toString() } : null;
  }
  
  static async findByUserId(userId: string): Promise<Whiteboard[]> {
    const db = await getDatabase();
    const whiteboards = await db.collection('whiteboards').find({
      $or: [
        { ownerId: userId },
        { 'collaborators.userId': userId }
      ]
    }).toArray();
    
    return whiteboards.map(wb => ({ ...wb, _id: wb._id.toString() }));
  }
  
  static async updateVersion(id: string): Promise<number> {
    const db = await getDatabase();
    const result = await db.collection('whiteboards').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { 
        $inc: { version: 1 },
        $set: { updatedAt: new Date() }
      },
      { returnDocument: 'after' }
    );
    
    return result?.version || 1;
  }
}

export class ElementModel {
  static async create(elementData: Omit<Element, '_id' | 'createdAt' | 'updatedAt'>): Promise<Element> {
    const db = await getDatabase();
    const now = new Date();
    
    const element = {
      ...elementData,
      createdAt: now,
      updatedAt: now,
    };
    
    const result = await db.collection('elements').insertOne(element);
    return { ...element, _id: result.insertedId.toString() };
  }
  
  static async findByWhiteboardId(whiteboardId: string): Promise<Element[]> {
    const db = await getDatabase();
    const elements = await db.collection('elements').find({
      whiteboardId,
      isDeleted: false
    }).sort({ zIndex: 1 }).toArray();
    
    return elements.map(el => ({ ...el, _id: el._id.toString() }));
  }
  
  static async updateById(id: string, changes: Partial<Element>): Promise<Element | null> {
    const db = await getDatabase();
    const result = await db.collection('elements').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { 
        $set: { ...changes, updatedAt: new Date() },
        $inc: { version: 1 }
      },
      { returnDocument: 'after' }
    );
    
    return result ? { ...result, _id: result._id.toString() } : null;
  }
  
  static async deleteById(id: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.collection('elements').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { isDeleted: true, updatedAt: new Date() },
        $inc: { version: 1 }
      }
    );
    
    return result.modifiedCount > 0;
  }
}

export class SessionModel {
  static async create(sessionData: Omit<Session, '_id' | 'connectionAt'>): Promise<Session> {
    const db = await getDatabase();
    const now = new Date();
    
    const session = {
      ...sessionData,
      connectionAt: now,
    };
    
    const result = await db.collection('sessions').insertOne(session);
    return { ...session, _id: result.insertedId.toString() };
  }
  
  static async findByWhiteboardId(whiteboardId: string): Promise<Session[]> {
    const db = await getDatabase();
    const sessions = await db.collection('sessions').find({ whiteboardId }).toArray();
    return sessions.map(session => ({ ...session, _id: session._id.toString() }));
  }
  
  static async updateCursor(socketId: string, cursor: { x: number; y: number; visible: boolean }): Promise<void> {
    const db = await getDatabase();
    await db.collection('sessions').updateOne(
      { socketId },
      { 
        $set: { cursor, activeAt: new Date() }
      }
    );
  }
  
  static async deleteBySocketId(socketId: string): Promise<void> {
    const db = await getDatabase();
    await db.collection('sessions').deleteOne({ socketId });
  }
}