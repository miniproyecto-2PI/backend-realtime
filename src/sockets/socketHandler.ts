import { Server as SocketIOServer, Socket } from 'socket.io';
import { ErrorPayload } from '../types/errors.types';

let ioInstance: SocketIOServer | null = null;

export interface SocketAckResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: ErrorPayload;
}

export function createSocketError(
  code: string,
  message: string,
  fields: Record<string, string> | null = null
): SocketAckResponse {
  return {
    ok: false,
    error: {
      code,
      message,
      fields,
    },
  };
}

export function createSocketSuccess<T>(data: T): SocketAckResponse<T> {
  return {
    ok: true,
    data,
  };
}

export function initSocketHandlers(io: SocketIOServer): void {
  ioInstance = io;

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.IO] Cliente conectado: ${socket.id} (Total: ${io.engine.clientsCount})`);

    // Evento ping con respuesta estándar
    socket.on('ping', (callback) => {
      const response = createSocketSuccess({ serverTime: new Date().toISOString() });
      if (typeof callback === 'function') {
        callback(response);
      } else {
        socket.emit('pong', response);
      }
    });

    // Ejemplo de evento de unión a sala validando errores según TS-05
    socket.on('join-room', (roomId: string, callback) => {
      if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
        const errorResp = createSocketError(
          'VALIDATION_ERROR',
          'El identificador de sala es obligatorio.',
          { roomId: 'Debe proporcionar un ID de sala válido.' }
        );
        if (typeof callback === 'function') callback(errorResp);
        return;
      }

      socket.join(roomId);
      console.log(`[Socket.IO] Cliente ${socket.id} se unió a sala: ${roomId}`);
      if (typeof callback === 'function') {
        callback(createSocketSuccess({ roomId, joined: true }));
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
