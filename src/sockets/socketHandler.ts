import { Server as SocketIOServer, Socket } from 'socket.io';

let ioInstance: SocketIOServer | null = null;

export function initSocketHandlers(io: SocketIOServer): void {
  ioInstance = io;

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.IO] Cliente conectado: ${socket.id} (Total: ${io.engine.clientsCount})`);

    // Evento ping de verificación de latencia en tiempo real
    socket.on('ping', (callback) => {
      if (typeof callback === 'function') {
        callback({ status: 'ok', serverTime: new Date().toISOString() });
      } else {
        socket.emit('pong', { serverTime: new Date().toISOString() });
      }
    });

    // Evento de desconexión
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Cliente desconectado: ${socket.id} (Razón: ${reason})`);
    });
  });
}

export function getActiveClientsCount(): number {
  return ioInstance ? ioInstance.engine.clientsCount : 0;
}

