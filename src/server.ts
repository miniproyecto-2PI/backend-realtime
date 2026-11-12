import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createExpressApp } from './app';
import { initSocketHandlers } from './sockets/socketHandler';
import { env } from './config/env';
import { isListedOrigin, parseAllowedOrigins } from './config/cors';

const app = createExpressApp();
const httpServer = http.createServer(app);

// Inicializar Socket.IO sobre el servidor HTTP con la misma lista de orígenes que Express
const allowedOrigins = parseAllowedOrigins(env.CORS_ORIGIN);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Sin Origin: clientes no navegador (pruebas, herramientas). Con Origin: debe estar en la lista.
      if (!origin || isListedOrigin(origin, allowedOrigins)) return callback(null, true);
      console.warn(`[CORS] Conexión Socket.IO bloqueada desde origen no permitido: ${origin}`);
      return callback(null, false);
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 20000,
  pingInterval: 25000,
});

initSocketHandlers(io);

httpServer.listen(env.PORT, env.HOST, () => {
  console.log('========================================================');
  console.log(`⚡ Servidor Backend Realtime (Socket.IO) iniciado`);
  console.log(`📡 URL Base:      http://${env.HOST}:${env.PORT}`);
  console.log(`📚 Swagger UI:    http://${env.HOST}:${env.PORT}/api/docs`);
  console.log(`🩺 Health Check:  http://${env.HOST}:${env.PORT}/health`);
  console.log(`🌍 Entorno:       ${env.NODE_ENV}`);
  console.log('========================================================');
});

// Manejo de apagado elegante
const shutdown = (signal: string) => {
  console.log(`\n[Realtime] Señal ${signal} recibida. Cerrando conexiones...`);
  io.close(() => {
    httpServer.close(() => {
      console.log('[Realtime] Servidor cerrado correctamente.');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
