export interface ErrorPayload {
  code: string;
  message: string;
  fields?: Record<string, string> | null;
}

export interface StandardErrorResponse {
  error: ErrorPayload;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly fields?: Record<string, string> | null;

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL',
    fields?: Record<string, string> | null
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields || null;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(
    message = 'Los datos enviados son inválidos.',
    fields?: Record<string, string>
  ) {
    super(message, 400, 'VALIDATION_ERROR', fields);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'Debe autenticarse para conectarse al servidor de tiempo real.') {
    super(message, 401, 'UNAUTHENTICATED');
  }
}

export class RoomNotFoundError extends AppError {
  constructor(message = 'La sala de estudio especificada no existe.') {
    super(message, 404, 'ROOM_NOT_FOUND');
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(
    message = 'El servicio de autenticación no está disponible temporalmente. Intenta de nuevo en unos minutos.'
  ) {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

export class InternalError extends AppError {
  constructor(message = 'Ha ocurrido un error inesperado en el servidor de tiempo real.') {
    super(message, 500, 'INTERNAL');
  }
}
