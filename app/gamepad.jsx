import colors from '@/assets/images/colors';
import Buttons from '@/components/Buttons';
import Joystick from '@/components/Joystick';
import OnboardingModal from '@/components/OnboardingModal';
import Trigger from '@/components/Trigger';
import { useMode } from '@/context/ModeContext';
import { calculateOffset } from '@/helper-functions/calculateOffset';
import { initialiseGamepad } from '@/helper-functions/gamepadInterface';
import { isInside } from '@/helper-functions/isInside';
import { PWA_CLEAN_SPOOF } from '@/helper-functions/spoof';
import { useOneEuroFilter } from '@/hooks/useOneEuroFilter';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import SimpleLineIcons from '@expo/vector-icons/SimpleLineIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as NavigationBar from 'expo-navigation-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { WebView } from 'react-native-webview';

console.log(colors);
const isTouchVisible = true;
const handColor = '#a5a5a5';

const facepadValues = {
  a: 1,
  b: 2,
  x: 3,
  y: 4,
  null: 0,
};
const dPadValues = {
  up: 1,
  down: 2,
  right: 3,
  left: 4,
  null: 0,
};

const GAIN_PROFILES = {
  normal: 1,
  fps: 1.5,
  pro: 2,
};

const noOfSteps = 65534; //if you change this, then also change it in the receiver
const triggerDirectionUpwards = true;
const continuousMode = false; // trigger and button can be controlled without lifting the finger up
//proper continuous mode is yet to be implemented because that would require adding a deadzone
const triggerLength = 70;
const MENU_BUTTON_SIZE = 36;

// Temporary component to display touches for video recording
const TouchCursor = ({ index, debugTouches }) => {
  const style = useAnimatedStyle(() => {
    const touch = debugTouches.value[index];
    if (!touch) {
      return { opacity: 0, transform: [{ translateX: -100 }, { translateY: -100 }] };
    }
    return {
      opacity: 1,
      transform: [
        { translateX: touch.x - 42 }, // Center the icon horizontally on the touch point
        { translateY: touch.y - 5 }, // Shift up so the solid fingertip aligns with the touch point
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          zIndex: 99999,
          justifyContent: 'center',
          alignItems: 'center',
        },
        style,
      ]}
    >
      <MaterialCommunityIcons
        name="hand-pointing-up"
        size={84}
        color={handColor}
        style={{ transform: [{ scaleX: -1 }] }}
      />
    </Animated.View>
  );
};

