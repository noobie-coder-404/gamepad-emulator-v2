import { StyleSheet, View } from 'react-native';

import { MotiView } from 'moti';

import colors from '@/assets/images/colors';

import { APP_MODES, useMode } from '@/context/ModeContext';

import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

function RippleRing({ slotIndex, rippleElapsed, rippleDuration, rippleInterval }) {
  const { mode } = useMode();
  const isCloud = mode === APP_MODES.CLOUD_GAMING;

  const rippleStyle = useAnimatedStyle(() => {
    const latestLaunchIndex = Math.floor(rippleElapsed.value / rippleInterval);
    const launchIndex = latestLaunchIndex - slotIndex;

    if (launchIndex < 0) {
      return {
        opacity: 0,
        borderWidth: 0,
        transform: [{ scale: 1.2 }],
      };
    }

    const launchTime = launchIndex * rippleInterval;
    const elapsed = rippleElapsed.value - launchTime;
    const isActive = elapsed >= 0 && elapsed < rippleDuration;

    if (!isActive) {
      return {
        opacity: 0,
        borderWidth: 0,
        transform: [{ scale: 1.2 }],
      };
    }

    const progress = elapsed / rippleDuration;

    return {
      opacity: interpolate(progress, [0, 1], [0.7, 0], Extrapolation.CLAMP),
      borderWidth: interpolate(progress, [0, 1], [3, 0], Extrapolation.CLAMP),
      transform: [
        {
          scale: interpolate(progress, [0, 1], [1.2, 2.5], Extrapolation.CLAMP),
        },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        {
          borderRadius: 100,
          borderColor: isCloud ? 'rgba(225, 223, 223, 0.8)' : colors.accent,
        },
        rippleStyle,
      ]}
    />
  );
}

export default function Trigger({
  trigger,
  triggerPull,
  buttonPress,
  triggerSide,
  triggerLength,
}) {
  const { mode } = useMode();
  const isCloud = mode === APP_MODES.CLOUD_GAMING;

  const maxButtonOrbMovement = 25; // bigger = farther down when shoulder button is pressed
  const maxTriggerOrbMovement = 25; // bigger = farther up when trigger is fully pulled
  const rippleDuration = 1500;
  const rippleInterval = 2000;
  const rippleCount = 1; // Only 1 ripple happens

  const translationY = useSharedValue(0);
  const lastActiveSource = useSharedValue('trigger'); // Default to RT/LT
  const rippleElapsed = useSharedValue(0);
  const areRipplesActive = useSharedValue(false);

  // 2. The Logic: Watch for inputs and switch the string
  useAnimatedReaction(
    () => {
      return {
        btn: buttonPress.value,
        trig: triggerPull.value,
      };
    },
    (current, previous) => {
      // If Button was just pressed (0 -> 1)
      if (current.btn === 1 && previous?.btn !== 1) {
        lastActiveSource.value = 'button';
      }
      // If Trigger started pulling (0 -> >0)
      else if (current.trig > 0 && previous?.trig === 0) {
        lastActiveSource.value = 'trigger';
      }
    }
  );

  useAnimatedReaction(
    () => {
      const triggerProgress =
        triggerLength > 0 ? Math.min(triggerPull.value / triggerLength, 1) : 0;

      return triggerProgress >= 1;
    },
    (isFullyPulled, wasFullyPulled) => {
      if (isFullyPulled && !wasFullyPulled) {
        rippleElapsed.value = 0;
        areRipplesActive.value = true;
      } else if (!isFullyPulled && wasFullyPulled) {
        areRipplesActive.value = false;
        rippleElapsed.value = 0;
      }
    }
  );

  useFrameCallback((frameInfo) => {
    'worklet';
    if (!areRipplesActive.value) return;

    // Stop accumulating time once we exceed the single ripple duration
    if (rippleElapsed.value > rippleDuration) return;

    rippleElapsed.value += frameInfo.timeSincePreviousFrame ?? 16;
  });

  // 2. The Logic: Reaction drives the motion (Spring Version)
  useAnimatedReaction(
    () => buttonPress.value,
    (current, previous) => {
      // "Snappy" Physics Configuration
      const springConfig = {
        mass: 0.1, // Virtually weightless
        stiffness: 800, // Extremely strong pull
        damping: 30, // Kills the bounce instantly (no wobble)
        overshootClamping: true, // Prevents it from overshooting the configured travel
      };

      // EVENT: PRESS (0 -> 1)
      if (current === 1 && previous === 0) {
        // Spring down to the configured button travel
        translationY.value = withSpring(maxButtonOrbMovement, springConfig);
      }
      // EVENT: RELEASE (1 -> 0)
      else if (current === 0 && previous === 1) {
        // "Queue" the return trip with springs:
        // 1. Finish springing to the configured button travel
        // 2. Then spring back to 0
        translationY.value = withSequence(
          withSpring(maxButtonOrbMovement, springConfig),
          withSpring(0, springConfig)
        );
      }
    }
  );

  // 3. The Style: Applies the logic to the View
  const orbStyles = useAnimatedStyle(() => {
    const triggerProgress =
      triggerLength > 0 ? Math.min(triggerPull.value / triggerLength, 1) : 0;

    // Priority:
    // If Trigger is active, follow the finger (moves up/negative).
    // If Trigger is idle, follow the button animation (moves down/positive).
    const activeY = withSpring(
      triggerPull.value > 0
        ? -triggerProgress * maxTriggerOrbMovement
        : translationY.value,
      {
        mass: 0.5, // Lighter weight for faster start
        stiffness: 300, // High stiffness for quick snap
        damping: 25, // High damping to stop instantly without wobbling
      }
    );
    // Visibility Check:
    // Visible if: Trigger is pulled OR Button is held OR Animation is still running
    const isVisible =
      triggerPull.value > 0 || buttonPress.value > 0 || translationY.value !== 0;

    return {
      transform: [{ translateY: activeY }],
      opacity: isVisible
        ? withTiming(1, { duration: 100 }) // Fade in fast
        : withDelay(600, withTiming(0)), // Wait 200ms before fading out
    };
  });

  const ripplesVisible = useDerivedValue(() => {
    const triggerProgress =
      triggerLength > 0 ? Math.min(triggerPull.value / triggerLength, 1) : 0;

    return {
      opacity: triggerProgress >= 1 ? 1 : 0,
      // 2. Add subtle scale to the container for "breathing" effect
      transform: [
        {
          scale: interpolate(triggerProgress, [0, 1], [0.8, 1], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const buttonTextVisible = useAnimatedStyle(() => {
    const isButtonActive = lastActiveSource.value === 'button';
    return {
      opacity: isButtonActive ? 1 : 0,
      transform: [{ scale: isButtonActive ? 1 : 0 }],
    };
  });

  // 4. Trigger Text Style (RT / LT)
  // Visible only if the string is 'trigger'
  const triggerTextVisible = useAnimatedStyle(() => {
    const isTriggerActive = lastActiveSource.value === 'trigger';
    return {
      opacity: isTriggerActive ? 1 : 0,
      transform: [{ scale: isTriggerActive ? 1 : 0 }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.upperInnerContainer,
        {
          justifyContent: triggerSide === 'right' ? 'flex-start' : 'flex-end',
          // backgroundColor: "hsl(262, 58%, 73%)",
          // backgroundColor: "rgba(255, 255, 255, 0.1)",
        },
      ]}
      ref={trigger}
      //   onLayout={trigger.measureOnLayout}
    >
      <View
        style={{
          display: 'flex',
          flex: 0.3,
          flexDirection: 'row',
          justifyContent: 'center',
          padding: 40,
          paddingHorizontal: isCloud ? 40 : 80,

          // backgroundColor: "powderblue",
          // alignItems: "flex-start",
        }}
      >
        <MotiView //for RT and LT
          style={[
            {
              width: 40,
              height: 40,
              borderRadius: 50,
              alignItems: 'center',
              justifyContent: 'center',
              // backgroundColor: 'rgba(255, 255, 255,0.8)',
              backgroundColor: '#c1c7ce',
              borderColor: 'rgba(211, 211, 211, 0.8)',
              // borderWidth: 4,
              zIndex: -1,
              // opacity: 0,
            },
            // orbMovementStyle,
            orbStyles,
          ]}
          from={{
            opacity: 0,
            transform: [{ translateY: 20 }],
          }}
        >
          <MotiView
            from={{
              opacity: 0,
            }}
            animate={ripplesVisible}
            style={StyleSheet.absoluteFillObject}
          >
            {Array.from({ length: rippleCount }, (_, index) => (
              <RippleRing
                slotIndex={index}
                key={index}
                rippleElapsed={rippleElapsed}
                rippleDuration={rippleDuration}
                rippleInterval={rippleInterval}
              />
            ))}

            {/* Archery target outline */}
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                {
                  borderRadius: 100,
                  borderColor: isCloud ? 'rgba(225, 223, 223, 0.8)' : colors.accent,
                  opacity: isCloud ? 0.3 : 1,
                  borderWidth: 2,
                  transform: [{ scale: 1.4 }],
                },
              ]}
            />
          </MotiView>
          {triggerSide === 'right' ? (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Animated.Text
                style={[
                  {
                    fontSize: 10,
                    fontWeight: 'bold',
                    color: 'rgba(60, 60, 61, 0.8)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                    // position: 'absolute' // Optional: use this if the text pushes layout, but unlikely here
                  },
                  triggerTextVisible,
                ]}
              >
                RT
              </Animated.Text>
              <Animated.Text
                style={[
                  {
                    fontSize: 10,
                    fontWeight: 'bold',
                    color: 'rgba(60, 60, 61, 0.8)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'absolute',
                    textAlign: 'center',
                    // backgroundColor: "rgba(255, 255, 255,0.8)",
                    // position: 'absolute' // Optional: use this if the text pushes layout, but unlikely here
                  },
                  buttonTextVisible,
                ]}
              >
                RB
              </Animated.Text>
            </View>
          ) : (
            <View>
              <Animated.Text
                style={[
                  {
                    fontSize: 10,
                    fontWeight: 'bold',
                    color: 'rgba(60, 60, 61, 0.8)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                    // position: 'absolute' // Optional: use this if the text pushes layout, but unlikely here
                  },
                  triggerTextVisible,
                ]}
              >
                LT
              </Animated.Text>
              <Animated.Text
                style={[
                  {
                    fontSize: 10,
                    fontWeight: 'bold',
                    color: 'rgba(60, 60, 61, 0.8)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'absolute',
                    textAlign: 'center',
                    // backgroundColor: "rgba(255, 255, 255,0.8)",
                    // position: 'absolute' // Optional: use this if the text pushes layout, but unlikely here
                  },
                  buttonTextVisible,
                ]}
              >
                LB
              </Animated.Text>
            </View>
          )}
        </MotiView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  upperContainer: {
    flexDirection: 'row',
    flex: 1.2,
  },
  upperInnerContainer: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 25,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  lowerContainer: {
    flex: 1,
    backgroundColor: 'hsl(234, 76%, 79%)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    // alignItems: "center",
  },
  triggerPullIndicator: {
    width: 10,
    height: 30,
    borderRadius: 1,
    opacity: 0,
  },
  centerCluster: {
    flex: 0.8,
    border: '2px solid pink',
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 80,
  },
  buttonsContainer: {
    // flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'pink',
    padding: 20,
    // height: 100,
    // width: 100,
  },
});
