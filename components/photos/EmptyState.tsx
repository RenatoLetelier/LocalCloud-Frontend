'use client';

import { Calendar, Film, Heart, Images, Library } from 'lucide-react';
import type { PhotoView } from './PhotoGrid';

const EMPTY_STATES: Record<PhotoView, { icon: React.ElementType; label: string }> = {
  library:   { icon: Library,  label: 'Tu biblioteca está vacía.'                                                 },
  favorites: { icon: Heart,    label: 'Aún no tienes favoritos. Dale corazón a una foto para guardarla aquí.'     },
  photos:    { icon: Images,   label: 'Aún no hay fotos.'                                                         },
  videos:    { icon: Film,     label: 'Aún no hay videos.'                                                        },
  timeline:  { icon: Calendar, label: 'No hay archivos para mostrar en la línea de tiempo.'                       },
};

interface Props {
  view: PhotoView;
}

export function EmptyState({ view }: Props) {
  const { icon: Icon, label } = EMPTY_STATES[view];
  return (
    <div className="flex flex-col items-center gap-3 py-32 text-gray-400 dark:text-gray-600">
      <Icon className="w-14 h-14" />
      <p className="text-sm text-center max-w-xs">{label}</p>
    </div>
  );
}
