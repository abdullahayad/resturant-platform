import { Text, type TextProps } from 'react-native';
import { colors, fonts } from '../theme';

type Weight = 'regular' | 'medium' | 'semibold' | 'bold';

// Every piece of text goes through here so the brand font is never
// forgotten. Custom fonts ignore fontWeight on Android, so weight picks
// the font file instead.
export function AppText({ weight = 'regular', style, ...props }: TextProps & { weight?: Weight }) {
  return <Text {...props} style={[{ fontFamily: fonts[weight], color: colors.text, textAlign: 'auto' }, style]} />;
}
