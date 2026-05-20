import { StyleSheet, View } from 'react-native';

import { APP_MODES, useMode } from '@/context/ModeContext';
import Animated, {
  measure,
  runOnUI,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
export default function Joystick({
  joystick,
  floatingStickCenter,
  knobOffset,
  joystickMeasurements,
}) {
  //   const joystickCenter = useSharedValue({ x: 0, y: 0 });
  const { mode } = useMode();

  const getJoystickMeasurements = () => {
    runOnUI(() => {
      'worklet';
      const measurements = measure(joystick); // joystick is an AnimatedRef
      if (measurements) {
        const { pageX, pageY, height, width } = measurements;
        joystickMeasurements.value = {
          pageX: pageX,
          pageY: pageY,
          height: height,
          width: width,
          center: {
            x: pageX + width / 2,
            y: pageY + height / 2,
          },
        };
      }
    })();
  };
  // console.log('joystick measurements: ', joystickMeasurements.value);
  const floatingJoystickAnimation = (floatingStickCenter, actualCenter) => {
    'worklet';

    return {
      transform: [
        {
          translateX:
            floatingStickCenter.x === 0 || actualCenter.x === 0
              ? 0
              : Math.round(floatingStickCenter.x - actualCenter.x),
        },
        {
          translateY:
            floatingStickCenter.y === 0 || actualCenter.y === 0
              ? 0
              : Math.round(floatingStickCenter.y - actualCenter.y),
        },
      ],
    };
  };

  const floatingJoystickStyles = useAnimatedStyle(() =>
    floatingJoystickAnimation(
      floatingStickCenter.value,
      joystickMeasurements.value.center
    )
  );

  const knobAnimation = useAnimatedStyle(() => {
    // console.log(knobOffset.value);
    return {
      transform: [
        {
          translateX: withSpring(knobOffset.value.x, {
            stiffness: 900,
            damping: 55,
            mass: 0.6,
          }),
        },
        {
          translateY: withSpring(knobOffset.value.y, {
            stiffness: 900,
            damping: 55,
            mass: 0.6,
          }),
        },
      ],
    };
  });

  const webGamepadStyles = {
    knob: {
      backgroundColor: 'rgba(194, 194, 194, 0.82)',
    },
    outerCircle: {
      borderWidth: 4,

      backgroundColor: '#ffffff00',
      borderColor: '#76767684',
    },
  };

  const changedStyles =
    mode === APP_MODES.CLOUD_GAMING ? webGamepadStyles : { knob: {}, outerCircle: {} };

  return (
    <View style={joystickStyles.container}>
      <Animated.View
        collapsable={false}
        ref={joystick}
        onLayout={getJoystickMeasurements}
        style={[
          joystickStyles.outerCircle,
          floatingJoystickStyles,
          changedStyles.outerCircle,
        ]}
      >
        <Animated.View
          style={[joystickStyles.knob, knobAnimation, changedStyles.knob]}
        ></Animated.View>
      </Animated.View>
    </View>
  );
}

const joystickStyles = StyleSheet.create({
  knob: {
    borderRadius: 50,
    // border: "2px solid purple",
    // flex: 1,
    height: 45,
    width: 45,
    backgroundColor: '#DE8930',
    // backgroundColor: '#e1e1e1',
    // backgroundColor: '#bdccec',
    // boxShadow: [
    //   // inner dark edge (bottom-right)
    //   {
    //     offsetX: -6,
    //     offsetY: 15,
    //     blurRadius: 22,
    //     spreadDistance: 0,
    //     color: 'rgba(0,0,0,0.20)',
    //     inset: true,
    //   },
    //   // inner highlight (top-left)
    //   {
    //     offsetX: 4,
    //     offsetY: -4,
    //     blurRadius: 18,
    //     spreadDistance: 0,
    //     color: 'rgba(255,255,255,0.85)',
    //     inset: true,
    //   },
    //   // optional outer lift
    //   {
    //     offsetX: -3,
    //     offsetY: 1,
    //     blurRadius: 8,
    //     spreadDistance: 0,
    //     color: 'rgba(0,0,0,0.10)',
    //   },
    // ],
  },
  outerCircle: {
    borderRadius: 50,
    // border: "2px solid purple",
    // flex: 1,
    height: 90,
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#202e38',
    // backgroundColor: '#2e6fa9',
    // borderColor: '#6786c5',
    // borderColor: '#7096e2',
    // borderColor: '#DE8930,
    borderColor: '#c1c7ce',
    borderWidth: 15,
    // boxShadow: '0px 2px 8px -3px rgb(171, 171, 171)',
  },
  container: {
    // height: 120,
    // width: 120,
    flex: 1,
    // flex: 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: 'white',
    // borderWidth: 2,
  },
});
