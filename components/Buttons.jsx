import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import Entypo from '@expo/vector-icons/Entypo';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Gugi_400Regular, useFonts } from '@expo-google-fonts/gugi';
import { Orbitron_900Black } from '@expo-google-fonts/orbitron';

import colors from '@/assets/images/colors';
import { useMode } from '@/context/ModeContext';
import { fontScale, scale } from '@/helper-functions/scaling';

//todo - make facepad and dpad buttons floating too, for better eyes-free usage

export default function Buttons({
  buttons,
  cluster,
  isClusterActive,
  activeButton,
  clusterType, // 2 possible values - 'facepad' or 'dpad'
  buttonAlignment, // 2 possible values - 'rays' or 'cross'
}) {
  const { mode, setMode } = useMode();

  let [fontsLoaded] = useFonts({
    Gugi: Gugi_400Regular,
    Orbitron: Orbitron_900Black,
  });

  // Controls the main background color of the button when it is actively pressed
  // Controls the glowing box-shadow color around the button when it is actively pressed
  const activeOptionColor = colors.clusterAnchor;
  const activeOptionColorSecondary = colors.clusterHighlight;

  const iconColor = colors.cloudGamepadText;
  const dynamicTextStyle = [styles.buttonText, { color: iconColor }];

  let clusterButtons;
  clusterButtons =
    clusterType === 'facepad'
      ? { up: 'y', down: 'a', left: 'x', right: 'b' }
      : {
          down: 'down',
          right: 'right',
          left: 'left',
          up: 'up',
        };

  let buttonIcons;
  buttonIcons =
    clusterType === 'facepad'
      ? {
          main: (
            <MaterialCommunityIcons
              name="gamepad-circle-outline"
              size={scale(28)}
              color={iconColor}
            />
          ),
          up: <Text style={dynamicTextStyle}>{clusterButtons.up.toUpperCase()[0]}</Text>,
          down: (
            <Text style={dynamicTextStyle}>{clusterButtons.down.toUpperCase()[0]}</Text>
          ),
          left: (
            <Text style={dynamicTextStyle}>{clusterButtons.left.toUpperCase()[0]}</Text>
          ),
          right: (
            <Text style={dynamicTextStyle}>{clusterButtons.right.toUpperCase()[0]}</Text>
          ),
        }
      : {
          main: (
            <MaterialCommunityIcons name="gamepad" size={scale(28)} color={iconColor} />
          ),
          down: (
            <Entypo
              name="chevron-up"
              size={scale(28)}
              color={iconColor}
              style={{ transform: [{ rotate: '180deg' }] }}
            />
          ),
          right: (
            <Entypo
              name="chevron-up"
              size={scale(28)}
              color={iconColor}
              style={{ transform: [{ rotate: '90deg' }] }}
            />
          ),
          left: (
            <Entypo
              name="chevron-up"
              size={scale(28)}
              color={iconColor}
              style={{ transform: [{ rotate: '270deg' }] }}
            />
          ),
          up: <Entypo name="chevron-up" size={scale(28)} color={iconColor} />,
        };

  const previousButton = useSharedValue(null);
  useAnimatedReaction(
    () => activeButton.value,
    (current, previous) => {
      if (current !== previous) {
        previousButton.value = previous; // Store what it JUST was
      }
    }
  );

  let buttonDirectionMap;
  buttonDirectionMap =
    clusterType === 'facepad'
      ? {
          a: 'down',
          b: 'right',
          x: 'left',
          y: 'up',
        }
      : {
          down: 'down',
          right: 'right',
          left: 'left',
          up: 'up',
        };

  // Pre-calculate scaled values on the JS thread so they can be
  // safely passed into the Reanimated UI worklets below!
  const scaled75 = scale(75);
  const scaled17 = scale(17);
  const scaled35 = scale(35);
  const scaled102 = scale(102);

  const buttonStyles = (direction, isActive, activeButton) => {
    'worklet';

    //  const wasActive = isActive
    //   ? activeButton
    //   : withDelay(100, withTiming(0, { duration: 0 }));
    // console.log('previous button :', previousButton.value)

    let buttonDirection;
    buttonDirection =
      clusterType === 'facepad'
        ? {
            a: 'down',
            b: 'right',
            x: 'left',
            y: 'up',
          }
        : {
            down: 'down',
            right: 'right',
            left: 'left',
            up: 'up',
          };

    // console.log('active button: ', activeButton);

    const translateX = isActive ? scaled75 : 0;
    const translateY = isActive ? scaled75 : 0;

    const directionMap = {
      'left-up': { x: -1, y: -1 },
      up: { x: 0, y: -1 },
      'right-up': { x: 1, y: -1 },
      left: { x: -1, y: 0 },
      center: { x: 0, y: 0 },
      right: { x: 1, y: 0 },
      'left-down': { x: -1, y: 1 },
      down: { x: 0, y: 1 },
      'right-down': { x: 1, y: 1 },
    };

    let coords = directionMap[direction] || { x: 0, y: 0 };

    // Standalone experimental rays layout. Delete this block to fully remove rays.
    if (buttonAlignment?.value === 'rays') {
      const rayCoords =
        clusterType === 'dpad'
          ? {
              left: { x: -1.35, y: 0 },
              up: { x: -0.675, y: -1.169 },
              down: { x: 0.675, y: -1.169 },
              right: { x: 1.35, y: 0 },
              center: { x: 0, y: 0 },
            }
          : {
              down: { x: -1.35, y: 0 },
              right: { x: -0.675, y: -1.169 },
              left: { x: 0.675, y: -1.169 },
              up: { x: 1.35, y: 0 },
              center: { x: 0, y: 0 },
            };

      coords = rayCoords[direction] || coords;
    }

    return {
      transform: [
        {
          translateX: withTiming(coords.x * translateX, {
            duration: 100,
            // easing: Easing.inOut(Easing.poly(9)),
            // reduceMotion: ReduceMotion.System,
          }),
        },
        {
          translateY: withTiming(coords.y * translateY, {
            duration: 100,
            // easing: Easing.inOut(Easing.poly(9)),
            // reduceMotion: ReduceMotion.System,
          }),
        },
      ],
      // borderWidth: 4,
      // backgroundColor:
      //   direction === 'center'
      //     ? '#cfcfcf'
      //     : direction === buttonDirection[activeButton]
      //       ? '#ffffff'
      //       : '#cfcfcf',
      backgroundColor: colors.cloudGamepadBase,

      opacity:
        // direction === buttonDirection[activeButton] || !activeButton ? 1 : 0,
        direction === buttonDirection[activeButton] ||
        (direction === 'center' && !isActive && !activeButton) ||
        (isActive && !activeButton && direction !== 'center')
          ? withTiming(1, { duration: 100 })
          : activeButton &&
              direction !== buttonDirection[activeButton] &&
              direction !== 'center'
            ? withTiming(1, { duration: 200 })
            : direction === buttonDirection[previousButton.value]
              ? withTiming(0, { duration: 350 })
              : withTiming(0, { duration: 20 }),
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: [
        {
          offsetX: 0,
          offsetY: 0,
          blurRadius: 0,
          spreadDistance: 15, // New! Spread was previously impossible on Android

          color:
            direction === buttonDirection[activeButton]
              ? activeOptionColorSecondary
              : '#ffffff00',
        },
      ],

      // height: isActive ? withDelay(160, withTiming(50.5, { duration: 0 })) : 50, // onLayout doesn't fire again if only transforms are applied, so we applied +0.5 height and width to make it fire again
      // width: isActive ? withDelay(160, withTiming(50.5, { duration: 0 })) : 50, //it should change over a duration just like the transforms above so that onLayout doesn't end up firing and measuring the component before the transforms have been fully applied
      //delaying width and height change makes sure that transforms fully apply before the onLayout fires again. If animation takes longer than the user can react, the user might end up trying to press the button
      // before it has completely moved to its final position and since onLayout hasn't fired yet, the touch won't register and user won't notice anything happening. So, make sure animation is faster than someone can react (100ms is the fastest a human can react, even high skill pro gamers have around 130-150ms reaction time)
      // using same timing function as transforms will make sure that buttons remain pressable during any point in the animation, but since withTiming will cause the height and width to change over time to its final value, the onLayout will keep firing in the meantime and may decrease performance
      // also notice that withDelay is a wrapper function and withTiming is required inside it for it to function, and setting duration 0 on withTiming essentially causes only delay, and value snaps to final instantly after the delay
    };
  };

  const leftUp = useAnimatedStyle(() =>
    buttonStyles('left-up', isClusterActive.value, activeButton.value)
  );
  const up = useAnimatedStyle(() =>
    buttonStyles('up', isClusterActive.value, activeButton.value)
  );
  const rightUp = useAnimatedStyle(() =>
    buttonStyles('right-up', isClusterActive.value, activeButton.value)
  );
  const left = useAnimatedStyle(() =>
    buttonStyles('left', isClusterActive.value, activeButton.value)
  );
  const center = useAnimatedStyle(() =>
    buttonStyles('center', isClusterActive.value, activeButton.value)
  );
  const right = useAnimatedStyle(() =>
    buttonStyles('right', isClusterActive.value, activeButton.value)
  );

  const leftDown = useAnimatedStyle(() =>
    buttonStyles('left-down', isClusterActive.value, activeButton.value)
  );
  const down = useAnimatedStyle(() =>
    buttonStyles('down', isClusterActive.value, activeButton.value)
  );

  const rightDown = useAnimatedStyle(() =>
    buttonStyles('right-down', isClusterActive.value, activeButton.value)
  );

  const directionBar = useAnimatedStyle(() => {
    const rotateAngle = {
      up: '270deg',
      down: '90deg',
      right: '0deg',
      left: '180deg',
    };
    let rotateValue = rotateAngle[buttonDirectionMap[activeButton.value]];
    let barWidth = scaled35;
    let barCenterOffset = scaled17;

    // Standalone experimental rays layout. Delete this block to fully remove rays.
    if (buttonAlignment?.value === 'rays') {
      const rayAngles =
        clusterType === 'dpad'
          ? {
              left: '180deg',
              up: '240deg',
              down: '300deg',
              right: '0deg',
            }
          : {
              down: '180deg',
              right: '240deg',
              left: '300deg',
              up: '0deg',
            };

      rotateValue = rayAngles[buttonDirectionMap[activeButton.value]] || rotateValue;
      barWidth = scaled102;
      barCenterOffset = scaled102 / 2;
    }
    // console.log('active button in styles: ', activeButton.value)
    // console.log('inside directionbar: ',rotateValue)

    return {
      width: withTiming(barWidth, { duration: 100 }),
      transformOrigin: 'left center',
      opacity: activeButton.value ? 1 : 0,
      transform: [
        // {scaleX: 50},
        // {scaleY: 5},
        { translateX: withTiming(barCenterOffset, { duration: 100 }) },
        { rotate: activeButton.value ? rotateValue : '0deg' },
      ],
    };
  });
  const centerBallStyles = useAnimatedStyle(() => {
    if (isClusterActive.value) return { backgroundColor: colors.clusterCenter };
    else return { backgroundColor: '#ffffff00' };
  });

  // Wait for fonts to load before rendering the app
  if (!fontsLoaded) {
    return null;
  }

  return (
    <Animated.View style={styles.buttonsContainer} ref={cluster}>
      <Animated.View
        style={[
          {
            width: scale(35), //used to be 70
            height: scale(5),
            zIndex: -9999,
            position: 'absolute',
            backgroundColor: activeOptionColor,
          },
          directionBar,
        ]}
      ></Animated.View>
      <Animated.View
        style={[
          {
            width: scale(20),
            height: scale(20),
            borderRadius: 999,
            zIndex: -999,
            position: 'absolute',
          },
          centerBallStyles,
        ]}
      ></Animated.View>
      <Animated.View
        style={[
          styles.buttons,
          center,
          {
            zIndex: 5,
            position: 'absolute',
            backgroundColor: colors.cloudGamepadBase,
            borderWidth: 6,
            // Controls the border color of the unexpanded facepad/ABXY center button (idle state)
            borderColor: '#ffffff00',
            // borderColor: '#4178e4',
          },
        ]}
        ref={buttons.center}
      >
        {/* <Text style={styles.buttonText}>O</Text> */}
        {buttonIcons.main}
      </Animated.View>

      {/* UP */}
      <Animated.View
        style={[styles.buttons, { zIndex: 1, position: 'absolute' }, up]}
        ref={buttons[clusterButtons.up]}
      >
        <View style={[styles.borderContainer, { borderColor: iconColor }]}>
          {buttonIcons.up}
        </View>
      </Animated.View>

      {/* RIGHT */}
      <Animated.View
        style={[styles.buttons, { zIndex: 2, position: 'absolute' }, right]}
        ref={buttons[clusterButtons.right]}
      >
        <View style={[styles.borderContainer, { borderColor: iconColor }]}>
          {buttonIcons.right}
        </View>
      </Animated.View>

      {/* DOWN */}
      <Animated.View
        style={[styles.buttons, { zIndex: 3, position: 'absolute' }, down]}
        ref={buttons[clusterButtons.down]}
      >
        <View style={[styles.borderContainer, { borderColor: iconColor }]}>
          {buttonIcons.down}
        </View>
      </Animated.View>

      {/* LEFT */}
      <Animated.View
        style={[styles.buttons, { zIndex: 4, position: 'absolute' }, left]}
        ref={buttons[clusterButtons.left]}
      >
        <View style={[styles.borderContainer, { borderColor: iconColor }]}>
          {buttonIcons.left}
          {/* <Text style={styles.buttonText}>{buttonIcons.left}</Text> */}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  buttonsContainer: {
    // flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor: "pink",
    padding: scale(20),
    borderRadius: 999,
    // backgroundColor: '#9f9f9f'
    // height: 100,
    // width: 100,
  },
  buttons: {
    // flex: 1,
    // backgroundColor: '#E0E3E8',
    borderRadius: 999,
    width: scale(52),
    height: scale(52),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    // display: "flex",
    // backgroundColor: "white",
    textAlign: 'center',
    fontWeight: 'bold',
    // fontStyle: 'helvetica',
    fontSize: fontScale(15),
    // fontFamily: 'Orbitron',
  },
  borderContainer: {
    padding: scale(2),
    borderWidth: 3,
    borderRadius: 999,
    width: scale(42),
    height: scale(42),
    justifyContent: 'center',
    alignItems: 'center',
  },
});
