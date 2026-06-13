import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (design reference: Motorola Edge 60 Fusion in Landscape)
const BASE_WIDTH = 904;
const BASE_HEIGHT = 406;

// Scale based on the shorter edge (height in landscape) to maintain
// circular button proportions regardless of the phone's aspect ratio.
export const scale = (size) => {
  const shortEdge = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT);
  const baseShortEdge = Math.min(BASE_WIDTH, BASE_HEIGHT);
  return (shortEdge / baseShortEdge) * size;
};

// For fonts — uses PixelRatio for sharper text
export const fontScale = (size) => {
  const shortEdge = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT);
  const baseShortEdge = Math.min(BASE_WIDTH, BASE_HEIGHT);
  const ratio = size / baseShortEdge;
  const newSize = ratio * shortEdge;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};
