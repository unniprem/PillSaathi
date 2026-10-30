import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/**
 * How tall the keyboard is while it is open, else 0. The app draws edge to edge, so the keyboard
 * covers the page instead of shrinking it: a page or sheet with a field makes this much room at
 * its foot, so the field and its button stay above the keyboard.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', e =>
      setHeight(e.endCoordinates.height),
    );
    const hidden = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  return height;
}
