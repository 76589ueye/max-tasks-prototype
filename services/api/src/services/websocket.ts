import { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as jwt from 'jsonwebtoken';

interface ClientSocket extends WebSocket {
  workspaceId?: string;
  userId?: string;
}

export class WebSocketService {
  private static wss: WebSocketServer | null = null;
  private static jwtSecret = process.env.JWT_SECRET || 'super-secret-jwt-key-change-this-in-production';

  public static init(server: any) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request: IncomingMessage, socket: any, head: any) => {
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      let token = url.searchParams.get('token');

      // Fallback to cookie parser for web clients using HttpOnly credentials
      if (!token && request.headers.cookie) {
        const parsedCookies = request.headers.cookie.split(';').reduce((acc: Record<string, string>, item) => {
          const parts = item.split('=');
          if (parts.length === 2) {
            acc[parts[0].trim()] = parts[1].trim();
          }
          return acc;
        }, {});
        token = parsedCookies['token'];
      }

      if (!token) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      try {
        const decoded = jwt.verify(token, this.jwtSecret) as { userId: string; workspaceId: string };
        
        this.wss?.handleUpgrade(request, socket, head, (ws) => {
          const client = ws as ClientSocket;
          client.userId = decoded.userId;
          client.workspaceId = decoded.workspaceId;
          this.wss?.emit('connection', client, request);
        });
      } catch (err) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
      }
    });

    this.wss.on('connection', (ws: ClientSocket) => {
      console.log(`Realtime client connected: User ${ws.userId} in Workspace ${ws.workspaceId}`);

      ws.on('message', (message) => {
        // Heartbeats or quick messages
        try {
          const payload = JSON.parse(message.toString());
          if (payload.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        } catch {}
      });

      ws.on('close', () => {
        console.log(`Realtime client disconnected: User ${ws.userId}`);
      });
    });
  }

  public static broadcastToWorkspace(workspaceId: string, senderUserId: string, payload: any) {
    if (!this.wss) return;

    this.wss.clients.forEach((client) => {
      const socket = client as ClientSocket;
      if (
        socket.readyState === WebSocket.OPEN &&
        socket.workspaceId === workspaceId &&
        socket.userId !== senderUserId // don't echo back to sender
      ) {
        socket.send(JSON.stringify(payload));
      }
    });
  }
}
