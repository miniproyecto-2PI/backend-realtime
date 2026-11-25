import { expect, it } from 'vitest';
import { Socket } from 'socket.io-client';
import { connectClient, startTestServer, TEST_USER, waitForConnection } from './helpers';

const next = (socket: Socket, event: string) => new Promise<unknown>(resolve => socket.once(event, resolve));
const join = (socket: Socket, roomId: string) => socket.timeout(2000).emitWithAck('room:join', { roomId });

it('aísla dos salas y reconstruye la presencia después de reconectar', async () => {
  const server = await startTestServer({ verifyIdToken: async uid => ({ ...TEST_USER, uid, name: uid }) });
  const clients = ['Ana', 'Luis', 'Paz'].map(token => connectClient(server.url, { auth: { token } }));
  const [ana, luis, paz] = clients;
  const roomId = 'ABCDEFGH';
  try {
    await Promise.all(clients.map(waitForConnection));
    await join(ana, roomId);
    await join(paz, '23456789');
    const outside: unknown[] = [];
    paz.onAny((event, data) => outside.push([event, data]));
    const joined = next(ana, 'room:user-joined');
    const roster = next(luis, 'room:participants');
    expect(await join(luis, '  ' + roomId + ' ')).toMatchObject({ ok: true });
    expect(await joined).toMatchObject({ roomId, participant: { uid: 'Luis', name: 'Luis', avatar: null } });
    expect(await roster).toMatchObject({ roomId, participants: [{ uid: 'Ana' }, { uid: 'Luis' }] });
    expect(await join(luis, 'ZZZZZZZZ')).toMatchObject({ ok: false, error: { code: 'ROOM_NOT_FOUND' } });
    expect(await join(luis, '   ')).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
    const left = next(ana, 'room:user-left');
    luis.disconnect();
    expect(await left).toMatchObject({ roomId, participant: { uid: 'Luis' } });
    const connected = waitForConnection(luis);
    luis.connect();
    expect(await connected).toEqual({ connected: true });
    const fresh = next(luis, 'room:participants');
    await join(luis, roomId);
    expect(await fresh).toMatchObject({ participants: [{ uid: 'Ana' }, { uid: 'Luis' }] });
    // El ack de ping sirve de barrera para los eventos en tránsito a este cliente.
    await paz.timeout(2000).emitWithAck('ping');
    expect(outside).toEqual([]);
  } finally {
    clients.forEach(c => c.disconnect());
    await server.close();
  }
});
