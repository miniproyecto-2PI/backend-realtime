import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Socket as ClientSocket } from 'socket.io-client';
import {
  connectClient,
  EXPIRED_TOKEN,
  startTestServer,
  TestServer,
  TEST_USER,
  VALID_TOKEN,
  waitForConnection,
} from './helpers';
import { ServiceUnavailableError } from '../src/types/errors.types';

/** TS-02: el servidor de tiempo real exige el ID token de Firebase en el handshake. */
describe('Handshake autenticado de Socket.IO', () => {
  let server: TestServer;
  let client: ClientSocket | undefined;

  beforeAll(async () => {
    server = await startTestServer();
  });
  afterEach(() => {
    client?.disconnect();
    client = undefined;
  });
  afterAll(async () => {
    await server.close();
  });

  it('rechaza la conexión sin token con UNAUTHENTICATED (formato TS-05)', async () => {
    client = connectClient(server.url);
    const result = await waitForConnection(client);

    expect(result.connected).toBe(false);
    if (result.connected) return;
    expect(result.error.message).toBe('Debes iniciar sesión para conectarte a la sala.');
    expect(result.error.data).toEqual({
      code: 'UNAUTHENTICATED',
      message: 'Debes iniciar sesión para conectarte a la sala.',
      fields: null,
    });
  });

  it('rechaza un token inválido o alterado', async () => {
    client = connectClient(server.url, { auth: { token: 'token-alterado' } });
    const result = await waitForConnection(client);

    expect(result.connected).toBe(false);
    if (result.connected) return;
    expect(result.error.data).toMatchObject({
      code: 'UNAUTHENTICATED',
      message: 'Tu sesión no es válida. Inicia sesión de nuevo.',
    });
  });

  it('rechaza un token vencido con un mensaje claro', async () => {
    client = connectClient(server.url, { auth: { token: EXPIRED_TOKEN } });
    const result = await waitForConnection(client);

    expect(result.connected).toBe(false);
    if (result.connected) return;
    expect(result.error.data).toMatchObject({
      code: 'UNAUTHENTICATED',
      message: 'Tu sesión expiró. Inicia sesión de nuevo.',
    });
  });

  it('acepta un token válido enviado en auth.token', async () => {
    client = connectClient(server.url, { auth: { token: VALID_TOKEN } });
    const result = await waitForConnection(client);
    expect(result.connected).toBe(true);
  });

  it('acepta auth como función (el token se renueva en cada reconexión)', async () => {
    client = connectClient(server.url, { auth: (cb) => cb({ token: VALID_TOKEN }) });
    expect((await waitForConnection(client)).connected).toBe(true);
  });

  it('acepta el token en el encabezado Authorization: Bearer (clientes no navegador)', async () => {
    client = connectClient(server.url, { extraHeaders: { Authorization: `Bearer ${VALID_TOKEN}` } });
    expect((await waitForConnection(client)).connected).toBe(true);
  });

  it('asocia el usuario del token al socket (el uid sale del token)', async () => {
    client = connectClient(server.url, { auth: { token: VALID_TOKEN } });
    await waitForConnection(client);

    const [serverSocket] = await server.io.fetchSockets();
    expect(serverSocket.data.user).toEqual(TEST_USER);
  });
});

describe('Handshake con Firebase no disponible', () => {
  it('rechaza con SERVICE_UNAVAILABLE en lugar de un error genérico', async () => {
    const server = await startTestServer({
      verifyIdToken: async () => {
        throw new ServiceUnavailableError();
      },
    });
    const client = connectClient(server.url, { auth: { token: VALID_TOKEN } });
    const result = await waitForConnection(client);

    expect(result.connected).toBe(false);
    if (!result.connected) expect(result.error.data).toMatchObject({ code: 'SERVICE_UNAVAILABLE' });

    client.disconnect();
    await server.close();
  });
});
