import { createRealtimeServer } from './realtime';
import { env } from './config/env';

const { httpServer, io } = createRealtimeServer();

httpServer.listen(env.PORT, env.HOST, () => {
  console.log('========================================================');
  console.log(`⚡ Servidor Backend Realtime (Socket.IO) iniciado`);
  console.log(`📡 URL Base:      http://${env.HOST}:${env.PORT}`);
  console.log(`📚 Swagger UI:    http://${env.HOST}:${env.PORT}/api/docs`);
  console.log(`🩺 Health Check:  http://${env.HOST}:${env.PORT}/health`);
  console.log(`🔐 Handshake:     requiere ID token de Firebase (auth.token)`);
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

  // Forzar apagado después de 10s si quedan conexiones colgadas
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
