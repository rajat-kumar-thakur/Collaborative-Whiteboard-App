import { io, Socket } from 'socket.io-client';
import { ClientEvents, ServerEvents } from '../../types';

class SocketClient {
  private socket: Socket<ServerEvents, ClientEvents> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(whiteboardId: string): Socket<ServerEvents, ClientEvents> {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      path: '/api/socket',
      transports: ['websocket'],
      upgrade: false,
      rememberUpgrade: false,
      timeout: 10000,
      query: {
        whiteboardId,
      },
    });

    this.setupEventHandlers();
    return this.socket;
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.handleReconnection();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.handleReconnection();
    });
  }

  private handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.socket?.connect();
      }, delay);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit<K extends keyof ClientEvents>(event: K, data: ClientEvents[K]) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  on<K extends keyof ServerEvents>(event: K, handler: (data: ServerEvents[K]) => void) {
    if (this.socket) {
      this.socket.on(event, handler);
    }
  }

  off<K extends keyof ServerEvents>(event: K, handler?: (data: ServerEvents[K]) => void) {
    if (this.socket) {
      this.socket.off(event, handler);
    }
  }

  get connected(): boolean {
    return this.socket?.connected || false;
  }

  get id(): string | undefined {
    return this.socket?.id;
  }
}

export const socketClient = new SocketClient();