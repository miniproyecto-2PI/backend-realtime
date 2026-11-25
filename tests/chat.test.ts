import { expect, it } from 'vitest';
import { parseChatInput } from '../src/services/chat.service';
import { connectClient, startTestServer, TEST_USER, waitForConnection } from './helpers';

const roomId = 'ABCDEFGH';
it('normaliza el texto y valida los límites de longitud', () => {
  for (const text of ['', '  ', 'x'.repeat(1001)]) {
    expect(() => parseChatInput({ roomId, text })).toThrow();
  }
  expect(parseChatInput({ roomId, text: ' a ' }).text).toBe('a');
  expect(parseChatInput({ roomId, text: '😊'.repeat(1000) }).text).toBe('😊'.repeat(1000));
});

it('confirma el mensaje persistido y lo entrega solo a los clientes de la sala', async () => {
  let writes = 0;
  const server = await startTestServer({ verifyIdToken: async uid => ({ ...TEST_USER, uid }) }, undefined,
    async (input, author) => {
      if (input.text === 'sin red') throw new Error('Firestore no disponible');
      const id = String(++writes);
      return { id, message: { id, roomId, text: input.text, author, createdAt: new Date().toISOString() } };
    });
  const clients = ['ana', 'luis', 'paz'].map(token => connectClient(server.url, { auth: { token } }));
  const received: string[][] = [[], [], []];
  try {
    await Promise.all(clients.map(waitForConnection));
    await Promise.all(clients.map((client, i) => {
      client.on('chat:message', msg => received[i].push(msg.author.uid + '/' + msg.text));
      return client.timeout(2000).emitWithAck('room:join', i === 2 ? '23456789' : roomId);
    }));
    const send = (i: number, text: string) => clients[i].timeout(2000).emitWithAck('chat:send', { roomId, text });
    expect(await send(2, 'hola')).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    expect(await send(0, '   ')).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
    expect(await send(0, 'sin red')).toMatchObject({ ok: false, error: { code: 'DATABASE_ERROR' } });
    const replies = await Promise.all([send(0, 'uno'), send(0, 'dos')]);
    expect(replies.map(r => r.data.id)).toEqual(['1', '2']);
    await Promise.all(clients.map(c => c.timeout(2000).emitWithAck('ping')));
    expect(received).toEqual([['ana/uno', 'ana/dos'], ['ana/uno', 'ana/dos'], []]);
  } finally {
    clients.forEach(client => client.disconnect());
    await server.close();
  }
});
