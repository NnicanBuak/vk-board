import { API_BASE_URL, getToken } from './client';

const normalizedBase = API_BASE_URL.endsWith('/')
  ? API_BASE_URL.slice(0, -1)
  : API_BASE_URL;
const UPLOAD_ENDPOINT = `${normalizedBase}/upload`;

export interface UploadResponse {
  url: string;
}

export async function uploadImage(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append('file', file);

  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(UPLOAD_ENDPOINT, { method: 'POST', body: form, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      (body as { error?: string }).error ?? `HTTP ${res.status}`;
    throw new Error(message);
  }

  return res.json() as Promise<UploadResponse>;
}
