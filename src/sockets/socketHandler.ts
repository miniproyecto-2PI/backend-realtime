import { Server as SocketIOServer, Socket } from 'socket.io';
import { ErrorPayload } from '../types/errors.types';
import { SocketData } from '../types/auth.types';

// Catálogo de eventos: docs/EVENTOS_TIEMPO_REAL.md

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
  return { ok: false, error: { code, message, fields } };
}

export function createSocketSuccess<T>(data: T): SocketAckResponse<T> {
  return { ok: true, data };
}

/**
 * Registra los eventos. Toda conexión que llega aquí ya pasó por el middleware de
 * autenticación del handshake: socket.data.user siempre existe.
 */
export function initSocketHandlers(io: SocketIOServer): void {
  ioInstance = io;

  io.on('connection', (socket: Socket) => {
    const { uid } = (socket.data as SocketData).user;
    console.log(`[Socket.IO] Cliente conectado: ${socket.id} uid=${uid} (Total: ${io.engine.clientsCount})`);

    // Evento ping con respuesta estándar
    socket.on('ping', (callback?: (response: SocketAckResponse) => void) => {
      const response = createSocketSuccess({ serverTime: new Date().toISOString(), uid });
      if (typeof callback === 'function') {
        callback(response);
      } else {
        socket.emit('pong', response);
      }
    });

    // Unión a sala (base de TS-02; la validación contra Firestore llega en el Sprint 2)
    socket.on('join-room', (roomId: unknown, callback?: (response: SocketAckResponse) => void) => {
      if (typeof roomId !== 'string' || roomId.trim().length === 0) {
        callback?.(
          createSocketError('VALIDATION_ERROR', 'El identificador de sala es obligatorio.', {
            roomId: 'Debe proporcionar un ID de sala válido.',
          })
        );
        return;
      }

      const id = roomId.trim();
      socket.join(id);
      console.log(`[Socket.IO] uid=${uid} (${socket.id}) se unió a la sala: ${id}`);
      callback?.(createSocketSuccess({ roomId: id, joined: true }));
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Cliente desconectado: ${socket.id} uid=${uid} (Razón: ${reason})`);
    });
  });
}

export function getActiveClientsCount(): number {
  return ioInstance ? ioInstance.engine.clientsCount : 0;
}