export default function Index() {
  // send event based snapshots -
  // send the snapshot upon change as it is detected
  // if change not detected until time x, send the previous snanshot again
  // frequency of nonevent snapshot should be enough to not cause bufferbloat or clog the js thread
  // caveats - letting go of stick and it springs back to center - need to send movement packets for it coming back towards the center, maybe even overshooting

  const { url } = useLocalSearchParams();
  const router = useRouter();

  const websiteUrl = Array.isArray(url) ? url[0] : url;

  const { width, height } = useWindowDimensions();
  const { mode, setMode } = useMode();

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [trackpadMode, setTrackpadMode] = useState(true);
  const trackpadModeSV = useSharedValue(true);
  const [gain, setGain] = useState(1.5);
  const gainSV = useSharedValue(1.5);
  const [sensitivity, setSensitivity] = useState(10);
  const sensitivitySV = useSharedValue(10);

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden'); // hide navbar on android
      // 'overlay-swipe' enables true Immersive Mode, required to hide the Android 12L+ taskbar
      NavigationBar.setBehaviorAsync('overlay-swipe');
    }
    // 1. Load settings when gamepad opens
    const loadSettings = async () => {
      try {
        const savedTrackpadMode = await AsyncStorage.getItem('trackpadMode');
        if (savedTrackpadMode !== null) {
          const val = JSON.parse(savedTrackpadMode);
          setTrackpadMode(val);
          trackpadModeSV.value = val;
        }
        const savedGain = await AsyncStorage.getItem('gain');
        if (savedGain !== null) {
          const val = JSON.parse(savedGain);
          setGain(val);
          gainSV.value = val;
        }
        const savedSensitivity = await AsyncStorage.getItem('trackpadSensitivity');
        if (savedSensitivity !== null) {
          const val = JSON.parse(savedSensitivity);
          setSensitivity(val);
          sensitivitySV.value = val;
        }
      } catch (error) {
        console.error('Failed to load settings', error);
      }
    };
    loadSettings();

    // 2. Save settings when gamepad closes (minimally invasive)
    return () => {
      if (Platform.OS === 'android') {
        NavigationBar.setBehaviorAsync('inset-touch');
        NavigationBar.setVisibilityAsync('visible');
      }
      AsyncStorage.setItem('trackpadMode', JSON.stringify(trackpadModeSV.value)).catch(
        console.error
      );
      AsyncStorage.setItem('gain', JSON.stringify(gainSV.value)).catch(console.error);
      AsyncStorage.setItem(
        'trackpadSensitivity',
        JSON.stringify(sensitivitySV.value)
      ).catch(console.error);
    };
  }, []);

  const BOUNDARY = 10;
  const CLOSED_WIDTH = 119;
  const EXPANDED_WIDTH = 290;
  const MENU_HEIGHT = 50;

  const menuX = useSharedValue(width / 2 - CLOSED_WIDTH / 2);
  const menuY = useSharedValue(BOUNDARY);
  const menuWidth = useSharedValue(CLOSED_WIDTH);
  const isFirstLandscape = useRef(true);
  const isMenuExpanded = useSharedValue(false);

  const initialMeasurements = {
    pageX: 0,
    pageY: 0,
    height: 0,
    width: 0,
    center: { x: 0, y: 0 },
  };

  const isR3Active = useSharedValue(0);
  const isL3Active = useSharedValue(0);

  const rightR3 = useAnimatedRef();
  const rightL3 = useAnimatedRef();

  const leftR3 = useAnimatedRef();
  const leftL3 = useAnimatedRef();

  const r3Finger = useSharedValue(-1);
  const l3Finger = useSharedValue(-1);
  const activeStickButton = useSharedValue(null);

  // Refs used specifically to measure hit detection
  const selectButtonRef = useAnimatedRef();
  const startButtonRef = useAnimatedRef();

  // Shared values to track button press state (0 or 1) and active touch ID
  const selectButton = useSharedValue(0);
  const startButton = useSharedValue(0);
  const selectButtonFinger = useSharedValue(-1);
  const startButtonFinger = useSharedValue(-1);

  const activeDpadButton = useSharedValue(null);
  const isDpadActive = useSharedValue(null);
  const dPadButtons = {
    up: useAnimatedRef(),
    down: useAnimatedRef(),
    right: useAnimatedRef(),
    left: useAnimatedRef(),
    center: useAnimatedRef(),
  };

  const dPad = useAnimatedRef();

  const dPadButtonsMeasurements = {
    //to be implemented
    up: useSharedValue({ ...initialMeasurements }),
    down: useSharedValue({ ...initialMeasurements }),
    right: useSharedValue({ ...initialMeasurements }),
    left: useSharedValue({ ...initialMeasurements }),
  };

  //shared values for face buttons
  const activeFaceButton = useSharedValue(null);

  const isFacePadActive = useSharedValue(false);
  const faceButtons = {
    a: useAnimatedRef(),
    b: useAnimatedRef(),
    x: useAnimatedRef(),
    y: useAnimatedRef(),
    center: useAnimatedRef(),
  };

  //faceButtonsMeasurements should be stored in sharedValue onLayout and then passed to isInside for hit detection
  //right now, isInside itself measures the component repeatedly for hit detection, but this leads to measurement again and again with each
  // frame and thus performance will take a hit. Better to measure once onLayout and store in a shared value which isInside can use to make a quick
  //comparison rather than to calculate the layout itself repeatedly
  const faceButtonsMeasurements = {
    //to be implemented
    a: useSharedValue({ ...initialMeasurements }),
    b: useSharedValue({ ...initialMeasurements }),
    x: useSharedValue({ ...initialMeasurements }),
    y: useSharedValue({ ...initialMeasurements }),
  };
  const facePad = useAnimatedRef();

  const rightTrigger = useAnimatedRef();
  const leftTrigger = useAnimatedRef();
  const rightJoystick = useAnimatedRef();
  const rightJoystickMeasurements = useSharedValue({
    pageX: 0,
    pageY: 0,
    height: 0,
    width: 0,
    center: { x: 0, y: 0 },
  });
  const leftJoystick = useAnimatedRef();
  const leftJoystickMeasurements = useSharedValue({
    pageX: 0,
    pageY: 0,
    height: 0,
    width: 0,
    center: { x: 0, y: 0 },
  });

  const triggerPullRight = useSharedValue(0);
  const triggerPullLeft = useSharedValue(0);

  const buttonPressRight = useSharedValue(0);
  const buttonPressLeft = useSharedValue(0);

  // We use these to "remember" the start of the pull
  const leftInitialY = useSharedValue(0);
  const rightInitialY = useSharedValue(0);
  // Remembers whether the current shoulder touch is acting as a trigger or a button.
  // When continuousMode is false, this gets "latched" on first movement and stays there
  // until the finger lifts. When continuousMode is true, it can change every frame.
  const leftShoulderMode = useSharedValue(null);
  const rightShoulderMode = useSharedValue(null);

  const leftFinger = useSharedValue(-1);
  const rightFinger = useSharedValue(-1);
  const rightJoystickFinger = useSharedValue(-1);
  const leftJoystickFinger = useSharedValue(-1);
  const facePadFinger = useSharedValue(-1);
  const dPadFinger = useSharedValue(-1);
  const rightFloatingStickCenter = useSharedValue({ x: 0, y: 0 }); //new center of the joystick when the user touches it
  const leftFloatingStickCenter = useSharedValue({ x: 0, y: 0 });
  const rightKnobOffset = useSharedValue({ x: 0, y: 0 }); //calculated with floating joystick center as origin
  const leftKnobOffset = useSharedValue({ x: 0, y: 0 });

  const trackpad = useAnimatedRef();
  const currentTrackpadInfo = useSharedValue(null);
  // const velocityCap = 0.16; // for tanh
  const velocityCap = 0.2; // for pade
  // const baseVelocityCap = 0.16; // for tanh
  const baseVelocityCap = 0.2; // for pade
  const sensitivityRange = 0.1;
  const sensitivityMax = 20;
  const initialFrequency = undefined; //initial frequency (Hz), gets overwritten after first sample ( can use for fallback )
  const minCutoff = 0.5; //default 1.0 -- 0.1 means heavy smoothing at low speeds
  const beta = 0.007; //default 0.1  -- 0 means fast swipes are not changed at all
  const dCutoff = 1.0; //default 1.0 ( leave as is, unless you know what you're doing - which I don't)
  const filterX = useOneEuroFilter(undefined, minCutoff, beta, dCutoff);
  const filterY = useOneEuroFilter(undefined, minCutoff, beta, dCutoff);
  // const filterVx = useDoubleExponentialFilter(1.2);
  // const filterVy = useDoubleExponentialFilter(1.2);
  // const filterVx = useMovingAverage(7);
  // const filterVy = useMovingAverage(7);

  const previousSnapshot = useSharedValue(null);
  const lastPacketTime = useSharedValue(null);
  const totalChanges = useSharedValue(0);
  const startTime = useSharedValue(0);
  const endTime = useSharedValue(0);
  const minDuration = useSharedValue(0);
  // const maxChangesPerSecond = useSharedValue(0);
  const noOfPackets = useSharedValue(0);

  // Array to hold active touch coordinates for the tutorial overlay
  const debugTouches = useSharedValue([]);

  const clampTriggerPull = (value) => {
    'worklet';
    return Math.min(triggerLength, Math.max(0, value));
  };

  const currentSnapshot = useDerivedValue(() => {
    const triggerPullValueRight = triggerPullRight.value;
    const triggerPullValueLeft = triggerPullLeft.value;

    const clamp = (n, lo, hi) => {
      'worklet';
      return Math.min(hi, Math.max(lo, n));
    };

    const stickDiameter = 80; // make this dynamic so it measures the stick diameter automatically at runtime once
    const toByte = (v) => {
      'worklet';
      const clamped = clamp(v, -stickDiameter / 2, stickDiameter / 2);
      // return Math.round(((clamped + 40) / 80) * 255); // 0..255
      // return Math.round(((clamped + 40) / 80) * 1000); // 0..255
      return Math.round(((clamped + stickDiameter / 2) / stickDiameter) * noOfSteps); // 0..255
    };

    const leftKnobOffsetX = toByte(leftKnobOffset.value.x);
    const leftKnobOffsetY = toByte(leftKnobOffset.value.y);
    const rightKnobOffsetX = toByte(rightKnobOffset.value.x);
    const rightKnobOffsetY = toByte(rightKnobOffset.value.y);

    return [
      //left side
      leftKnobOffsetX,
      leftKnobOffsetY,
      Math.round((triggerPullValueLeft / triggerLength) * noOfSteps),
      buttonPressLeft.value,
      dPadValues[activeDpadButton.value],

      //right side

      rightKnobOffsetX,
      rightKnobOffsetY,
      Math.round((triggerPullValueRight / triggerLength) * noOfSteps),
      buttonPressRight.value,
      facepadValues[activeFaceButton.value],
      isL3Active.value,
      isR3Active.value,
      selectButton.value,
      startButton.value,
    ];
  });

  const webViewRef = useRef(null);

  const sendNativePacket = useCallback((arr) => {
    const jsCode = `window.uG(${JSON.stringify(arr)}); true;`;
    // Inject it
    webViewRef.current?.injectJavaScript(jsCode);
  }, []);

  const isSame = useDerivedValue(() => {
    return previousSnapshot.value
      ? currentSnapshot.value.every((val, index) => val === previousSnapshot.value[index])
      : false;
  });

  //to do - 1. add deadzone when finger returning to initial position, such that finger doesn't have to go all the way back to it (atleast in buttons ; this might
  // mess up trigger press and return 1:1 linearity if applied to trigger - anayze before application)

  const getCancellationPacket = (toBeCancelled) => {
    'worklet';
    const packet = [...currentSnapshot.value];

    if (toBeCancelled === 'right stick') {
      packet[5] = noOfSteps / 2;
      packet[6] = noOfSteps / 2;
    } else if (toBeCancelled === 'left stick') {
      packet[0] = noOfSteps / 2;
      packet[1] = noOfSteps / 2;
    } else if (toBeCancelled === 'left shoulder') {
      packet[2] = 0;
      packet[3] = 0;
    } else if (toBeCancelled === 'right shoulder') {
      packet[7] = 0;
      packet[8] = 0;
    } else if (toBeCancelled === 'dpad') {
      packet[4] = 0;
    } else if (toBeCancelled === 'facepad') {
      packet[9] = 0;
    } else if (toBeCancelled === 'l3') {
      packet[10] = 0;
    } else if (toBeCancelled === 'r3') {
      packet[11] = 0;
    } else if (toBeCancelled === 'select') {
      // Nullify Select button output
      packet[12] = 0;
    } else if (toBeCancelled === 'start') {
      // Nullify Start button output
      packet[13] = 0;
    }

    console.log(`cancellation packet for ${toBeCancelled} : ${packet}`);
    return packet;
  };

  const isActive = useSharedValue(false);

  const manualGesture = Gesture.Manual()
    .onTouchesDown((e, manager) => {
      // Update tutorial overlay points
      debugTouches.value = e.allTouches.map((t) => ({
        id: t.id,
        x: t.absoluteX,
        y: t.absoluteY,
      }));

      manager.activate();
      if (isMenuExpanded.value) {
        isMenuExpanded.value = false;
      }
      // start the timer
      if (!isActive.value && e.allTouches.length > 0) {
        isActive.value = true;
        startTime.value = performance.now();
        // console.log('timer begins: ', startTime.value);
      }
      e.changedTouches.forEach((touch) => {
        if (isInside(touch, selectButtonRef, 0.5) && selectButtonFinger.value === -1) {
          // Select button pressed: bind finger, update value, send packet
          console.log('select button touched');
          selectButtonFinger.value = touch.id;
          selectButton.value = 1;
          const packet = [...currentSnapshot.value];
          packet[12] = 1; // 12th index for Select
          runOnJS(sendNativePacket)(packet);
        } else if (
          isInside(touch, startButtonRef, 0.5) &&
          startButtonFinger.value === -1
        ) {
          // Start button pressed: bind finger, update value, send packet
          console.log('start button touched');
          startButtonFinger.value = touch.id;
          startButton.value = 1;
          const packet = [...currentSnapshot.value];
          packet[13] = 1; // 13th index for Start
          runOnJS(sendNativePacket)(packet);
        } else if (isInside(touch, leftTrigger) && leftFinger.value === -1) {
          //finger is on left and left finger is unassigned yet
          // Record Initial Position + ID for Left

          leftInitialY.value = touch.y;
          leftShoulderMode.value = null;
          leftFinger.value = touch.id;
        } else if (isInside(touch, rightTrigger) && rightFinger.value === -1) {
          //finger is on right and right finger is unassigned
          // Record Initial Position + ID for Right
          rightInitialY.value = touch.y;
          rightShoulderMode.value = null;
          rightFinger.value = touch.id;
        } else if (
          isInside(touch, rightJoystick)
          //subtracted 15% of the hit area to make sure the user doesn't start the joystick usage too far away
          //from the joystick (that will lead to either the thumb colliding with other fingers or the user will cross the edges of the screen when using the stick)
        ) {
          // console.log("right joystick active");
          rightJoystickFinger.value = touch.id;

          rightFloatingStickCenter.value = { x: touch.x, y: touch.y };
        } else if (isInside(touch, leftJoystick)) {
          // console.log("left joystick active");
          leftJoystickFinger.value = touch.id;

          leftFloatingStickCenter.value = { x: touch.x, y: touch.y };
        } else if (isInside(touch, facePad, 1)) {
          //face pad logic

          isFacePadActive.value = true;
          facePadFinger.value = touch.id;
          // console.log("facepad active: ", isFacePadActive.value);
        } else if (isInside(touch, dPad, 1)) {
          isDpadActive.value = true;
          dPadFinger.value = touch.id;
        } else if (isInside(touch, leftL3, 0.5) && l3Finger.value === -1) {
          console.log('left l3 touched');
          l3Finger.value = touch.id;
          isL3Active.value = 1;
          activeStickButton.value = 'leftL3';
          const packet = [...currentSnapshot.value];
          packet[10] = 1;
          runOnJS(sendNativePacket)(packet);
        } else if (isInside(touch, leftR3, 0.5) && r3Finger.value === -1) {
          r3Finger.value = touch.id;
          isR3Active.value = 1;
          activeStickButton.value = 'leftR3';
          const packet = [...currentSnapshot.value];
          packet[11] = 1;
          runOnJS(sendNativePacket)(packet);
        } else if (isInside(touch, rightR3, 0.5) && r3Finger.value === -1) {
          r3Finger.value = touch.id;
          isR3Active.value = 1;
          activeStickButton.value = 'rightR3';
          const packet = [...currentSnapshot.value];
          packet[11] = 1;
          runOnJS(sendNativePacket)(packet);
        } else if (isInside(touch, rightL3, 0.5) && l3Finger.value === -1) {
          l3Finger.value = touch.id;
          isL3Active.value = 1;
          activeStickButton.value = 'rightL3';
          const packet = [...currentSnapshot.value];
          packet[10] = 1;
          runOnJS(sendNativePacket)(packet);
        } else if (touch.absoluteX >= width / 2 && touch.absoluteY >= height / 2) {
          rightJoystickFinger.value = touch.id;
          const currentTime = performance.now();
          const x = filterX.filter(touch.absoluteX, currentTime);
          const y = filterY.filter(touch.absoluteY, currentTime);
          filterX.filter(touch.absoluteX, currentTime);
          filterY.filter(touch.absoluteY, currentTime);
          filterX.filter(touch.absoluteX, currentTime);
          filterY.filter(touch.absoluteY, currentTime);
          filterX.filter(touch.absoluteX, currentTime);
          filterY.filter(touch.absoluteY, currentTime);
          currentTrackpadInfo.value = {
            x: x,
            y: y,
            time: currentTime,
            vx: 0,
            vy: 0,
          };
          console.log('trackpad touched');
        }
      });
    })
    .onTouchesMove((e, manager) => {
      // Update tutorial overlay points
      debugTouches.value = e.allTouches.map((t) => ({
        id: t.id,
        x: t.absoluteX,
        y: t.absoluteY,
      }));

      //todo- too many if else-if else statements - turn into switch
      e.allTouches.forEach((touch) => {
        if (touch.id === leftFinger.value) {
          // LEFT Finger Logic
          // Magnitude = Current Y - Initial Y (only if moving down)

          //check if left finger is still on left side or not
          if (touch.absoluteX > width / 2) {
            // triggerPullLeft.value = withSpring(0);
            triggerPullLeft.value = 0;
            buttonPressLeft.value = 0;
            leftShoulderMode.value = null;
            leftFinger.value = -1;
          } else {
            // const diff = touch.y - leftInitialY.value;
            // const diff = leftInitialY.value - touch.y;
            const diff = triggerDirectionUpwards
              ? leftInitialY.value - touch.y
              : touch.y - leftInitialY.value;
            const nextMode = diff > 0 ? 'trigger' : diff < 0 ? 'button' : null;

            if (continuousMode) {
              // Free-switching mode: the same finger can move through zero and swap roles.
              leftShoulderMode.value = nextMode;
            } else if (!leftShoulderMode.value && nextMode) {
              // Latched mode: the first non-zero movement decides what this touch is.
              // After that, crossing back through zero only cancels the active control;
              // it does not activate the other one until the finger lifts.
              leftShoulderMode.value = nextMode;
            }

            if (leftShoulderMode.value === 'trigger') {
              triggerPullLeft.value = clampTriggerPull(diff);
              buttonPressLeft.value = 0;
            } else if (leftShoulderMode.value === 'button') {
              triggerPullLeft.value = 0;
              buttonPressLeft.value = diff < 0 ? 1 : 0;
            } else {
              triggerPullLeft.value = 0;
              buttonPressLeft.value = 0;
            }
          }
        } else if (touch.id === rightFinger.value) {
          // Right Finger Logic

          //check if right finger is still on right side or not
          if (touch.absoluteX < width / 2 && touch.absoluteY < height / 2) {
            // triggerPullRight.value = withSpring(0);
            triggerPullRight.value = 0;
            buttonPressRight.value = 0;
            rightShoulderMode.value = null;
            rightFinger.value = -1;
          } else {
            //trigger and button logic
            // const diff = touch.y - rightInitialY.value;
            // const diff = rightInitialY.value - touch.y; //
            const diff = triggerDirectionUpwards
              ? rightInitialY.value - touch.y
              : touch.y - rightInitialY.value;
            const nextMode = diff > 0 ? 'trigger' : diff < 0 ? 'button' : null;

            if (continuousMode) {
              // Free-switching mode: this finger can swap between trigger and button.
              rightShoulderMode.value = nextMode;
            } else if (!rightShoulderMode.value && nextMode) {
              // Same latch logic as the left shoulder.
              rightShoulderMode.value = nextMode;
            }

            if (rightShoulderMode.value === 'trigger') {
              triggerPullRight.value = clampTriggerPull(diff);
              buttonPressRight.value = 0;
            } else if (rightShoulderMode.value === 'button') {
              triggerPullRight.value = 0;
              buttonPressRight.value = diff < 0 ? 1 : 0;
            } else {
              triggerPullRight.value = 0;
              buttonPressRight.value = 0;
            }
          }
        } else if (
          touch.id === rightJoystickFinger.value ||
          touch.id === leftJoystickFinger.value
        ) {
          //check if the touch pointer belongs to right or left joystick
          if (touch.id === rightJoystickFinger.value) {
            if (!trackpadModeSV.value) {
              rightKnobOffset.value = calculateOffset(
                touch,
                rightFloatingStickCenter.value,

                rightJoystickMeasurements.value
              );
            } else {
              if (currentTrackpadInfo.value === null) {
                const currentTime = performance.now();
                let x = touch.absoluteX;
                let y = touch.absoluteY;
                x = filterX.filter(x, currentTime); //apply one euro filter
                y = filterY.filter(y, currentTime); //apply one euro filter
                currentTrackpadInfo.value = {
                  x: x,
                  y: y,
                  time: currentTime,
                  vx: 0,
                  vy: 0,
                };
              } else {
                const currentTime = performance.now();
                const previousInfo = currentTrackpadInfo.value;
                let x = touch.absoluteX;
                let y = touch.absoluteY;
                if (true) {
                  try {
                    x = filterX.filter(x, currentTime); //apply one euro filter
                    y = filterY.filter(y, currentTime); //apply one euro filter
                  } catch (error) {
                    console.log('error occured');
                  }
                }
                const dxTravelled = x - previousInfo.x;
                const dyTravelled = y - previousInfo.y;
                const timeTaken = currentTime - previousInfo.time;
                const currentVx = dxTravelled / timeTaken;
                const currentVy = dyTravelled / timeTaken;

                // const effectiveVx = filterVx(currentVx, currentTime);
                // const effectiveVy = filterVy(currentVy, currentTime);
                const effectiveVx = currentVx; //no filter
                const effectiveVy = currentVy; //no filter

                // const effectiveVx = alpha * currentVx + (1 - alpha) * previousInfo.vx; //exponential moving average (first order low pass filter)
                // const effectiveVy = alpha * currentVy + (1 - alpha) * previousInfo.vy; //exponential moving average (first order low pass filter)

                // const cappedVx = Math.min(currentVx, velocityCap);
                // const cappedVy = Math.min(currentVy, velocityCap);
                // console.log('current: ', currentVx, currentVy);
                // console.log('effective: ', effectiveVx, effectiveVy);
                // const currentVelocity = Math.hypot(currentVx, currentVy); //using raw values
                const currentVelocity = Math.hypot(effectiveVx, effectiveVy); //using smoothened values

                const velocityCap = baseVelocityCap - (sensitivitySV.value - 10) / 100;
                // const joystickVelocity =
                //   currentVelocity > velocityCap ? velocityCap : currentVelocity;

                // const joystickVelocity =
                //   velocityCap * Math.tanh((gainSV.value * currentVelocity) / velocityCap); //tanh - double sigmoid

                const joystickVelocity =
                  (velocityCap * ((1 + gainSV.value) * currentVelocity)) /
                  (velocityCap + gainSV.value * currentVelocity); //padé

                console.log('-'.repeat(joystickVelocity * 500));

                // const joystickVelocity =
                //   currentVelocity > velocityCap ? velocityCap : currentVelocity;

                // const velocityCap = 0.1;
                // one easy option is to use aim mode - smartly changing sensitivity when aim buttom (usually RT) is active

                let joystickRadius = (joystickVelocity / velocityCap) * 40; //joystick diameter is 80
                // if (joystickRadius < 0.1 * 40) {
                //   joystickRadius = 0.2 * 40;
                // }

                // Proper Anti-Deadzone: Only apply minimum force IF the user is actually moving
                // If they are perfectly still (radius ~ 0), let it be 0 to prevent artificial stick drift.
                if (joystickRadius > 0.02 * 40 && joystickRadius < 0.1 * 40) {
                  // Smoothly scale up low movements to a minimum threshold so games register it
                  joystickRadius = 0.2 * 40;
                }

                //calculate joystick angle
                // const joystickAngle = Math.atan2(currentVy, currentVx); //using raw values
                const joystickAngle = Math.atan2(effectiveVy, effectiveVx); //using treated values
                //calculate actual knob offset
                const knobOffset = {
                  x: joystickRadius * Math.cos(joystickAngle),
                  y: joystickRadius * Math.sin(joystickAngle),
                };
                // console.log(knobOffset);
                rightKnobOffset.value = knobOffset;

                //update trackpad info with current coords
                currentTrackpadInfo.value = {
                  x,
                  y,
                  time: currentTime,
                  vx: effectiveVx,
                  vy: effectiveVy,
                  // vx: currentVx,
                  // vy: currentVy,
                };
              }
            }

            // console.log(rightKnobOffset.value);
          } else {
            leftKnobOffset.value = calculateOffset(
              touch,
              leftFloatingStickCenter.value,

              leftJoystickMeasurements.value
            );
            // runOnJS(sendNativePacket)(releasePacket);
          }
        } else if (
          touch.id === facePadFinger.value &&
          !isInside(touch, faceButtons.center, 0)
        ) {
          //facepad logic
          if (isInside(touch, faceButtons.x)) {
            activeFaceButton.value = 'x';
          } else if (isInside(touch, faceButtons.y)) {
            activeFaceButton.value = 'y';
          } else if (isInside(touch, faceButtons.a)) {
            activeFaceButton.value = 'a';
          } else if (isInside(touch, faceButtons.b)) {
            activeFaceButton.value = 'b';
          } else {
            activeFaceButton.value = null;
          }
        } else if (
          touch.id === dPadFinger.value &&
          !isInside(touch, dPadButtons.center, 1)
        ) {
          //dPad logic
          if (isInside(touch, dPadButtons.left)) {
            activeDpadButton.value = 'left';
          } else if (isInside(touch, dPadButtons.up)) {
            activeDpadButton.value = 'up';
          } else if (isInside(touch, dPadButtons.down)) {
            activeDpadButton.value = 'down';
          } else if (isInside(touch, dPadButtons.right)) {
            activeDpadButton.value = 'right';
          } else {
            activeDpadButton.value = null;
          }
        }
      });
      // packet logic -

      // 2) JS helper

      if (previousSnapshot.value) {
        // 1. Normal Operation: Only send if data changed
        if (!isSame.value) {
          previousSnapshot.value = [...currentSnapshot.value];
          totalChanges.value += 1;

          const gap = performance.now() - lastPacketTime.value;
          minDuration.value =
            minDuration.value === 0 ? gap : Math.min(minDuration.value, gap);

          lastPacketTime.value = performance.now();
          noOfPackets.value += 1;
          runOnJS(sendNativePacket)(currentSnapshot.value);

          // console.log(currentSnapshot.value);
          // console.log('🕹️ Movement Packet:', lastPacketTime.value, performance.now());
          // console.log('last sent: ', currentSnapshot.value); -------
        } else {
          // console.log('not sent : ', currentSnapshot.value);
        }
      } else {
        // 2. First Run: previousSnapshot is null, so we must send the first one!
        previousSnapshot.value = [...currentSnapshot.value];
        // runOnJS(console.log)('snapshot', currentSnapshot.value);

        lastPacketTime.value = performance.now();
        noOfPackets.value += 1;
        // 3) inside your worklet callback (onTouchesMove) when snapshot changed
        runOnJS(sendNativePacket)(currentSnapshot.value);

        console.log('🚀 First Packet Sent');
      }
    })
    .onTouchesUp((e, manager) => {
      // Exclude the lifted touch to ensure the icon disappears immediately
      const activeTouches = e.allTouches.filter(
        (t) => !e.changedTouches.some((c) => c.id === t.id)
      );
      debugTouches.value = activeTouches.map((t) => ({
        id: t.id,
        x: t.absoluteX,
        y: t.absoluteY,
      }));

      // If a finger lifts, we figure out which one it was based on location
      // and reset that specific trigger
      e.changedTouches.forEach((touch) => {
        if (touch.id == leftFinger.value) {
          triggerPullLeft.value = 0; //shall withSpring() be used to mimic actual trigger on a controller ?
          buttonPressLeft.value = 0;
          leftShoulderMode.value = null;
          leftFinger.value = -1;

          // send centering packet
          const cancellationPacket = getCancellationPacket('left shoulder');
          runOnJS(sendNativePacket)(cancellationPacket);
        } else if (touch.id == rightFinger.value) {
          triggerPullRight.value = 0; //shall withSpring() be used to mimic actual button on a controller ?
          buttonPressRight.value = 0;
          rightShoulderMode.value = null;
          rightFinger.value = -1;

          // send centering packet
          const cancellationPacket = getCancellationPacket('right shoulder');
          runOnJS(sendNativePacket)(cancellationPacket);
        } else if (touch.id == leftJoystickFinger.value) {
          // console.log("left joystick inactive");
          leftJoystickFinger.value = -1;
          // leftKnobOffset.value = withSpring({ x: 0, y: 0 });
          leftKnobOffset.value = { x: 0, y: 0 };
          leftFloatingStickCenter.value = { x: 0, y: 0 };
          //send cancellation packet
          const cancellationPacket = getCancellationPacket('left stick');
          runOnJS(sendNativePacket)(cancellationPacket);
        } else if (touch.id == rightJoystickFinger.value) {
          // console.log("right joystick inactive");
          rightJoystickFinger.value = -1;
          // rightKnobOffset.value = withSpring({ x: 0, y: 0 });
          rightKnobOffset.value = { x: 0, y: 0 };
          rightFloatingStickCenter.value = { x: 0, y: 0 };
          if (trackpadModeSV.value) {
            currentTrackpadInfo.value = null;
            filterX.reset();
            filterY.reset();
          }

          // send centering packet
          const cancellationPacket = getCancellationPacket('right stick');
          runOnJS(sendNativePacket)(cancellationPacket);
        } else if (touch.id == facePadFinger.value) {
          isFacePadActive.value = false;
          facePadFinger.value = -1;
          // console.log("active facepad button: ", activeFaceButton.value);
          activeFaceButton.value = null;

          // send cancellation packet
          const cancellationPacket = getCancellationPacket('facepad');
          runOnJS(sendNativePacket)(cancellationPacket);

          // console.log("facepad active : ", isFacePadActive.value);
        } else if (touch.id == dPadFinger.value) {
          isDpadActive.value = false;
          dPadFinger.value = -1;
          // console.log("active dPad button: ", activeDpadButton.value);
          activeDpadButton.value = null;

          // send centering packet
          const cancellationPacket = getCancellationPacket('dpad');
          runOnJS(sendNativePacket)(cancellationPacket);

          // console.log("facepad active : ", isDpadActive.value);
        } else if (touch.id == l3Finger.value) {
          isL3Active.value = 0;
          l3Finger.value = -1;
          if (
            activeStickButton.value === 'leftL3' ||
            activeStickButton.value === 'rightL3'
          ) {
            activeStickButton.value = null;
          }

          // send cancellation packet
          const cancellationPacket = getCancellationPacket('l3');
          runOnJS(sendNativePacket)(cancellationPacket);
        } else if (touch.id == r3Finger.value) {
          isR3Active.value = 0;
          r3Finger.value = -1;
          if (
            activeStickButton.value === 'leftR3' ||
            activeStickButton.value === 'rightR3'
          ) {
            activeStickButton.value = null;
          }

          // send cancellation packet
          const cancellationPacket = getCancellationPacket('r3');
          runOnJS(sendNativePacket)(cancellationPacket);
        } else if (touch.id == selectButtonFinger.value) {
          // Select button released: reset state and dispatch cancellation
          selectButton.value = 0;
          selectButtonFinger.value = -1;
          const cancellationPacket = getCancellationPacket('select');
          runOnJS(sendNativePacket)(cancellationPacket);
        } else if (touch.id == startButtonFinger.value) {
          // Start button released: reset state and dispatch cancellation
          startButton.value = 0;
          startButtonFinger.value = -1;
          const cancellationPacket = getCancellationPacket('start');
          runOnJS(sendNativePacket)(cancellationPacket);
        }
      });

      // if (e.allTouches.length === 0) {
      //   manager.end();
      // }

      if (e.numberOfTouches === 0) {
        // end the timer
        if (isActive.value) {
          endTime.value = performance.now();
          isActive.value = false;
          console.log(
            'cps : ',
            totalChanges.value / (endTime.value / 1000 - startTime.value / 1000),
            'min duration between changes: ',
            minDuration.value,
            'packets sent : ',
            noOfPackets.value
          );
          totalChanges.value = 0;
          minDuration.value = 0;
          // 3) inside your worklet callback (onTouchesMove) when snapshot changed
          // const releasePacket = [255, 255, 255, 255, 255, 255, 255, 255, 255, 255];
          const releasePacket = Array(14).fill(65535);
          runOnJS(sendNativePacket)(releasePacket);
          runOnJS(sendNativePacket)(releasePacket);
          runOnJS(sendNativePacket)(releasePacket);
          // console.log('release packet sent');
          // console.log('no of packets sent: ', noOfPackets.value);
          noOfPackets.value = 0;
        }
        manager.end();
      }
    })
    .onTouchesCancelled((e, manager) => {
      // Ensure the touch icon disappears if the system cancels the gesture
      const activeTouches = e.allTouches.filter(
        (t) => !e.changedTouches.some((c) => c.id === t.id)
      );
      debugTouches.value = activeTouches.map((t) => ({
        id: t.id,
        x: t.absoluteX,
        y: t.absoluteY,
      }));
    });

  const rightDisappearingJoystick = useAnimatedStyle(() => {
    return {
      opacity: isFacePadActive.value ? 0 : withTiming(1, { duration: 200 }),
    };
  });

  const rightJoystickOpacityStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(trackpadModeSV.value ? 0 : 1, { duration: 200 }),
    };
  });

  const leftDisappearingJoystick = useAnimatedStyle(() => {
    return {
      opacity: isDpadActive.value ? 0 : withTiming(1, { duration: 200 }),
    };
  });

  const rightDisappearingCluster = useAnimatedStyle(() => {
    return {
      opacity: rightJoystickFinger.value !== -1 ? 0 : withTiming(1, { duration: 200 }),
    };
  });

  const leftDisappearingCluster = useAnimatedStyle(() => {
    return {
      opacity: leftJoystickFinger.value !== -1 ? 0 : withTiming(1, { duration: 200 }),
    };
  });

  const centerButtonsDisappearingStyle = useAnimatedStyle(() => {
    return {
      opacity:
        isFacePadActive.value || isDpadActive.value
          ? 0
          : withTiming(1, { duration: 200 }),
    };
  });

  const hiddenIconStyleLeft = useAnimatedStyle(() => {
    if (rightJoystickFinger.value !== -1) {
      return {
        transform: [{ translateY: withTiming(-70, { duration: 150 }) }],
      };
    } else {
      return { transform: [{ translateY: withTiming(0, { duration: 150 }) }] };
    }
  });

  const hiddenIconStyleRight = useAnimatedStyle(() => {
    if (leftJoystickFinger.value !== -1) {
      return {
        transform: [{ translateY: withTiming(-70, { duration: 150 }) }],
      };
    } else {
      return { transform: [{ translateY: withTiming(0, { duration: 150 }) }] };
    }
  });

  const iconColor = colors.cloudGamepadText;

  const getStickButtonOpacity = (
    buttonName,
    activeBtn,
    leftStickActive,
    rightStickActive
  ) => {
    'worklet';
    let targetOpacity = 1;

    if (buttonName === 'leftL3' && activeBtn === 'rightL3') targetOpacity = 0;
    if (buttonName === 'rightL3' && activeBtn === 'leftL3') targetOpacity = 0;
    if (buttonName === 'leftR3' && activeBtn === 'rightR3') targetOpacity = 0;
    if (buttonName === 'rightR3' && activeBtn === 'leftR3') targetOpacity = 0;

    if (buttonName === 'leftR3' && rightStickActive === -1) targetOpacity = 0;
    if (buttonName === 'rightL3' && leftStickActive === -1) targetOpacity = 0;

    return {
      opacity: withTiming(targetOpacity, { duration: 150 }),
    };
  };

  const getStickButtonHighlight = (buttonName, activeBtn) => {
    'worklet';
    const isActive = activeBtn === buttonName;
    const activeColor = '#979ca2a7';
    const inactiveColor = '#979ca200';
    const basePadding = 20; // 40 / 2
    const activePadding = basePadding + 7;

    return {
      position: 'absolute',
      borderRadius: 999,
      backgroundColor: withTiming(isActive ? activeColor : inactiveColor, {
        duration: 150,
      }),
      padding: withTiming(isActive ? activePadding : basePadding, { duration: 150 }),
    };
  };

  const leftL3Opacity = useAnimatedStyle(() =>
    getStickButtonOpacity(
      'leftL3',
      activeStickButton.value,
      leftJoystickFinger.value,
      rightJoystickFinger.value
    )
  );
  const leftL3Highlight = useAnimatedStyle(() =>
    getStickButtonHighlight('leftL3', activeStickButton.value)
  );

  const leftR3Opacity = useAnimatedStyle(() =>
    getStickButtonOpacity(
      'leftR3',
      activeStickButton.value,
      leftJoystickFinger.value,
      rightJoystickFinger.value
    )
  );
  const leftR3Highlight = useAnimatedStyle(() =>
    getStickButtonHighlight('leftR3', activeStickButton.value)
  );

  const rightR3Opacity = useAnimatedStyle(() =>
    getStickButtonOpacity(
      'rightR3',
      activeStickButton.value,
      leftJoystickFinger.value,
      rightJoystickFinger.value
    )
  );
  const rightR3Highlight = useAnimatedStyle(() =>
    getStickButtonHighlight('rightR3', activeStickButton.value)
  );

  const rightL3Opacity = useAnimatedStyle(() =>
    getStickButtonOpacity(
      'rightL3',
      activeStickButton.value,
      leftJoystickFinger.value,
      rightJoystickFinger.value
    )
  );
  const rightL3Highlight = useAnimatedStyle(() =>
    getStickButtonHighlight('rightL3', activeStickButton.value)
  );

  // Shared style logic for Menu buttons (Select / Start)
  const getMenuButtonStyle = (isActive) => {
    'worklet';
    const activeColor = '#979ca2a7';
    const inactiveColor = '#979ca200';

    // Dynamically scale the highlight ring based on the new MENU_BUTTON_SIZE constant
    const basePadding = MENU_BUTTON_SIZE / 2;
    const activePadding = basePadding + 7; // Adds a 7px expanding ring around the edge

    return {
      position: 'absolute',
      borderRadius: 999, // Keeps it perfectly circular at any size
      backgroundColor: withTiming(isActive ? activeColor : inactiveColor, {
        duration: 150,
      }),
      padding: withTiming(isActive ? activePadding : basePadding, { duration: 150 }),
    };
  };

  const selectHighlight = useAnimatedStyle(() =>
    getMenuButtonStyle(selectButton.value === 1)
  );
  const startHighlight = useAnimatedStyle(() =>
    getMenuButtonStyle(startButton.value === 1)
  );

  const gamepadTester = 'https://hardwaretester.com/gamepad';

  const [gamepadToggled, setGamepadToggled] = useState(false);
  const [uri, setUri] = useState(websiteUrl || gamepadTester);

  // Temporary measure to clean gamepad-tester.net
  const temporaryCleanScript =
    uri && uri.includes('gamepad-tester.net')
      ? `
      var attempts = 0;
      var cleanInterval = setInterval(function() {
        var el = document.getElementsByClassName('block sm:w-92.5 min-[360px]:w-78 min-[400px]:w-84')[0];
        if (el) {
          document.body.innerHTML = '';
          document.body.appendChild(el);
          document.body.style.display = 'flex';
          document.body.style.flexDirection = 'column';
          document.body.style.justifyContent = 'flex-start';
          document.body.style.paddingTop = '40px';
          document.body.style.alignItems = 'center';
          document.body.style.minHeight = '100vh';
          el.style.transform = 'scale(0.6)';
          el.style.transformOrigin = 'top center';
          clearInterval(cleanInterval);
        }
        attempts++;
        if (attempts > 20) clearInterval(cleanInterval);
      }, 500);
    `
      : '';

  //apply only when platform is ios and website requires pwa (like nvidia)
  //   const PWA_CLEAN_SPOOF = `
  // (function() {
  //   // 1. The PWA "Standalone" Flag
  //   Object.defineProperty(navigator, 'standalone', {
  //     get: () => true,
  //     configurable: true
  //   });

  //   // 2. The CSS Media Query Spoof
  //   const originalMatchMedia = window.matchMedia;
  //   window.matchMedia = function(query) {
  //     if (query.includes('display-mode: standalone') || query.includes('display-mode: fullscreen')) {
  //       return {
  //         matches: true,
  //         media: query,
  //         onchange: null,
  //         addEventListener: () => {},
  //         removeEventListener: () => {},
  //         addListener: () => {},
  //         removeListener: () => {},
  //         dispatchEvent: () => false,
  //       };
  //     }
  //     return originalMatchMedia.call(window, query);
  //   };

  //   // 3. Gamepad API Support
  //   // Some WebViews lazily load the gamepad API. This ensures it's "visible" to the site scripts.
  //   if (!navigator.getGamepads) {
  //     navigator.getGamepads = () => [];
  //   }

  //   true;
  // })();
  // `;

  const PlatformSpecificUA = Platform.select({
    ios: 'Mozilla/5.0 (iPad; CPU OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1',
    android:
      'Mozilla/5.0 (Linux; Android 13; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.5845.163 Mobile Safari/537.36',
  });

  useAnimatedReaction(
    () => isMenuExpanded.value,
    (expanded, prev) => {
      if (prev === null || expanded === prev) return;

      const targetWidth = expanded ? EXPANDED_WIDTH : CLOSED_WIDTH;
      const widthDiff = targetWidth - menuWidth.value;

      menuWidth.value = targetWidth;

      const maxX = width - BOUNDARY - targetWidth;
      const maxY = height - BOUNDARY - MENU_HEIGHT;

      let nextX = menuX.value - widthDiff / 2;
      nextX = Math.max(BOUNDARY, Math.min(nextX, maxX));
      menuX.value = withTiming(nextX);

      if (menuY.value > maxY) {
        menuY.value = withTiming(Math.max(BOUNDARY, maxY));
      } else if (menuY.value < BOUNDARY) {
        menuY.value = withTiming(BOUNDARY);
      }
    }
  );

  useEffect(() => {
    const targetWidth = isMenuExpanded.value ? EXPANDED_WIDTH : CLOSED_WIDTH;
    if (isFirstLandscape.current && width > height) {
      menuX.value = width / 2 - targetWidth / 2;
      menuY.value = BOUNDARY;
      isFirstLandscape.current = false;
    } else {
      const maxX = width - BOUNDARY - targetWidth;
      const maxY = height - BOUNDARY - MENU_HEIGHT;
      if (menuX.value > maxX) {
        menuX.value = withTiming(Math.max(BOUNDARY, maxX));
      }
      if (menuY.value > maxY) {
        menuY.value = withTiming(Math.max(BOUNDARY, maxY));
      }
    }
  }, [width, height]);

  const menuPanGesture = Gesture.Pan()
    .enabled(true)
    .minDistance(10) // Prevents Pan from stealing taps if your finger wiggles slightly
    .onChange((e) => {
      const maxX = width - BOUNDARY - menuWidth.value;
      const maxY = height - BOUNDARY - MENU_HEIGHT;
      menuX.value = Math.max(BOUNDARY, Math.min(menuX.value + e.changeX, maxX));
      menuY.value = Math.max(BOUNDARY, Math.min(menuY.value + e.changeY, maxY));
    });

  const menuAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: menuX.value }, { translateY: menuY.value }],
  }));

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    width: withTiming(isMenuExpanded.value ? EXPANDED_WIDTH : CLOSED_WIDTH),
    backgroundColor: colors.cloudGamepadBase,
  }));

  const expandedContentStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isMenuExpanded.value ? 1 : 0),
  }));

  const closeIconStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isMenuExpanded.value ? 1 : 0),
    transform: [{ rotate: withTiming(isMenuExpanded.value ? '0deg' : '-90deg') }],
    position: 'absolute',
  }));

  const hamburgerIconStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isMenuExpanded.value ? 0 : 1),
    transform: [{ rotate: withTiming(isMenuExpanded.value ? '90deg' : '0deg') }],
    position: 'absolute',
  }));

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar hidden={true} />
      {/* <LiquidBackground /> */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#182129' }]}>
        {/* <LiquidBackground /> */}
        <View style={{ flex: 1 }}>
          <WebView
            style={{ flex: 1 }}
            source={{
              uri,
              headers: { 'X-Requested-With': '' },
            }}
            injectedJavaScript={initialiseGamepad + temporaryCleanScript}
            ref={webViewRef}
            // userAgent={GOOGLE_BYPASS_UA}
            userAgent={PlatformSpecificUA}
            onMessage={(event) => {}}
            // Tells iOS to request the desktop site at the network level
            preferredContentMode="desktop"
            injectedJavaScriptBeforeContentLoaded={PWA_CLEAN_SPOOF}
            // Standard requirements
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scalesPageToFit={false}
            allowsInlineMediaPlayback={true} // CRITICAL: Keeps video inside the webpage
            mediaPlaybackRequiresUserAction={false}
            // Android specific text scaling (100 is default)
            textZoom={95}
          />
        </View>
      </View>

      <GestureDetector gesture={menuPanGesture}>
        <Animated.View style={[styles.topBar, menuAnimatedStyle]}>
          <Animated.View style={[styles.pillBar, pillAnimatedStyle]}>
            <Pressable
              style={styles.iconButton}
              onPress={() => {
                setGamepadToggled((prev) => !prev);
              }}
            >
              <Ionicons
                name="game-controller-outline"
                size={26}
                color={colors.cloudGamepadText}
              />
              {gamepadToggled && (
                <SimpleLineIcons
                  name="ban"
                  size={40}
                  color={colors.cloudGamepadText}
                  style={styles.banIcon}
                />
              )}
            </Pressable>

            <Animated.View
              style={[
                { flexDirection: 'row', alignItems: 'center', gap: 15 },
                expandedContentStyle,
              ]}
            >
              <Pressable
                style={styles.iconButton}
                onPress={() => {
                  if (!isMenuExpanded.value) return;
                  setOnboardingVisible(true);
                }}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={32}
                  color={colors.cloudGamepadText}
                />
              </Pressable>

              <Pressable
                style={styles.iconButton}
                onPress={() => {
                  if (!isMenuExpanded.value) return;
                  setSettingsVisible(true);
                }}
              >
                <Ionicons
                  name="settings-outline"
                  size={28}
                  color={colors.cloudGamepadText}
                />
              </Pressable>

              <Pressable
                style={styles.iconButton}
                onPress={() => {
                  if (!isMenuExpanded.value) return;
                  router.back();
                }}
              >
                <Ionicons name="exit-outline" size={32} color={colors.cloudGamepadText} />
              </Pressable>
            </Animated.View>

            <Pressable
              style={[styles.iconButton, { position: 'absolute', right: 10 }]}
              onPress={() => {
                isMenuExpanded.value = !isMenuExpanded.value;
              }}
            >
              <Animated.View style={closeIconStyle}>
                <Ionicons name="close" size={32} color={colors.cloudGamepadText} />
              </Animated.View>
              <Animated.View style={hamburgerIconStyle}>
                <Ionicons name="menu" size={32} color={colors.cloudGamepadText} />
              </Animated.View>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      {gamepadToggled && (
        <GestureDetector gesture={manualGesture}>
          <View
            style={{
              flex: 1,
              flexDirection: 'column',
              // backgroundColor: "#0e0e0ecc",
            }}
          >
            {/* upper half of the screen that contains triggers */}
            <View style={[styles.upperContainer]}>
              {/* left trigger */}
              <Trigger
                trigger={leftTrigger}
                triggerPull={triggerPullLeft}
                buttonPress={buttonPressLeft}
                triggerSide={'left'}
                triggerLength={triggerLength}
              />
              {/* <View
              style={{
                width: " 6",
                height: "150",
                backgroundColor: "#cecece",
                borderBottomLeftRadius: 20,
                borderBottomRightRadius: 20,
              }}
            ></View> */}
              {/* right trigger */}
              <Trigger
                trigger={rightTrigger}
                triggerPull={triggerPullRight}
                buttonPress={buttonPressRight}
                triggerSide={'right'}
                triggerLength={triggerLength}
              />
            </View>
            {/* lower half of the screen that contains buttons and joysticks */}

            <View style={styles.lowerContainer}>
              <Animated.View
                style={[styles.r3l3, leftDisappearingCluster, leftDisappearingJoystick]}
              >
                <Animated.View
                  style={[{ zIndex: 1 }, styles.r3l3iconParent, leftL3Opacity]}
                >
                  <Animated.View style={leftL3Highlight} />
                  <View style={styles.stickButtonInner}>
                    {/* <L3Icon width={40} height={40} ref={leftL3} color={iconColor} /> */}
                    <Animated.Text
                      ref={leftL3}
                      style={[styles.stickButtonText, { color: iconColor }]}
                    >
                      LS
                    </Animated.Text>
                  </View>
                </Animated.View>

                <Animated.View
                  style={[
                    { zIndex: -1 },
                    styles.r3l3iconParent,
                    leftR3Opacity,
                    hiddenIconStyleLeft,
                  ]}
                >
                  <Animated.View style={leftR3Highlight} />
                  <View style={styles.stickButtonInner}>
                    {/* <R3Icon width={40} height={40} ref={leftR3} color={iconColor} /> */}
                    <Animated.Text
                      ref={leftR3}
                      style={[styles.stickButtonText, { color: iconColor }]}
                    >
                      RS
                    </Animated.Text>
                  </View>
                </Animated.View>
              </Animated.View>

              <View style={styles.centerWrapper}>
                <Animated.View style={[leftDisappearingJoystick, {}]}>
                  <Joystick
                    joystick={leftJoystick}
                    floatingStickCenter={leftFloatingStickCenter}
                    knobOffset={leftKnobOffset}
                    joystickMeasurements={leftJoystickMeasurements}
                  />
                </Animated.View>

                <View style={styles.centerCluster}>
                  <Animated.View style={leftDisappearingCluster}>
                    <Buttons
                      buttons={dPadButtons}
                      cluster={dPad}
                      isClusterActive={isDpadActive}
                      dPadButtonsMeasurements={dPadButtonsMeasurements}
                      activeButton={activeDpadButton}
                      clusterType={'dpad'}
                    />
                    {/* Select button correctly placed under D-Pad */}
                  </Animated.View>
                  <Animated.View
                    style={[
                      {
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'flex-start',
                        alignSelf: 'flex-start',
                        gap: 40,
                        flex: 1,
                        marginTop: -1 * (MENU_BUTTON_SIZE + (-1 * height * 0.52) / 2), // Tweak this negative value to move it further up
                        // borderColor: 'black',
                        // borderWidth: 2,
                        // maginBottom: 180,
                        // paddingBottom: 180,
                      },
                      centerButtonsDisappearingStyle,
                    ]}
                  >
                    <Animated.View
                      style={styles.menuButtonContainer}
                      ref={selectButtonRef}
                    >
                      <Animated.View style={selectHighlight} />
                      <View
                        style={{
                          width: MENU_BUTTON_SIZE,
                          height: MENU_BUTTON_SIZE,
                          borderRadius: MENU_BUTTON_SIZE / 2,
                          justifyContent: 'center',
                          alignItems: 'center',
                          backgroundColor: colors.cloudGamepadBase,
                        }}
                      >
                        <Ionicons
                          name="albums-outline"
                          size={20}
                          color={colors.cloudGamepadText}
                        />
                      </View>
                    </Animated.View>
                    <Animated.View
                      style={styles.menuButtonContainer}
                      ref={startButtonRef}
                    >
                      <Animated.View style={startHighlight} />
                      <View
                        style={{
                          width: MENU_BUTTON_SIZE,
                          height: MENU_BUTTON_SIZE,
                          borderRadius: MENU_BUTTON_SIZE / 2,
                          justifyContent: 'center',
                          alignItems: 'center',
                          backgroundColor: colors.cloudGamepadBase,
                        }}
                      >
                        <Ionicons name="menu" size={20} color={colors.cloudGamepadText} />
                      </View>
                    </Animated.View>
                  </Animated.View>
                  <Animated.View style={rightDisappearingCluster}>
                    <Buttons
                      buttons={faceButtons}
                      cluster={facePad}
                      isClusterActive={isFacePadActive}
                      faceButtonsMeasurements={faceButtonsMeasurements}
                      activeButton={activeFaceButton}
                      clusterType={'facepad'}
                    />
                    {/* Start button correctly placed under Facepad */}
                  </Animated.View>
                </View>

                <Animated.View
                  style={[rightDisappearingJoystick]}
                  collapsable={false}
                  ref={trackpad}
                >
                  <Animated.View style={[{ flex: 1 }, rightJoystickOpacityStyle]}>
                    <Joystick
                      joystick={rightJoystick}
                      floatingStickCenter={rightFloatingStickCenter}
                      knobOffset={rightKnobOffset}
                      joystickMeasurements={rightJoystickMeasurements}
                    />
                  </Animated.View>
                </Animated.View>
              </View>

              <Animated.View
                style={[styles.r3l3, rightDisappearingCluster, rightDisappearingJoystick]}
              >
                <Animated.View
                  style={[{ zIndex: 1 }, styles.r3l3iconParent, rightR3Opacity]}
                >
                  <Animated.View style={rightR3Highlight} />
                  <View style={styles.stickButtonInner}>
                    {/* <R3Icon width={40} height={40} ref={rightR3} color={iconColor} /> */}
                    <Animated.Text
                      ref={rightR3}
                      style={[styles.stickButtonText, { color: iconColor }]}
                    >
                      RS
                    </Animated.Text>
                  </View>
                </Animated.View>

                <Animated.View
                  style={[
                    { zIndex: -1 },
                    styles.r3l3iconParent,
                    rightL3Opacity,
                    hiddenIconStyleRight,
                  ]}
                >
                  <Animated.View style={rightL3Highlight} />
                  <View style={styles.stickButtonInner}>
                    {/* <L3Icon ref={rightL3} width={40} height={40} color={iconColor} /> */}
                    <Animated.Text
                      ref={rightL3}
                      style={[styles.stickButtonText, { color: iconColor }]}
                    >
                      LS
                    </Animated.Text>
                  </View>
                </Animated.View>
              </Animated.View>
            </View>
          </View>
        </GestureDetector>
      )}

      <Modal
        visible={settingsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSettingsVisible(false)}
        // Required for iOS: Prevents the app from forcibly rotating back to portrait mode
        // when the modal is opened while the device is in landscape mode.
        supportedOrientations={[
          'portrait',
          'landscape',
          'landscape-left',
          'landscape-right',
        ]}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings</Text>
              <Pressable onPress={() => setSettingsVisible(false)}>
                <Ionicons name="close" size={24} color="#1C212A" />
              </Pressable>
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Right Stick Mode</Text>
              <View style={styles.segmentedControl}>
                <Pressable
                  style={[styles.segmentButton, trackpadMode && styles.segmentActive]}
                  onPress={() => {
                    setTrackpadMode(true);
                    trackpadModeSV.value = true;
                  }}
                >
                  <Text
                    style={[styles.segmentText, trackpadMode && styles.segmentTextActive]}
                  >
                    Swiping
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.segmentButton, !trackpadMode && styles.segmentActive]}
                  onPress={() => {
                    setTrackpadMode(false);
                    trackpadModeSV.value = false;
                  }}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      !trackpadMode && styles.segmentTextActive,
                    ]}
                  >
                    Joystick
                  </Text>
                </Pressable>
              </View>
            </View>

            {trackpadMode && (
              <>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Sensitivity</Text>
                  <View style={styles.stepperControl}>
                    <Pressable
                      style={styles.stepperButton}
                      onPress={() => {
                        const newSens = Math.max(0, sensitivity - 1);
                        setSensitivity(newSens);
                        sensitivitySV.value = newSens;
                      }}
                    >
                      <Ionicons name="remove" size={20} color="#1C212A" />
                    </Pressable>
                    <Text style={styles.stepperValue}>{sensitivity}</Text>
                    <Pressable
                      style={styles.stepperButton}
                      onPress={() => {
                        const newSens = Math.min(sensitivityMax, sensitivity + 1);
                        setSensitivity(newSens);
                        sensitivitySV.value = newSens;
                      }}
                    >
                      <Ionicons name="add" size={20} color="#1C212A" />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Mode</Text>
                  <View style={styles.segmentedControl}>
                    {Object.keys(GAIN_PROFILES).map((profileKey) => {
                      const profileValue = GAIN_PROFILES[profileKey];
                      const isActive = gain === profileValue;
                      return (
                        <Pressable
                          key={profileKey}
                          style={[styles.segmentButton, isActive && styles.segmentActive]}
                          onPress={() => {
                            setGain(profileValue);
                            gainSV.value = profileValue;
                          }}
                        >
                          <Text
                            style={[
                              styles.segmentText,
                              isActive && styles.segmentTextActive,
                            ]}
                          >
                            {profileKey === 'fps'
                              ? 'FPS'
                              : profileKey.charAt(0).toUpperCase() + profileKey.slice(1)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <OnboardingModal
        visible={onboardingVisible}
        onClose={() => setOnboardingVisible(false)}
      />

      {/* Render up to 5 multi-touch indicators */}
      {isTouchVisible &&
        [0, 1, 2, 3, 4].map((i) => (
          <TouchCursor key={i} index={i} debugTouches={debugTouches} />
        ))}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  upperContainer: {
    flexDirection: 'row',
    flex: 1.2,
  },
  upperInnerContainer: {
    flex: 1,
    paddingHorizontal: 80,
    paddingVertical: 30,
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  lowerContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },

  centerCluster: {
    flexDirection: 'row',

    minWidth: 260,
    height: 100,
    // backgroundColor: 'blue',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  centerWrapper: {
    gap: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  r3l3: {
    width: 60,
    height: 60,
    borderRadius: 30,
    // backgroundColor: 'blue',
    // alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: 20 }],
  },

  r3l3iconParent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cloudGamepadBase,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickButtonText: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 15,
    width: 40,
    height: 40,
    lineHeight: 40,
  },
  menuButtonContainer: {
    width: MENU_BUTTON_SIZE,
    height: MENU_BUTTON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  urlBar: {
    borderRadius: 999,
    paddingHorizontal: 15,
    minHeight: 42,
    justifyContent: 'center',
    backgroundColor: '#c2c2c2d0',
  },
  pillBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 15,
    overflow: 'hidden',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urlInput: {
    color: 'black',
    fontSize: 18,
    textAlign: 'center',
    padding: 0,
  },
  banIcon: {
    position: 'absolute',
    zIndex: 1000,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: 260,
    backgroundColor: 'rgba(194, 194, 194, 0.95)',
    borderRadius: 20,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#1C212A',
    fontSize: 18,
    fontWeight: 'bold',
  },
  settingRow: {
    marginBottom: 16,
  },
  settingLabel: {
    color: '#444444',
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 10,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 11,
  },
  segmentTextActive: {
    color: '#1C212A',
  },
  stepperControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  stepperButton: {
    padding: 6,
  },
  stepperValue: {
    color: '#1C212A',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
