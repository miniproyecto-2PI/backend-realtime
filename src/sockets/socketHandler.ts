import { Server as SocketIOServer, Socket } from 'socket.io';
import { ErrorPayload } from '../types/errors.types';
import { SocketData } from '../types/auth.types';
import { WatchRoom, watchRoom } from '../services/room.watch';

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
export function initSocketHandlers(io: SocketIOServer, observe: WatchRoom = watchRoom): void {
  ioInstance = io;

  // Un observador por canal ocupado. Socket.IO elimina el canal al salir el último socket.
  const observers = new Map<string, () => void>();
  io.of('/').adapter.on('delete-room', (id: string) => {
    observers.get(id)?.();
    observers.delete(id);
  });

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

    // El observador comparte los cambios persistidos entre los participantes del canal.
    socket.on('join-room', (roomId: unknown, callback?: (response: SocketAckResponse) => void) => {
      if (typeof roomId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(roomId.trim())) {
        callback?.(
          createSocketError('VALIDATION_ERROR', 'El identificador de sala es obligatorio.', {
            roomId: 'Debe proporcionar un ID de sala válido.',
          })
        );
        return;
      }

      const id = roomId.trim();
      const channel = 'room:' + id;
      socket.join(channel);
      if (!observers.has(channel)) {
        try {
          let previous: string | undefined;
          const stop = observe(id, name => {
            if (name === null) {
              io.to(channel).emit('room:deleted', { roomId: id });
              io.in(channel).socketsLeave(channel);
            } else if (previous !== name) {
              previous = name;
              io.to(channel).emit('room:updated', { roomId: id, name });
            }
          }, error => {
            console.error('[Firestore] Error al observar sala', id, error.message);
            io.to(channel).emit('room:error', { roomId: id, code: 'DATABASE_ERROR' });
            io.in(channel).socketsLeave(channel);
          });
          observers.set(channel, stop);
        } catch {
          socket.leave(channel);
          callback?.(createSocketError('DATABASE_ERROR', 'No pudimos observar la sala.'));
          return;
        }
      }
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
