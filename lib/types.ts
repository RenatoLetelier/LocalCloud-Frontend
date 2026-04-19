// ─── Types derived from LocalCloud-Backend swagger.yaml ──────────────────────

export type UserRole = 'admin' | 'user' | 'guest';

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthResponse {
  token: string;
  user: UserPublic;
}

export interface FileRecord {
  id: string;
  userId: string;
  albumId?: string | null;
  name: string;
  type: 'photo' | 'video';
  mimeType?: string;
  sizeBytes?: number;
  piPath: string;
  thumbPath?: string | null;
  isHls: boolean;
  hlsManifestPath?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isFavorite?: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Album {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  coverFileId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface LibraryMovie {
  id: string;
  title: string;
  category: string;
  filename: string;
  piPath: string;
  thumbPath?: string | null;
  sizeBytes?: number | null;
  uploadedBy?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface PlaybackEntry {
  id: string;
  movieId: string;
  userId: string;
  currentTime: number;
  duration: number;
  updatedAt: string;
}

// ─── Upload types ───────────────────────────────────────────────────────────

export type UploadJobStatus = 'queued' | 'uploading' | 'processing' | 'transcoding' | 'done' | 'error';

export interface UploadJob {
  id: string;
  status: UploadJobStatus;
  progress: number;       // 0-100
  movieId?: string | null; // available when status === 'done'
  error?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface ChunkedUploadInit {
  uploadId: string;
  chunkSize: number;
  jobId?: string; // backend may return a jobId early at init time
}

export interface DirectoryEntry {
  name: string;
  path: string;
  size: number;
  mtime: string;
  isDirectory: boolean;
  hasThumb: boolean;
}

export interface BrowseResponse {
  path: string;
  entries: DirectoryEntry[];
}

export interface Subtitle {
  id: string;
  movieId: string;
  lang: string;   // 'es', 'en', 'pt-br'
  label: string;  // 'Español', 'English'
  piPath: string;
  createdAt: string;
}
