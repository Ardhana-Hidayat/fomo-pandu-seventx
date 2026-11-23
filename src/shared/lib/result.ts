export type AppError = {
  code: string;
  message: string;
  cause?: unknown;
};

export type Result<T, E = AppError> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export function ok<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

export function err<E = AppError>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function makeAppError(
  code: string,
  message: string,
  cause?: unknown
): AppError {
  return { code, message, cause };
}
