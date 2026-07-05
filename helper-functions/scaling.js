import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (design reference: Motorola Edge 60 Fusion in Landscape)
const BASE_WIDTH = 904;
const BASE_HEIGHT = 406;

// 1. Change this to shrink the ENTIRE app (e.g., 0.85 for 85% size)
const GLOBAL_MULTIPLIER = 0.8;

// 2. Change this to shrink ONLY the icons (e.g., 0.80 for 80% size)
const ICON_MULTIPLIER = 0.8;

// Limit how much the UI can scale up on large tablets (e.g., max 25% larger than baseline)
const MAX_SCALE_RATIO = 1.25;

// Scale based on the shorter edge (height in landscape) to maintain
// circular button proportions regardless of the phone's aspect ratio.
export const scale = (size) => {
  const shortEdge = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT);
  const baseShortEdge = Math.min(BASE_WIDTH, BASE_HEIGHT);
  const rawRatio = shortEdge / baseShortEdge;
  const clampedRatio = Math.min(rawRatio, MAX_SCALE_RATIO);
  return clampedRatio * size * GLOBAL_MULTIPLIER;
};

// Use this specifically for vector icons across your app!
export const iconScale = (size) => {
  return scale(size) * ICON_MULTIPLIER;
};

// For fonts — uses PixelRatio for sharper text
export const fontScale = (size) => {
  const shortEdge = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT);
  const baseShortEdge = Math.min(BASE_WIDTH, BASE_HEIGHT);
  const rawRatio = shortEdge / baseShortEdge;
  const clampedRatio = Math.min(rawRatio, MAX_SCALE_RATIO);
  const newSize = clampedRatio * size * GLOBAL_MULTIPLIER;
  return PixelRatio.roundToNearestPixel(newSize);
};
