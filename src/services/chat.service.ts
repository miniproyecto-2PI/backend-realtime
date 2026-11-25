import { createHash } from 'node:crypto';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getFirebaseAuth } from '../config/firebase';
import { RoomNotFoundError, ValidationError } from '../types/errors.types';
import { Participant } from './room.entry';

export interface ChatInput {
  roomId: string;
  text: string;
  clientMessageId?: string;
}

export function parseChatInput(payload: unknown): ChatInput {
  if (!payload || typeof payload !== 'object' || !('roomId' in payload) ||
      typeof payload.roomId !== 'string' || !/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/.test(payload.roomId)) {
    throw new ValidationError('ID de sala inválido.', { roomId: 'Usa el ID de la sala actual.' });
  }
  const text = 'text' in payload && typeof payload.text === 'string' ? payload.text.trim() : '';
  if (!text || [...text].length > 1000) {
    throw new ValidationError('El mensaje debe tener entre 1 y 1000 caracteres.', { text: 'Revisa el texto del mensaje.' });
  }
  const key = 'clientMessageId' in payload ? payload.clientMessageId : undefined;
  if (key !== undefined && (typeof key !== 'string' || !/^[\w-]{1,128}$/.test(key))) {
    throw new ValidationError('Identificador de reintento inválido.', { clientMessageId: 'Usa un UUID.' });
  }
  return { roomId: payload.roomId, text, clientMessageId: key };
}

export async function saveMessage(input: ChatInput, author: Participant) {
  const db = getFirestore(getFirebaseAuth().app);
  const room = db.collection('rooms').doc(input.roomId);
  const messages = room.collection('messages');
  const ref = input.clientMessageId
    ? messages.doc(createHash('sha256').update(JSON.stringify([author.uid, input.clientMessageId])).digest('hex'))
    : messages.doc();
  return db.runTransaction(async tx => {
    const snapshot = await tx.get(room);
    if (!snapshot.exists || snapshot.get('deleting') === true) throw new RoomNotFoundError();
    if (input.clientMessageId) {
      const existing = await tx.get(ref);
      if (existing.exists) {
        if (existing.get('text') !== input.text) throw new ValidationError('Este identificador ya corresponde a otro texto.');
        return { id: ref.id, message: null };
      }
    }
    const createdAt = Timestamp.now();
    const data = { id: ref.id, roomId: room.id, text: input.text, author, createdAt };
    tx.create(ref, data);
    return { id: ref.id, message: { ...data, createdAt: createdAt.toDate().toISOString() } };
  });
}
