// ─── Upload limits ──────────────────────────────────────────────────────────
export const MAX_PHOTO_SIZE = 50 * 1024 * 1024;        // 50 MB
export const MAX_VIDEO_SIZE = 500 * 1024 * 1024;       // 500 MB
export const MAX_MOVIE_SIZE = 8 * 1024 * 1024 * 1024;  // 8 GB
export const UPLOAD_CONCURRENCY = 3;
export const CHUNK_SIZE = 4 * 1024 * 1024;              // 4 MB per chunk (safe under Vercel's 4.5 MB serverless limit)
export const CHUNK_CONCURRENCY = 1;                      // sequential to avoid rate limiting
export const CHUNK_INTER_DELAY = 300;                    // ms pause between chunks to throttle requests
export const CHUNK_RETRY_ATTEMPTS = 4;                   // retries on 429 / network error
export const CHUNK_RETRY_BASE_DELAY = 5000;              // 5s → 10s → 20s → 40s (exponential backoff)
export const JOB_POLL_INTERVAL = 2000;                   // 2 seconds (backend recommendation)

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic',
  'image/heif', 'image/gif', 'image/avif',
];

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo',
];

export const ALLOWED_MOVIE_TYPES = [
  'video/mp4', 'video/x-matroska', 'video/quicktime',
  'video/x-msvideo', 'video/webm',
];

// label = shown in UI, value = sent to backend (lowercase, no accents)
export const MOVIE_CATEGORIES: { label: string; value: string }[] = [
  { label: 'Acción',         value: 'accion' },
  { label: 'Aventura',       value: 'aventura' },
  { label: 'Animación',      value: 'animacion' },
  { label: 'Ciencia Ficción',value: 'ciencia ficcion' },
  { label: 'Comedia',        value: 'comedia' },
  { label: 'Crimen',         value: 'crimen' },
  { label: 'Documental',     value: 'documental' },
  { label: 'Drama',          value: 'drama' },
  { label: 'Fantasía',       value: 'fantasia' },
  { label: 'Guerra',         value: 'guerra' },
  { label: 'Historia',       value: 'historia' },
  { label: 'Misterio',       value: 'misterio' },
  { label: 'Musical',        value: 'musical' },
  { label: 'Romance',        value: 'romance' },
  { label: 'Suspenso',       value: 'suspenso' },
  { label: 'Terror',         value: 'terror' },
  { label: 'Western',        value: 'western' },
  { label: 'Sin categoría',  value: 'uncategorized' },
];

// ─── Trash ──────────────────────────────────────────────────────────────────
export const TRASH_EXPIRY_DAYS = 30;

// ─── Playback ───────────────────────────────────────────────────────────────
export const PLAYBACK_SAVE_INTERVAL = 10_000;  // ms
export const PLAYBACK_MIN_PROGRESS = 5;        // seconds
export const PLAYBACK_COMPLETION_THRESHOLD = 0.95;

// ─── React Query defaults ───────────────────────────────────────────────────
export const QUERY_STALE_TIME = 5 * 60 * 1000;    // 5 minutes
export const QUERY_GC_TIME = 10 * 60 * 1000;      // 10 minutes

// ─── Grid columns (Tailwind class maps) ─────────────────────────────────────
export const PHOTO_GRID_COLS = 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 2xl:grid-cols-11';
export const MOVIE_GRID_COLS = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';

// ─── Map defaults ───────────────────────────────────────────────────────────
export const MAP_DEFAULT_CENTER: [number, number] = [-33.4489, -70.6693]; // Santiago, Chile
export const MAP_DEFAULT_ZOOM = 5;
