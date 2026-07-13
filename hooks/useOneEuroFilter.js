// // this uses raw - previous filtered value

// import { useSharedValue } from 'react-native-reanimated';

// export const useOneEuroFilter = (
//   initialFreq = 60,
//   minCutoff = 1.0,
//   beta = 0.0,
//   dCutoff = 1.0
// ) => {
//   // REMOVED 'worklet' from here. This hook runs on the JS thread.

//   // Using individual shared values is much faster than object mutation in worklets
//   const freq = useSharedValue(initialFreq);
//   const lasttime = useSharedValue(null);

//   // LPF state for signal (x)
//   const xS = useSharedValue(0);
//   const xInitialized = useSharedValue(false);

//   // LPF state for derivative (dx)
//   const dxS = useSharedValue(0);
//   const dxInitialized = useSharedValue(false);

//   const filter = (value, timestamp = null) => {
//     'worklet'; // Keep this! The inner function IS a worklet.

//     // 1. Update frequency
//     if (lasttime.value !== null && timestamp !== null) {
//       const diffInSeconds = (timestamp - lasttime.value) / 1000.0;
//       if (diffInSeconds > 0) {
//         freq.value = 1.0 / diffInSeconds;
//       }
//     }
//     lasttime.value = timestamp;

//     // Helper: Alpha calculation
//     const getAlpha = (cutoff) => {
//       const te = 1.0 / freq.value;
//       const tau = 1.0 / (2 * Math.PI * cutoff);
//       return 1.0 / (1.0 + tau / te);
//     };

//     // 2. Calculate Derivative (Velocity)
//     // Canonical 1€ filter compares raw input to the *previous filtered* output.
//     // On frame 1 (xInitialized false), dvalue is 0 — this lets the derivative
//     // filter itself get initialized on frame 1 too, avoiding a jolt on frame 2.
//     const dvalue = xInitialized.value ? (value - xS.value) * freq.value : 0.0;

//     // 3. Filter Derivative
//     const dAlpha = getAlpha(dCutoff);
//     let edvalue;
//     if (dxInitialized.value) {
//       edvalue = dAlpha * dvalue + (1.0 - dAlpha) * dxS.value;
//     } else {
//       edvalue = dvalue;
//       dxInitialized.value = true;
//     }
//     dxS.value = edvalue;

//     // 4. Calculate Adaptive Cutoff
//     const cutoff = minCutoff + beta * Math.abs(edvalue);

//     // 5. Filter Value
//     const alpha = getAlpha(cutoff);
//     let result;
//     if (xInitialized.value) {
//       result = alpha * value + (1.0 - alpha) * xS.value;
//     } else {
//       result = value;
//       xInitialized.value = true;
//     }
//     xS.value = result;

//     return result;
//   };

//   const reset = () => {
//     'worklet';
//     freq.value = initialFreq;
//     lasttime.value = null;
//     xS.value = 0;
//     xInitialized.value = false;
//     dxS.value = 0;
//     dxInitialized.value = false;
//   };

//   return { filter, reset };
// };

// this uses raw value - previous raw value

import { useSharedValue } from 'react-native-reanimated';

