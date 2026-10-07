import { useWindowDimensions } from 'react-native';

export function getCardLayout(layout, width, fontScale) {
  const available = Math.max(0, width - 40);
  // Large text and narrow screens get more room instead of clipped content.
  const columns = layout === 'grid' && available >= 332 * Math.max(1, fontScale) ? 2 : 1;
  return { columns, cardWidth: Math.max(0, (available - (columns - 1) * 12) / columns) };
}

export function useCardLayout(layout) {
  const { width, fontScale } = useWindowDimensions();
  return getCardLayout(layout, width, fontScale);
}
