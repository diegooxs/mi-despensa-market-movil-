import type { AuthResponse } from './types';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://mi-despensa-backend.onrender.com/api';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
    });
  } catch {
    throw new Error('No pudimos conectar con la tienda. Revisa tu internet o que el servidor esté encendido.');
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const detail = payload?.detail || payload?.error || payload?.mensaje;
    if (detail && typeof detail === 'object') {
      const firstError = Object.values(detail).flat()[0];
      throw new Error(String(firstError || `Error ${response.status}`));
    }
    if (typeof detail === 'string' && detail.trim()) {
      throw new Error(detail);
    }
    if (response.status === 401) {
      throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
    }
    if (response.status === 403) {
      throw new Error(String(detail || 'No tienes permiso para realizar esta acción.'));
    }
    if (response.status >= 500) {
      throw new Error('El servidor tuvo un problema. Intenta otra vez en unos segundos.');
    }
    throw new Error(String(detail || `No se pudo completar la solicitud (${response.status}).`));
  }

  return payload as T;
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body as BodyInit }),
  patch: <T,>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body as BodyInit }),
  delete: <T,>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export function isBuyer(data: AuthResponse) {
  return data.usuario.rol === 'usuario';
}
