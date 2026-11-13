import http from 'http';
import { Application } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { createExpressApp } from './app';
import { env } from './config/env';
import { isListedOrigin, parseAllowedOrigins } from './config/cors';
import { createSocketAuthMiddleware } from './sockets/authMiddleware';
import { initSocketHandlers } from './sockets/socketHandler';
import { FirebaseTokenVerifier, TokenVerifier } from './services/token.verifier';

export interface RealtimeDeps {
  tokenVerifier: TokenVerifier;
}

export interface RealtimeServer {
  app: Application;
  httpServer: http.Server;
  io: SocketIOServer;
}

/**
 * Construye Express + Socket.IO sin empezar a escuchar. `overrides` permite inyectar
 * un verificador de tokens de prueba (ver tests/).
 */
export function createRealtimeServer(overrides: Partial<RealtimeDeps> = {}): RealtimeServer {
  const tokenVerifier = overrides.tokenVerifier ?? new FirebaseTokenVerifier();

  const app = createExpressApp();
  const httpServer = http.createServer(app);

  // Misma lista de orígenes que Express (config/cors.ts)
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

  // TS-02: toda conexión exige un ID token de Firebase válido en el handshake
  io.use(createSocketAuthMiddleware(tokenVerifier));
  initSocketHandlers(io);

  return { app, httpServer, io };
}
