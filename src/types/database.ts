export type StreamType = 'local' | 'online';

export interface Temporada {
  id: string;
  nombre: string;
  descripcion?: string | null;
  created_at?: string | null;
}

export interface Anime {
  id: string;
  titulo: string;
  sinopsis: string;
  portada_url: string;
  banner_url?: string | null;
  trailer_url?: string | null;
  trailer_type?: StreamType;
  created_at?: string | null;
}

export interface Episodio {
  id: string;
  anime_id?: string | null;
  temporada_id?: string | null;
  numero: number;
  titulo: string;
  url_stream: string;
  tipo_stream?: StreamType;
  duracion?: string | number | null;
  thumbnail_url?: string | null;
  created_at?: string | null;
}

export interface WatchProgress {
  episodeId: string;
  episodeNumber: number;
  currentTime: number;
  duration: number;
  completed: boolean;
  lastWatchedAt: number;
}

export interface UserProfile {
  id: string;
  username: string;
  avatar_url: string;
  bio: string;
  favorite_genre: string;
  joined_date: string;
}

export interface CustomList {
  id: string;
  name: string;
  description: string;
  isSystem?: boolean; // ej: 'Favoritos', 'Por Ver'
  createdAt: number;
  episodeIds: string[];
  animeIds: string[];
}

export type FilterSeason = 'all' | string;
export type SortOrder = 'asc' | 'desc';
