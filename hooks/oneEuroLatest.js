import { useSharedValue } from 'react-native-reanimated';

export function useOneEuroFilter(minCutoff = 1.0, beta = 0.1) {
  const prevSmoothed = useSharedValue(null);
  const prevTime = useSharedValue(null);

  function filter(rawVelocity, timestamp) {
    'worklet';
    if (prevSmoothed.value === null) {
      prevSmoothed.value = rawVelocity;
      prevTime.value = timestamp;
      return rawVelocity;
    }

    const dt = timestamp - prevTime.value;
    prevTime.value = timestamp;

    const cutoff = minCutoff + beta * Math.abs(rawVelocity);
    const tau = 1 / (2 * Math.PI * cutoff);
    const a = 1 / (1 + tau / dt);
    prevSmoothed.value = a * rawVelocity + (1 - a) * prevSmoothed.value;

    return prevSmoothed.value;
  }

  return filter;
}
