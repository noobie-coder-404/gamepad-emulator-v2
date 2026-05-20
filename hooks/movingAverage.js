import { useSharedValue } from 'react-native-reanimated';

sexport function useMovingAverage(windowSize = 3) {
  const buffer = useSharedValue(new Array(windowSize).fill(0));
  const index = useSharedValue(0);
  const count = useSharedValue(0);

  function filter(raw) {
    'worklet';
    buffer.value[index.value] = raw;
    index.value = (index.value + 1) % windowSize;
    if (count.value < windowSize) count.value += 1;

    // exponential weights — older values matter less
    let sum = 0;
    let weightSum = 0;
    for (let i = 0; i < count.value; i++) {
      const age = (index.value - 1 - i + windowSize) % windowSize;
      const weight = Math.pow(2, -age); // 1, 0.5, 0.25, 0.125...
      sum += buffer.value[(index.value - 1 - i + windowSize) % windowSize] * weight;
      weightSum += weight;
    }
    return sum / weightSum;
  }

  return filter;
}

// export function useMovingAverage(windowSize = 3) {
//   const buffer = useSharedValue(new Array(windowSize).fill(0));
//   const index = useSharedValue(0);
//   const count = useSharedValue(0);

//   function filter(raw) {
//     'worklet';
//     buffer.value[index.value] = raw;
//     index.value = (index.value + 1) % windowSize;
//     if (count.value < windowSize) count.value += 1;

//     let sum = 0;
//     for (let i = 0; i < count.value; i++) {
//       sum += buffer.value[i];
//     }
//     return sum / count.value;
//   }

//   return filter;
// }
