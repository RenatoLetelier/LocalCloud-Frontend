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
