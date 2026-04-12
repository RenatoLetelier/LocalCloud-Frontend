'use client';

import { useState } from 'react';
import { FolderPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import type { Album } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (album: Album) => void;
}

export function NewAlbumModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const album = await api.albums.create({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      onCreated(album);
      setName('');
      setDescription('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create album');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;
    setName('');
    setDescription('');
    setError(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="New Album">
      <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Summer 2025"
            maxLength={100}
            className="
              px-3 py-2 rounded-lg text-sm
              bg-gray-50 dark:bg-gray-800
              border border-gray-200 dark:border-gray-700
              text-gray-900 dark:text-gray-100 placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
              transition
            "
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Description <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short description…"
            maxLength={255}
            className="
              px-3 py-2 rounded-lg text-sm
              bg-gray-50 dark:bg-gray-800
              border border-gray-200 dark:border-gray-700
              text-gray-900 dark:text-gray-100 placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
              transition
            "
          />
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            {loading ? 'Creating…' : 'Create Album'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
