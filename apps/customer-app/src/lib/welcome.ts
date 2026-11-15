import * as SecureStore from 'expo-secure-store';

// The welcome sign-in screen shows once, on the first open. After that the
// app opens straight onto Home and sign-in appears only when needed.
const KEY = 'ligeta.welcomeSeen';

export async function welcomeSeen(): Promise<boolean> {
  return (await SecureStore.getItemAsync(KEY).catch(() => null)) === '1';
}

export function markWelcomeSeen() {
  SecureStore.setItemAsync(KEY, '1').catch(() => {});
}
