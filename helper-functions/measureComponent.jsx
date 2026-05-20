import {
  measure,
  useAnimatedRef,
  useSharedValue,
} from "react-native-reanimated";
import { runOnUI } from "react-native-worklets";
import { runOnJS } from "react-native-worklets";

// RETURNS COMPONENT'S HEIGHT, WIDTH AND COORDINATES OF THE CENTER (IN PAGEX AND PAGEY)

//gives final value after all styles are calculated hence the
// values are representative of actual appearnce of the element
//gives center based on absolute coordinates

//runONUI because UI thread is faster so run this on ui
export function measureComponent(componentRef, measurementsSharedValues) {
  "worklet";

  const measured = measure(componentRef);
  if (measured === null) {
    return;
  }

  const { pageX, pageY, width, height } = measured;

  console.log("measuring");

  measurementsSharedValues.value = {
    center: {
      x: pageX + width / 2,
      y: pageY + height / 2,
    },
    height: height,
    width: width,
    pageX: pageX,
    pageY: pageY,
  };

  //   measurementsSharedValues.value = {
  //     center: {
  //       x: Math.round(pageX + width / 2),
  //       y: Math.round(pageY + height / 2),
  //     },
  //     height: Math.round(height),
  //     width: Math.round(width),
  //     pageX: Math.round(pageX),
  //     pageY: Math.round(pageY),
  //   };
}

// //example usage

// const componentNameRef = useAnimatedRef();
// const measuredComponentName = useSharedValue({
//   height: 0,
//   width: 0,
//   center: 0,
// });

// const measureOnLayout = (event) => {
//   //onLayout even object provied x,y,width,height but we don't want to use that because it doesn't  provide pageX and pageY
//   runOnUI(measureComponent)(joystickRef, joystickMeasurements);
// };

// <Joystick
//   onLayout={(event) => {
//     //onLayout even object provied x,y,width,height but we don't want to use that because it doesn't  provide pageX and pageY
//     runOnUI(measureComponent)(joystickRef, joystickMeasurements);
//   }}
// />;
