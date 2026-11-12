/** Usuario autenticado del socket, extraído del ID token de Firebase. */
export interface AuthUser {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  /** firebase.sign_in_provider del token: 'password', 'google.com', ... */
  signInProvider: string | null;
}

/** Datos propios de cada socket (socket.data). */
export interface SocketData {
  user: AuthUser;
}
