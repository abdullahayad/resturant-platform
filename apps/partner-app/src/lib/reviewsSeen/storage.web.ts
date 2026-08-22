const STORAGE_KEY = 'partner-app-reviews-last-seen';

export async function getReviewsLastSeen(): Promise<string | null> {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function setReviewsLastSeen(isoDate: string): Promise<void> {
  try {
    window.localStorage.setItem(STORAGE_KEY, isoDate);
  } catch {
    // storage unavailable — badge just won't clear across restarts this session
  }
}
