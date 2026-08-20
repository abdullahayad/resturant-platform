import { useWindowDimensions } from 'react-native';

export type NavTier = 'phone' | 'rail' | 'sidebar';

export function useBreakpoint(): NavTier {
  const { width } = useWindowDimensions();
  if (width < 640) return 'phone';
  if (width < 1024) return 'rail';
  return 'sidebar';
}
