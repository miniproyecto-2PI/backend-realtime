import { AddressInfo } from 'net';
import { io as ioClient, Socket as ClientSocket, ManagerOptions, SocketOptions } from 'socket.io-client';
import { createRealtimeServer, RealtimeServer } from '../src/realtime';
import { TokenVerifier } from '../src/services/token.verifier';
import { AuthUser } from '../src/types/auth.types';
import { UnauthenticatedError } from '../src/types/errors.types';

export const VALID_TOKEN = 'token-valido';
export const EXPIRED_TOKEN = 'token-vencido';

export const TEST_USER: AuthUser = {
  uid: 'uid-ana',
  email: 'ana.perez@correounivalle.edu.co',
  name: 'Ana Pérez',
  picture: null,
  signInProvider: 'password',
};

/** Verificador de tokens en memoria (sin Firebase). */
export class FakeTokenVerifier implements TokenVerifier {
  async verifyIdToken(idToken: string): Promise<AuthUser> {
    if (idToken === VALID_TOKEN) return TEST_USER;
    if (idToken === EXPIRED_TOKEN) throw new UnauthenticatedError('Tu sesión expiró. Inicia sesión de nuevo.');
    throw new UnauthenticatedError('Tu sesión no es válida. Inicia sesión de nuevo.');
  }
}

export interface TestServer extends RealtimeServer {
  url: string;
  close: () => Promise<void>;
}

/** Levanta el servidor real (Express + Socket.IO) en un puerto libre. */
export async function startTestServer(verifier: TokenVerifier = new FakeTokenVerifier()): Promise<TestServer> {
  const server = createRealtimeServer({ tokenVerifier: verifier });
  await new Promise<void>((resolve) => server.httpServer.listen(0, '127.0.0.1', resolve));
  const { port } = server.httpServer.address() as AddressInfo;

  return {
    ...server,
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.io.close(() => resolve())),
  };
}

type ClientOptions = Partial<ManagerOptions & SocketOptions>;

/** Crea un cliente Socket.IO sin reconexión automática (pruebas deterministas). */
export function connectClient(url: string, options: ClientOptions = {}): ClientSocket {
  return ioClient(url, { transports: ['websocket'], reconnection: false, forceNew: true, ...options });
}

/** Resuelve con 'connect' o con el error de connect_error, lo que ocurra primero. */
export function waitForConnection(
  socket: ClientSocket
): Promise<{ connected: true } | { connected: false; error: Error & { data?: unknown } }> {
  return new Promise((resolve) => {
    socket.once('connect', () => resolve({ connected: true }));
    socket.once('connect_error', (error) => resolve({ connected: false, error }));
  });
}
