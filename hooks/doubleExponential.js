import { useSharedValue } from 'react-native-reanimated';

export function useDoubleExponentialFilter(alpha = 0.3) {
  const s = useSharedValue(null); // smoothed value
  const b = useSharedValue(null); // smoothed trend

  function filter(raw) {
    'worklet';
    if (s.value === null) {
      s.value = raw;
      b.value = 0;
      return raw;
    }

    const prevS = s.value;
    s.value = alpha * raw + (1 - alpha) * (s.value + b.value);
    b.value = alpha * (s.value - prevS) + (1 - alpha) * b.value;

    return s.value;
  }

  return filter;
}
