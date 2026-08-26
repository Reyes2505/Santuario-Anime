'use client';

import { Anime } from '@/types/database';
import AnimeCard from './AnimeCard';

interface AnimeGridProps {
  animes: Anime[];
}

export default function AnimeGrid({ animes }: AnimeGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
      {animes.map((anime) => (
        <AnimeCard key={anime.id} anime={anime} />
      ))}
    </div>
  );
}
