import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Socket as ClientSocket } from 'socket.io-client';
import { connectClient, startTestServer, TestServer, TEST_USER, VALID_TOKEN, waitForConnection } from './helpers';

/** Eventos v0.1 del catálogo (docs/EVENTOS_TIEMPO_REAL.md) y formato de acks TS-05. */
describe('Eventos Socket.IO', () => {
  let server: TestServer;
  let client: ClientSocket;

  beforeAll(async () => {
    server = await startTestServer();
    client = connectClient(server.url, { auth: { token: VALID_TOKEN } });
    const result = await waitForConnection(client);
    if (!result.connected) throw new Error('No se pudo conectar el cliente de prueba');
  });
  afterAll(async () => {
    client.disconnect();
    await server.close();
  });

  it('ping responde un ack de éxito con la hora del servidor y el uid', async () => {
    const res = await client.timeout(2000).emitWithAck('ping');
    expect(res).toEqual({
      ok: true,
      data: { serverTime: expect.any(String), uid: TEST_USER.uid },
    });
    expect(Number.isNaN(Date.parse(res.data.serverTime))).toBe(false);
  });

  it('ping sin callback responde con el evento pong', async () => {
    const pong = new Promise((resolve) => client.once('pong', resolve));
    client.emit('ping');
    expect(await pong).toMatchObject({ ok: true });
  });

  it('notifica la edición y la eliminación a los participantes y libera el canal', async () => {
    let changed!: (name: string | null) => void;
    let stopped = false;
    const instance = await startTestServer(undefined, (_id, onChange) => {
      changed = onChange;
      return () => { stopped = true; };
    });
    const clients = [1, 2].map(() => connectClient(instance.url, { auth: { token: VALID_TOKEN } }));
    try {
      await Promise.all(clients.map(waitForConnection));
      await Promise.all(clients.map(c => c.timeout(2000).emitWithAck('join-room', 'ABCDEFGH')));
      changed('Inicial');
      const updates = clients.map(c => new Promise(resolve => {
        c.on('room:updated', data => { if (data.name === 'Nuevo') resolve(data); });
      }));
      changed('Nuevo');
      for (const update of updates) expect(await update).toEqual({ roomId: 'ABCDEFGH', name: 'Nuevo' });
      const deletions = clients.map(c => new Promise(resolve => c.once('room:deleted', resolve)));
      changed(null);
      for (const deletion of deletions) expect(await deletion).toEqual({ roomId: 'ABCDEFGH' });
      expect(await instance.io.in('room:ABCDEFGH').fetchSockets()).toHaveLength(0);
      expect(stopped).toBe(true);
    } finally {
      clients.forEach(c => c.disconnect());
      await instance.close();
    }
  });

  it('join-room une el socket a la sala', async () => {
    const res = await client.timeout(2000).emitWithAck('join-room', '  ABCD234567 ');
    expect(res).toEqual({ ok: true, data: { roomId: 'ABCD234567', joined: true } });

    const [serverSocket] = await server.io.fetchSockets();
    expect(serverSocket.rooms.has('room:ABCD234567')).toBe(true);
  });

  it.each([[''], ['   '], [123], [null]])('join-room rechaza un roomId inválido (%j) con VALIDATION_ERROR', async (roomId) => {
    const res = await client.timeout(2000).emitWithAck('join-room', roomId);
    expect(res).toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'El identificador de sala es obligatorio.',
        fields: { roomId: 'Debe proporcionar un ID de sala válido.' },
      },
    });
  });
});
