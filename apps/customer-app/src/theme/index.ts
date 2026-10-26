// LiGETA brand tokens - same palette as the customer-app design canvas.
export const colors = {
  orange: '#C2540A',
  orangeDark: '#A8470A',
  blue: '#1D4ED8',
  navy: '#1F1640',
  peach: '#FDF0E6',
  blueTint: '#E6EDFC',
  green: '#2F7D45',
  greenTint: '#E3F1E6',
  red: '#B42318',
  background: '#FFFFFF',
  surface: '#F5F2EC',
  border: '#ECE6DC',
  text: '#1F1640',
  muted: '#5F5A6E',
  mutedIcon: '#6B6578',
  white: '#FFFFFF',
};

// IBM Plex Sans Arabic covers both Arabic and Latin, so one family serves
// both languages. Names match the keys loaded in app/_layout.tsx.
export const fonts = {
  regular: 'IBMPlexSansArabic_400Regular',
  medium: 'IBMPlexSansArabic_500Medium',
  semibold: 'IBMPlexSansArabic_600SemiBold',
  bold: 'IBMPlexSansArabic_700Bold',
};

// Space a scrolling screen leaves at the bottom (on top of the safe-area
// inset) so its last item isn't hidden behind the floating tab bar:
// bar height + its gap above the system bar + breathing room.
export const TAB_BAR_SPACE = 66 + 12 + 20;
