import { clearAuth, getToken } from './auth';
import type { Album, AuthResponse, BrowseResponse, ChunkedUploadInit, FileRecord, LibraryMovie, PlaybackEntry, Subtitle, UploadJob, UserPublic } from './types';

// ─── Generic fetcher ─────────────────────────────────────────────────────────
// BASE is the backend origin (e.g. https://your-project.vercel.app).
// All API calls become absolute → works in both dev and Cloudflare Pages prod.
// CORS must be configured on the backend to allow the frontend origin.
const BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection.');
  }

  if (res.status === 401) {
    clearAuth();
    window.location.href = '/login';
    throw new ApiError(401, 'Unauthorized');
  }

  if (!res.ok) {
    const isJson = res.headers.get('content-type')?.includes('application/json');
    const body = isJson
      ? await res.json().catch(() => ({ error: 'Request failed' }))
      : { error: `Server error (${res.status})` };
    throw new ApiError(res.status, (body as { error?: string }).error ?? 'Request failed');
  }

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get('content-type')?.includes('application/json');
  if (!isJson) throw new ApiError(0, 'Unexpected response from server (not JSON)');

  return res.json() as Promise<T>;
}

// ─── API methods ─────────────────────────────────────────────────────────────

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () => request<UserPublic>('/api/auth/me'),
  },

  files: {
    list: (userId?: string) =>
      request<FileRecord[]>(`/api/files${userId ? `?userId=${userId}` : ''}`),
    get: (id: string) => request<FileRecord>(`/api/files/${id}`),
    upload: (userId: string, formData: FormData) =>
      request<FileRecord>(`/api/files/upload/${userId}`, { method: 'POST', body: formData }),
    /** @deprecated Use upload() instead */
    uploadPhoto: (userId: string, formData: FormData) =>
      request<FileRecord>(`/api/files/upload/${userId}`, { method: 'POST', body: formData }),
    delete: (id: string) =>
      request<{ deleted: string }>(`/api/files/${id}`, { method: 'DELETE' }),
    updateLocation: (id: string, latitude: number, longitude: number) =>
      request<FileRecord>(`/api/files/${id}/location`, {
        method: 'PATCH',
        body: JSON.stringify({ latitude, longitude }),
      }),
    removeLocation: (id: string) =>
      request<FileRecord>(`/api/files/${id}/location`, { method: 'DELETE' }),
    favorite: (id: string) =>
      request<{ fileId: string }>(`/api/favorites/${id}`, { method: 'POST' }),
    unfavorite: (id: string) =>
      request<void>(`/api/favorites/${id}`, { method: 'DELETE' }),
    trash: (id: string) =>
      request<FileRecord>(`/api/files/${id}/trash`, { method: 'POST' }),
    restore: (id: string) =>
      request<FileRecord>(`/api/files/${id}/trash`, { method: 'DELETE' }),
    emptyTrash: () =>
      request<{ deleted: number }>('/api/files/trash', { method: 'DELETE' }),
  },

  favorites: {
    list: () => request<FileRecord[]>('/api/favorites'),
  },

  trash: {
    list: () => request<FileRecord[]>('/api/files/trash'),
  },

  albums: {
    list: () => request<Album[]>('/api/albums'),
    get: (id: string) => request<Album>(`/api/albums/${id}`),
    create: (data: { name: string; description?: string }) =>
      request<Album>('/api/albums', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; description?: string; coverFileId?: string }) =>
      request<Album>(`/api/albums/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ deleted: string }>(`/api/albums/${id}`, { method: 'DELETE' }),
    addFile: (albumId: string, fileId: string) =>
      request<FileRecord>(`/api/albums/${albumId}/files/${fileId}`, { method: 'POST' }),
    removeFile: (albumId: string, fileId: string) =>
      request<FileRecord>(`/api/albums/${albumId}/files/${fileId}`, { method: 'DELETE' }),
  },

  library: {
    listMovies: () => request<LibraryMovie[]>('/api/library/movies'),
    getMovie: (id: string) => request<LibraryMovie>(`/api/library/movies/${id}`),
    deleteMovie: (id: string) =>
      request<{ deleted: string }>(`/api/library/movies/${id}`, { method: 'DELETE' }),
    browse: (path?: string) =>
      request<BrowseResponse>(`/api/library/browse${path ? `?path=${encodeURIComponent(path)}` : ''}`),
    // Chunked movie upload
    initUpload: (data: { filename: string; title: string; category: string; totalChunks: number; totalSize: number }) =>
      request<ChunkedUploadInit>('/api/library/upload/init', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    uploadChunk: (uploadId: string, index: number, chunk: Blob) => {
      const fd = new FormData();
      fd.append('chunk', chunk);
      return request<{ received: number }>(`/api/library/upload/${uploadId}/chunk/${index}`, {
        method: 'POST',
        body: fd,
      });
    },
    completeUpload: (uploadId: string) =>
      request<{ jobId: string; movieId?: string | null }>(`/api/library/upload/${uploadId}/complete`, { method: 'POST' }),
  },

  jobs: {
    getStatus: (jobId: string) => request<UploadJob>(`/api/jobs/${jobId}`),
  },

  subtitles: {
    list: (movieId: string) =>
      request<Subtitle[]>(`/api/library/movies/${movieId}/subtitles`),
    upload: (movieId: string, formData: FormData) =>
      request<Subtitle>(`/api/library/movies/${movieId}/subtitles`, { method: 'POST', body: formData }),
    delete: (subId: string) =>
      request<void>(`/api/library/subtitles/${subId}`, { method: 'DELETE' }),
  },

  playback: {
    list: () => request<PlaybackEntry[]>('/api/playback'),
    get: (movieId: string) => request<PlaybackEntry>(`/api/playback/${movieId}`),
    save: (movieId: string, currentTime: number, duration: number) =>
      request<PlaybackEntry>(`/api/playback/${movieId}`, {
        method: 'PUT',
        body: JSON.stringify({ currentTime, duration }),
      }),
    delete: (movieId: string) =>
      request<void>(`/api/playback/${movieId}`, { method: 'DELETE' }),
  },

  users: {
    list: () => request<UserPublic[]>('/api/users'),
    get: (id: string) => request<UserPublic>(`/api/users/${id}`),
    update: (id: string, data: { name?: string; email?: string; password?: string; role?: string }) =>
      request<UserPublic>(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ deleted: string }>(`/api/users/${id}`, { method: 'DELETE' }),
  },

  // ─── URL builders for binary resources (images / video streams) ──────────────
  // Relative URLs → go through the Next.js proxy → no CORS.
  // useAuthImage / useAuthVideo fetch these with the Authorization header.

  pi: {
    thumbUrl: (userId: string, piPath: string) =>
      `${BASE}/api/pi/${userId}/thumb?path=${encodeURIComponent(piPath)}`,
    streamUrl: (userId: string, piPath: string) =>
      `${BASE}/api/pi/${userId}/stream?path=${encodeURIComponent(piPath)}`,
  },

  libraryMedia: {
    thumbUrl: (piPath: string) =>
      `${BASE}/api/library/thumb?path=${encodeURIComponent(piPath)}`,
    streamUrl: (piPath: string) =>
      `${BASE}/api/library/stream?path=${encodeURIComponent(piPath)}`,
  },
};
