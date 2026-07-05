import { StyleSheet, View } from 'react-native';

import colors from '@/assets/images/colors';
import { scale } from '@/helper-functions/scaling';
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

  return (
    <View style={joystickStyles.container}>
      <Animated.View
        collapsable={false}
        ref={joystick}
        onLayout={getJoystickMeasurements}
        style={[joystickStyles.outerCircle, floatingJoystickStyles]}
      >
        <Animated.View style={[joystickStyles.knob, knobAnimation]}></Animated.View>
      </Animated.View>
    </View>
  );
}

const joystickStyles = StyleSheet.create({
  knob: {
    borderRadius: scale(50),
    height: scale(45),
    width: scale(45),
    backgroundColor: colors.joystickKnob,
  },
  outerCircle: {
    borderRadius: scale(50),
    height: scale(90),
    width: scale(90),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff00',
    borderColor: colors.joystickBorder,
    borderWidth: scale(4),
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
