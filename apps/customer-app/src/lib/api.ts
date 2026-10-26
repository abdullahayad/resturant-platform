export const API_BASE_URL = 'https://api.ligeta.app/v1';

const REQUEST_TIMEOUT_MS = 15000;

async function get<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(API_BASE_URL + path, { signal: controller.signal });
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export type MoodGroup = 'CLASSIC' | 'PEOPLE' | 'PLACE' | 'TIME' | 'FOOD' | 'SEASONAL';

// A "What's the mood today?" tile, managed from the admin portal's
// App > Customer Moods page. Only switched-on, in-season moods come back.
export interface Mood {
  id: string;
  nameEn: string;
  nameAr: string;
  emoji: string;
  group: MoodGroup;
  foodsEn: string | null;
  foodsAr: string | null;
}

export const api = {
  moods: () => get<Mood[]>('/moods'),
};
