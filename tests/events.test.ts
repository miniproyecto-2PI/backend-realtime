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

  it('join-room une el socket a la sala', async () => {
    const res = await client.timeout(2000).emitWithAck('join-room', '  ABCD234567 ');
    expect(res).toEqual({ ok: true, data: { roomId: 'ABCD234567', joined: true } });

    const [serverSocket] = await server.io.fetchSockets();
    expect(serverSocket.rooms.has('ABCD234567')).toBe(true);
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