export const useOneEuroFilter = (
  initialFreq = 60,
  minCutoff = 1.0,
  beta = 0.0,
  dCutoff = 1.0
) => {
  // REMOVED 'worklet' from here. This hook runs on the JS thread.

  // Using individual shared values is much faster than object mutation in worklets
  const freq = useSharedValue(initialFreq);
  const lasttime = useSharedValue(null);

  // LPF state for signal (x)
  const xS = useSharedValue(0);
  const xInitialized = useSharedValue(false);
  const lastRaw = useSharedValue(0);
  const rawInitialized = useSharedValue(false);

  // LPF state for derivative (dx)
  const dxS = useSharedValue(0);
  const dxInitialized = useSharedValue(false);

  const filter = (value, timestamp = null) => {
    'worklet'; // Keep this! The inner function IS a worklet.

    // 1. Update frequency
    if (lasttime.value !== null && timestamp !== null) {
      const diffInSeconds = (timestamp - lasttime.value) / 1000.0;
      if (diffInSeconds > 0) {
        freq.value = 1.0 / diffInSeconds;
      }
    }
    lasttime.value = timestamp;

    // Helper: Alpha calculation
    const getAlpha = (cutoff) => {
      const te = 1.0 / freq.value;
      const tau = 1.0 / (2 * Math.PI * cutoff);
      return 1.0 / (1.0 + tau / te);
    };

    // 2. Calculate Derivative (Velocity)
    // Old version compared raw input to the previous filtered output:
    // const dvalue = xInitialized.value ? (value - xS.value) * freq.value : 0.0;
    // The canonical 1 Euro derivative uses the previous raw input instead.
    const dvalue = rawInitialized.value ? (value - lastRaw.value) * freq.value : 0.0;
    lastRaw.value = value;
    rawInitialized.value = true;

    // 3. Filter Derivative
    const dAlpha = getAlpha(dCutoff);
    let edvalue;
    if (dxInitialized.value) {
      edvalue = dAlpha * dvalue + (1.0 - dAlpha) * dxS.value;
    } else {
      edvalue = dvalue;
      dxInitialized.value = true;
    }
    dxS.value = edvalue;

    // 4. Calculate Adaptive Cutoff
    const cutoff = minCutoff + beta * Math.abs(edvalue);

    // 5. Filter Value
    const alpha = getAlpha(cutoff);
    let result;
    if (xInitialized.value) {
      result = alpha * value + (1.0 - alpha) * xS.value;
    } else {
      result = value;
      xInitialized.value = true;
    }
    xS.value = result;

    return result;
  };

  const reset = () => {
    'worklet';
    freq.value = initialFreq;
    lasttime.value = null;
    xS.value = 0;
    xInitialized.value = false;
    lastRaw.value = 0;
    rawInitialized.value = false;
    dxS.value = 0;
    dxInitialized.value = false;
  };

  return { filter, reset };
};

// /**
//  * Reanimated 1€ Filter Hook
//  * Optimized for [performance.now](http://performance.now)() (milliseconds)
//  */
// export const useOneEuroFilter = (
//   initialFreq = 60,
//   minCutoff = 1.0,
//   beta = 0.0,
//   dCutoff = 1.0
// ) => {
//   // Internal state stored in a Shared Value for UI thread persistence
//   const filterState = useSharedValue({
//     freq: initialFreq,
//     lasttime: null,
//     // x is the data filter, dx is the derivative (velocity) filter
//     x: { s: 0, initialized: false },
//     dx: { s: 0, initialized: false },
//   });
//   /**
//    * The Filter Worklet
//    * @param {number} value - The raw input value
//    * @param {number} timestamp - Current time in ms (e.g., [performance.now](http://performance.now)())
//    */
//   const filter = (value, timestamp = null) => {
//     'worklet';
//     const state = filterState.value;
//     // 1. Update frequency based on the time delta (ms to seconds)
//     if (state.lasttime !== null && timestamp !== null) {
//       const diffInSeconds = (timestamp - state.lasttime) / 1000.0;
//       if (diffInSeconds > 0) {
//         state.freq = 1.0 / diffInSeconds;
//       }
//     }
//     state.lasttime = timestamp;
//     // Helper: Calculate Alpha for a given cutoff
//     const getAlpha = (cutoff) => {
//       const te = 1.0 / state.freq;
//       const tau = 1.0 / (2 * Math.PI * cutoff);
//       return 1.0 / (1.0 + tau / te);
//     };
//     // Helper: Apply Low Pass Filter logic to a specific state object
//     const applyLPF = (lpfState, val, alpha) => {
//       let result;
//       if (lpfState.initialized) {
//         result = alpha * val + (1.0 - alpha) * lpfState.s;
//       } else {
//         result = val;
//         lpfState.initialized = true;
//       }
//       lpfState.s = result;
//       return result;
//     };
//     // 2. Calculate the derivative (velocity) of the signal
//     const dvalue = state.x.initialized ? (value - state.x.s) * state.freq : 0.0;
//     // 3. Filter the derivative
//     const edvalue = applyLPF(state.dx, dvalue, getAlpha(dCutoff));
//     // 4. Calculate adaptive cutoff based on velocity (beta)
//     const cutoff = minCutoff + beta * Math.abs(edvalue);
//     // 5. Filter the final value
//     const filteredValue = applyLPF(state.x, value, getAlpha(cutoff));
//     // Persist changes back to the shared value
//     filterState.value = state;
//     return filteredValue;
//   };
//   /**
//    * Resets the filter state (useful when a gesture ends or resets)
//    */
//   const reset = () => {
//     'worklet';
//     filterState.value = {
//       freq: initialFreq,
//       lasttime: null,
//       x: { s: 0, initialized: false },
//       dx: { s: 0, initialized: false },
//     };
//   };
//   return { filter, reset };
// };
