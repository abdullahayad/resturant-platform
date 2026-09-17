import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

// useWindowDimensions() reports the full browser/device width, which is
// wrong for sizing a grid that sits inside a layout eating horizontal space
// it knows nothing about (the sidebar/nav rail, body padding) - on a wide
// screen that overestimates how many columns fit, pushing the last column
// past the actual visible edge. Measuring the grid's own rendered width via
// onLayout instead always reflects what's really available to it.
export function useMeasuredWidth() {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);
  return { width, onLayout };
}
