import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config(); // fallback to local api .env

import http from 'http';
import app from './app';
import { WebSocketService } from './services/websocket';

const PORT = process.env.PORT || 8080;
const server = http.createServer(app);

// Initialize WebSocket real-time subscription server
WebSocketService.init(server);

server.listen(PORT, () => {
  console.log(`[Max Tasks API] running on http://localhost:${PORT}`);
});
