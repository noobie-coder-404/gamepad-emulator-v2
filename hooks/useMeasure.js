import { useSharedValue, useAnimatedRef } from "react-native-reanimated";
import { runOnUI } from "react-native-worklets";
import { measureComponent } from "../helper-functions/measureComponent";

export const useMeasure = () => {
  const componentRef = useAnimatedRef();
  const measurements = useSharedValue({
    height: 0,
    width: 0,
    center: { x: 0, y: 0 },
    pageX: 0,
    pageY: 0,
  });

  const measureOnLayout = () => {
    //onLayout even object provied x,y,width,height but we don't want to use that because it doesn't  provide pageX and pageY
    runOnUI(measureComponent)(componentRef, measurements);
  };

  return { componentRef, measurements, measureOnLayout };
};

// todo : done - this has been implemented inside isInside
// there is a better way to measure componenets
// 1. Give each button an Animated Ref
// const buttonRef = useAnimatedRef();

// // 2. Your animation stays "Pure" (Transforms only - very fast)
// const animatedStyle = useAnimatedStyle(() => {
//   return {
//     transform: [
//       { translateX: withTiming(coords.x * 65) },
//       { translateY: withTiming(coords.y * 65) }
//     ],
//     // No more height/width hacks!
//   };
// });

// // 3. Measure whenever you actually NEED the data
// const getPosition = () => {
//   'worklet';
//   const measurements = measure(buttonRef);
//   // measurements.pageX and measurements.pageY are now frame-perfect
// };

//the solution this app uses as of now uses onLayout to trigger measurement, but since it executes on the JS thread instead of UI thread, its slow
