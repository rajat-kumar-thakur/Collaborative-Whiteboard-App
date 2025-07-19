export interface Point {
  x: number;
  y: number;
}

export interface User {
  id: string;
  name: string;
  color: string;
  cursor?: Point;
}

export interface DrawingElement {
  id: string;
  type: 'pen' | 'rectangle' | 'circle' | 'arrow' | 'text';
  points: Point[];
  style: {
    stroke: string;
    strokeWidth: number;
    fill?: string;
  };
  text?: string;
  userId: string;
  timestamp: number;
}

export interface DrawingState {
  elements: DrawingElement[];
  users: User[];
  selectedTool: string;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

export interface WebSocketMessage {
  type: 'element_added' | 'element_updated' | 'element_deleted' | 'cursor_moved' | 'user_joined' | 'user_left';
  data: any;
  userId: string;
  timestamp: number;
}