import { Server as SocketIOServer, Socket } from 'socket.io';
import { ErrorPayload } from '../types/errors.types';
import { SocketData } from '../types/auth.types';
import { WatchRoom, watchRoom } from '../services/room.watch';
import { LookupEntry, lookupEntry, Participant } from '../services/room.entry';

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
export function initSocketHandlers(io: SocketIOServer, observe: WatchRoom = watchRoom, lookup: LookupEntry = lookupEntry): void {
  ioInstance = io;

  // Un observador por canal ocupado. Socket.IO elimina el canal al salir el último socket.
  const observers = new Map<string, () => void>();
  function participants(channel: string, exclude?: string) {
    const users = new Map<string, Participant>();
    for (const socketId of io.of('/').adapter.rooms.get(channel) ?? []) {
      if (socketId === exclude) continue;
      const person: Participant | undefined = io.of('/').sockets.get(socketId)?.data.participant;
      if (person) users.set(person.uid, person);
    }
    return users;
  }
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
    let attempt = 0;
    function announceDeparture(channel: string) {
      if (!participants(channel, socket.id).has(uid)) {
        socket.to(channel).emit('room:user-left', { roomId: channel.slice(5), participant: socket.data.participant });
      }
    }
    const join = async (payload: unknown, ack?: (response: SocketAckResponse) => void) => {
      const sequence = ++attempt;
      const callback = typeof ack === 'function' ? ack : undefined;
      const roomId = payload && typeof payload === 'object' && 'roomId' in payload ? payload.roomId : payload;
      if (typeof roomId !== 'string' || !/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/.test(roomId.trim())) {
        callback?.(
          createSocketError('VALIDATION_ERROR', 'El identificador de sala es obligatorio.', {
            roomId: 'Escribe el ID de 8 caracteres de la sala.',
          })
        );
        return;
      }

      const id = roomId.trim();
      const channel = 'room:' + id;
      let person: Participant | null;
      try {
        person = await lookup(id, (socket.data as SocketData).user);
      } catch {
        callback?.(createSocketError('DATABASE_ERROR', 'No pudimos consultar la sala.'));
        return;
      }
      if (!socket.connected || sequence !== attempt) {
        callback?.(createSocketError('JOIN_CANCELLED', 'La solicitud de ingreso fue reemplazada.'));
        return;
      }
      if (!person) {
        callback?.(createSocketError('ROOM_NOT_FOUND', 'No encontramos una sala con ese ID. Revisa que esté bien escrito.'));
        return;
      }
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
          callback?.(createSocketError('DATABASE_ERROR', 'No pudimos observar la sala.'));
          return;
        }
      }
      for (const current of socket.rooms) {
        if (current.startsWith('room:') && current !== channel) {
          announceDeparture(current);
          socket.leave(current);
        }
      }
      const alreadyPresent = participants(channel).has(uid);
      socket.data.participant = person;
      socket.join(channel);
      socket.emit('room:participants', { roomId: id, participants: [...participants(channel).values()] });
      if (!alreadyPresent) socket.to(channel).emit('room:user-joined', { roomId: id, participant: person });
      console.log(`[Socket.IO] uid=${uid} (${socket.id}) se unió a la sala: ${id}`);
      callback?.(createSocketSuccess({ roomId: id, joined: true }));
    };
    socket.on('room:join', join);
    socket.on('join-room', join);
    socket.on('disconnecting', () => {
      for (const channel of socket.rooms) {
        if (channel.startsWith('room:')) announceDeparture(channel);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Cliente desconectado: ${socket.id} uid=${uid} (Razón: ${reason})`);
    });
  });
}

export function getActiveClientsCount(): number {
  return ioInstance ? ioInstance.engine.clientsCount : 0;
}
