import { View } from 'react-native';
import { Star } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

interface StarRatingProps {
  value: number;
  size?: number;
}

export function StarRating({ value, size = 14 }: StarRatingProps) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={size} color={colors.primary} fill={i < Math.round(value) ? colors.primary : 'none'} />
      ))}
    </View>
  );
}
