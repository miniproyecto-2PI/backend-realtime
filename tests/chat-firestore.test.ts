import { randomUUID } from 'node:crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { expect, it } from 'vitest';
import { getFirebaseAuth } from '../src/config/firebase';
import { saveMessage } from '../src/services/chat.service';

it.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('persiste una sola copia tras reintentos concurrentes y rechaza salas en eliminación', async () => {
  const db = getFirestore(getFirebaseAuth().app);
  const room = db.collection('rooms').doc();
  const author = { uid: 'test-ana', name: 'Ana', avatar: null };
  const input = { roomId: room.id, text: 'Hola', clientMessageId: randomUUID() };
  await room.create({ name: 'Grupo de prueba' });
  try {
    const results = await Promise.all([saveMessage(input, author), saveMessage(input, author)]);
    expect(results[0].id).toBe(results[1].id);
    expect(results.filter(result => result.message)).toHaveLength(1);
    const snapshot = await room.collection('messages').get();
    expect(snapshot.size).toBe(1);
    expect(snapshot.docs[0].data()).toMatchObject({ author, text: 'Hola', id: results[0].id });
    expect(snapshot.docs[0].get('createdAt').toDate()).toBeInstanceOf(Date);
    // US-11: una recarga vía REST y el evento en vivo deben identificar el mismo mensaje.
    const doc = snapshot.docs[0];
    const persisted = doc.data();
    expect(results.find(result => result.message)?.message).toEqual({
      id: doc.id, roomId: room.id, author: persisted.author, text: persisted.text,
      createdAt: persisted.createdAt.toDate().toISOString(),
    });
    await expect(saveMessage({ ...input, text: 'Otro' }, author)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await room.update({ deleting: true });
    await expect(saveMessage(input, author)).rejects.toMatchObject({ code: 'ROOM_NOT_FOUND' });
  } finally {
    await db.recursiveDelete(room);
  }
}, 30000);
