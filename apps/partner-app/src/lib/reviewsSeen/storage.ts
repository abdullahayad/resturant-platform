import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'partner-app-reviews-last-seen';

export async function getReviewsLastSeen(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function setReviewsLastSeen(isoDate: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, isoDate);
  } catch {
    // storage unavailable — badge just won't clear across restarts this session
  }
}
