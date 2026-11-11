import { ExtendedError, Socket } from 'socket.io';
import { TokenVerifier } from '../services/token.verifier';
import { AppError, ErrorPayload, UnauthenticatedError } from '../types/errors.types';

/** Error de handshake: el cliente lo recibe en `connect_error` con `err.message` y `err.data`. */
export type HandshakeError = ExtendedError & { data: ErrorPayload };

function toHandshakeError(error: AppError): HandshakeError {
  const err = new Error(error.message) as HandshakeError;
  err.data = { code: error.code, message: error.message, fields: error.fields ?? null };
  return err;
}

/** Lee el token de `auth.token` (recomendado) o, como alternativa, de `Authorization: Bearer`. */
export function extractToken(socket: Socket): string | null {
  const fromAuth = (socket.handshake.auth as { token?: unknown } | undefined)?.token;
  if (typeof fromAuth === 'string' && fromAuth.trim()) return fromAuth.trim();

  const header = socket.handshake.headers.authorization;
  if (typeof header === 'string') {
    const [scheme, token] = header.trim().split(/\s+/);
    if (scheme?.toLowerCase() === 'bearer' && token) return token;
  }
  return null;
}

/**
 * Middleware de Socket.IO (io.use): exige un ID token de Firebase válido en el handshake
 * (TS-02). Si es válido deja el usuario en socket.data.user; si no, rechaza la conexión
 * con { code: 'UNAUTHENTICATED' | 'SERVICE_UNAVAILABLE', message, fields } (TS-05).
 */
export function createSocketAuthMiddleware(verifier: TokenVerifier) {
  return async (socket: Socket, next: (err?: ExtendedError) => void): Promise<void> => {
    const token = extractToken(socket);
    if (!token) {
      return next(
        toHandshakeError(
          new UnauthenticatedError('Debes iniciar sesión para conectarte a la sala.')
        )
      );
    }

    try {
      socket.data.user = await verifier.verifyIdToken(token);
      next();
    } catch (error) {
      const appError =
        error instanceof AppError ? error : new UnauthenticatedError('Tu sesión no es válida. Inicia sesión de nuevo.');
      console.warn(`[Socket.IO] Handshake rechazado (${appError.code}) desde ${socket.handshake.address}`);
      next(toHandshakeError(appError));
    }
  };
}
