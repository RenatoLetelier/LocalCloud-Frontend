export const runtime = 'edge';

import Link from 'next/link';
import { Clapperboard, Images } from 'lucide-react';

const projects = [
  {
    href: '/photos',
    label: 'Photos',
    description: 'Browse and manage your personal photo library',
    icon: Images,
    color: 'from-violet-600 to-indigo-600',
  },
  {
    href: '/movies',
    label: 'Movies',
    description: 'Stream your shared movie library',
    icon: Clapperboard,
    color: 'from-rose-600 to-orange-600',
  },
] as const;

export default function ProjectSelectorPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">
        Welcome to LocalCloud
      </h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-12 text-center">
        Choose a section to get started
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        {projects.map(({ href, label, description, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="
              group relative flex flex-col gap-4 p-8 rounded-2xl
              bg-white dark:bg-gray-900
              border border-gray-200 dark:border-gray-800
              shadow-sm hover:shadow-lg dark:hover:shadow-gray-900/50
              transition-all duration-200
              hover:-translate-y-0.5
            "
          >
            <div className={`inline-flex w-14 h-14 rounded-xl bg-gradient-to-br ${color} items-center justify-center`}>
              <Icon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                {label}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                {description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
