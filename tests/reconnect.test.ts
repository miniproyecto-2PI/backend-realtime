import { expect, it } from 'vitest';
import type { Socket } from 'socket.io-client';
import { connectClient, startTestServer, TEST_USER } from './helpers';

const next = (s: Socket, event: string) => new Promise<unknown>(resolve => s.once(event, resolve));
const roomId = 'DEMB3333';

it('recupera la presencia automáticamente después de perder el transporte', async () => {
  const server = await startTestServer({ verifyIdToken: async uid => ({ ...TEST_USER, uid, name: uid, picture: 'avatar-01' }) });
  const open = (token: string) => connectClient(server.url, {
    autoConnect: false, auth: { token, roomId }, reconnection: true, reconnectionDelay: 200,
  });
  const ana = open('Ana');
  const luis = open('Luis');
  try {
    const initial = next(ana, 'room:participants');
    ana.connect();
    expect(await initial).toMatchObject({ participants: [{ uid: 'Ana' }] });
    const joined = next(ana, 'room:user-joined');
    const roster = next(luis, 'room:participants');
    luis.connect();
    const expected = { roomId, participants: [{ uid: 'Ana' }, { uid: 'Luis', name: 'Luis', avatar: 'avatar-01' }] };
    expect(await roster).toMatchObject(expected);
    expect(await joined).toMatchObject({ roomId, participant: { uid: 'Luis' } });
    const left = next(ana, 'room:user-left');
    const returned = next(ana, 'room:user-joined');
    const fresh = next(luis, 'room:participants');
    // Cierra la conexión de transporte desde el servidor. El cliente conserva su política de reconexión.
    server.io.of('/').sockets.get(luis.id!)!.conn.close();
    expect(await left).toMatchObject({ roomId, participant: { uid: 'Luis' } });
    expect(await returned).toMatchObject({ participant: { uid: 'Luis' } });
    expect(await fresh).toMatchObject(expected);
  } finally {
    ana.disconnect();
    luis.disconnect();
    await server.close();
  }
});

it('avisa si la sala solicitada en el handshake ya no existe', async () => {
  const server = await startTestServer();
  const client = connectClient(server.url, { autoConnect: false, auth: { token: 'token-valido', roomId: 'ZZZZZZZZ' } });
  try {
    const deleted = next(client, 'room:deleted');
    client.connect();
    expect(await deleted).toEqual({ roomId: 'ZZZZZZZZ' });
    expect(await server.io.in('room:ZZZZZZZZ').fetchSockets()).toHaveLength(0);
  } finally {
    client.disconnect();
    await server.close();
  }
});
