import { ObjectId } from 'mongodb';

// User Types
export interface User {
  _id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  lastActive: Date;
}

// Whiteboard Types
export interface Whiteboard {
  _id: string;
  name: string;
  ownerId: string;
  collaborators: Array<{
    userId: string;
    permission: 'view' | 'edit' | 'admin';
    joinedAt: Date;
  }>;
  isPublic: boolean;
  shareToken?: string;
  settings: {
    theme: 'light' | 'dark';
    gridVisible: boolean;
    snapToGrid: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

// Element Types
export type ElementType = 'rectangle' | 'circle' | 'arrow' | 'line' | 'freehand' | 'text' | 'sticky';

export interface ElementProperties {
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: Array<{ x: number; y: number }>;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  rotation: number;
}

export interface Element {
  _id: string;
  whiteboardId: string;
  type: ElementType;
  properties: ElementProperties;
  zIndex: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isDeleted: boolean;
}

// Session Types
export interface Session {
  _id: string;
  whiteboardId: string;
  userId: string;
  socketId: string;
  cursor: {
    x: number;
    y: number;
    visible: boolean;
  };
  activeAt: Date;
  connectionAt: Date;
}

// Socket Event Types
export interface ClientEvents {
  'element:create': {
    whiteboardId: string;
    element: Omit<Element, '_id' | 'createdAt' | 'updatedAt'>;
    tempId: string;
  };
  'element:update': {
    whiteboardId: string;
    elementId: string;
    changes: Partial<ElementProperties>;
    version: number;
  };
  'element:delete': {
    whiteboardId: string;
    elementId: string;
  };
  'cursor:move': {
    whiteboardId: string;
    x: number;
    y: number;
  };
  'user:join': {
    whiteboardId: string;
    token?: string;
  };
  'user:leave': {
    whiteboardId: string;
  };
}

export interface ServerEvents {
  'element:created': {
    element: Element;
    tempId?: string;
    userId: string;
  };
  'element:updated': {
    elementId: string;
    changes: Partial<ElementProperties>;
    version: number;
    userId: string;
  };
  'element:deleted': {
    elementId: string;
    userId: string;
  };
  'user:joined': {
    user: User;
    activeUsers: Array<User & { cursor: { x: number; y: number } }>;
  };
  'user:left': {
    userId: string;
  };
  'cursor:moved': {
    userId: string;
    x: number;
    y: number;
  };
  'conflict:resolution': {
    elementId: string;
    resolvedElement: Element;
  };
}

// Canvas Types
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
}

export interface CanvasState {
  elements: Element[];
  selectedElementIds: string[];
  tool: ElementType | 'select' | 'pan';
  viewport: Viewport;
  isDrawing: boolean;
  currentElement: Partial<Element> | null;
}

// Collaboration Types
export interface CollaborationState {
  activeUsers: Map<string, User & { cursor: { x: number; y: number } }>;
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastSyncTime: Date | null;
}