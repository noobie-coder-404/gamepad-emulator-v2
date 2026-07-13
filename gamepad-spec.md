# Gamepad Technical Spec

This document explains how the gamepad app captures touch input, converts it into controller state, and inserts that state into the loaded web page as an HTML5 Gamepad API device.

## Overview

The gamepad is split into two runtime worlds:

1. **React Native / Reanimated side**
   Captures touch input, tracks active fingers, computes joystick/button/trigger values, and builds a compact controller packet.

2. **WebView page side**
   Receives the packet through injected JavaScript, updates a fake `navigator.getGamepads()` controller object, and exposes that object to the cloud gaming page as if a physical Xbox-style controller were connected.

The high-level flow is:

```text
Touch screen input
  -> Reanimated manual gesture
  -> shared values for sticks/buttons/triggers
  -> derived controller packet
  -> WebView injectJavaScript("window.uG(packet)")
  -> fake Gamepad object is updated
  -> game reads navigator.getGamepads()
```

## Main Files

- `app/gamepad.jsx`
  Owns the WebView, visual controls, gesture capture, shared controller state, packet creation, and packet dispatch.

- `helper-functions/gamepadInterface.js`
  Defines the JavaScript injected into the WebView. It overrides `navigator.getGamepads()` and exposes `window.uG(data)` for native-to-page input updates.

- `hooks/useOneEuroFilter.js`
  Smooths right-trackpad touch coordinates before they are converted into right-stick movement.

- `components/Joystick.jsx`
  Renders joystick visuals and exposes refs/measurements used by the gesture system.

- `components/Buttons.jsx`
  Renders D-pad and ABXY clusters, including cross/rays alignment modes and per-button measurement refs.

- `components/Trigger.jsx`
  Renders shoulder/trigger controls and visualizes analog trigger pull or digital shoulder press state.

## WebView Gamepad Injection

The WebView loads the target game page and injects the gamepad script:

```jsx
<WebView
  injectedJavaScript={initialiseGamepad + temporaryCleanScript}
  injectedJavaScriptBeforeContentLoaded={PWA_CLEAN_SPOOF}
  ref={webViewRef}
  ...
/>
```

The gamepad injection script creates one fake standard controller:

```js
let gp = {
  id: "Xbox 360 Controller (Standard Gamepad)",
  index: 0,
  connected: true,
  mapping: "standard",
  timestamp: performance.now(),
  axes: [0, 0, 0, 0],
  buttons: Array.from({ length: 17 }, () => ({
    pressed: false,
    touched: false,
    value: 0,
  })),
  vibrationActuator: { type: "dual-rumble" },
};
```

It then overrides the browser Gamepad API:

```js
navigator.getGamepads = () => [gp, null, null, null];
```

The page sees this as gamepad index `0`. When the user first touches the page, the script dispatches:

```js
window.dispatchEvent(new GamepadEvent("gamepadconnected", { gamepad: gp }));
```

That event tells the site that a controller is available.

## Native-To-WebView Packet Dispatch

React Native sends updates to the WebView with:

```js
const sendNativePacket = useCallback((arr) => {
  const jsCode = `window.uG(${JSON.stringify(arr)}); true;`;
  webViewRef.current?.injectJavaScript(jsCode);
}, []);
```

This does not send a network packet. It injects a short JavaScript call into the WebView process. The injected page function `window.uG(data)` receives the latest controller state.

## Controller Packet Format

The React Native side builds a 14-value array called `currentSnapshot`.

All analog stick and trigger values are represented in a `0..65534` range. Centered sticks are around `32767`. Triggers use `0` as released and `65534` as fully pulled.

```text
index  meaning
0      left stick X
1      left stick Y
2      left trigger analog value
3      left shoulder digital value
4      D-pad direction value
5      right stick X
6      right stick Y
7      right trigger analog value
8      right shoulder digital value
9      ABXY face button value
10     LS / L3 stick-click value
11     RS / R3 stick-click value
12     View / Select value
13     Menu / Start value
```

Direction/button enum values:

```js
const dPadValues = {
  up: 1,
  down: 2,
  right: 3,
  left: 4,
  null: 0,
};

const facepadValues = {
  a: 1,
  b: 2,
  x: 3,
  y: 4,
  null: 0,
};
```

The packet is produced by a Reanimated derived value:

```js
const currentSnapshot = useDerivedValue(() => {
  return [
    leftKnobOffsetX,
    leftKnobOffsetY,
    leftTrigger,
    leftShoulder,
    dpadValue,
    rightKnobOffsetX,
    rightKnobOffsetY,
    rightTrigger,
    rightShoulder,
    faceButtonValue,
    l3Value,
    r3Value,
    selectValue,
    startValue,
  ];
});
```

## Touch Capture

The gamepad overlay is active only when `gamepadToggled` is true:

```jsx
{gamepadToggled && (
  <GestureDetector gesture={manualGesture}>
    ...
  </GestureDetector>
)}
```

Input is captured with a `Gesture.Manual()` gesture. This gives direct access to all touches through:

- `onTouchesDown`
- `onTouchesMove`
- `onTouchesUp`
- `onTouchesCancelled`

The gesture runs on the UI thread. Most input state is stored in Reanimated shared values so the high-frequency touch path does not need React state updates.

## Finger Ownership Model

Each physical finger is bound to a control by storing its touch id.

Examples:

```js
const leftFinger = useSharedValue(-1);
const rightFinger = useSharedValue(-1);
const leftJoystickFinger = useSharedValue(-1);
const rightJoystickFinger = useSharedValue(-1);
const facePadFinger = useSharedValue(-1);
const dPadFinger = useSharedValue(-1);
const selectButtonFinger = useSharedValue(-1);
const startButtonFinger = useSharedValue(-1);
```

On touch down, the app checks which hit area contains the finger and assigns the finger id to that control. On move, only the matching finger can update that control. On release, the matching state is reset and a cancellation packet is sent.

This prevents one moving finger from accidentally controlling multiple gamepad elements.

## Hit Detection

Each visible control exposes a ref or measurement object. The gesture system uses `isInside(...)` checks to decide which control a touch belongs to.

Examples:

- Start/View buttons use `selectButtonRef` and `startButtonRef`.
- Triggers use `leftTrigger` and `rightTrigger`.
- Joysticks use `leftJoystick` and `rightJoystick`.
- D-pad and ABXY use cluster refs plus per-button refs.
- LS/RS stick-click controls use their own refs.

## Joystick Mode

Both joysticks use a floating center model.

When a finger starts on a joystick:

```js
leftFloatingStickCenter.value = { x: touch.x, y: touch.y };
leftJoystickFinger.value = touch.id;
```

On movement, the app calculates the offset from the floating center:

```js
leftKnobOffset.value = calculateOffset(
  touch,
  leftFloatingStickCenter.value,
  leftJoystickMeasurements.value
);
```

The offset is clamped to the joystick radius and converted into `0..65534` packet values:

```js
const toByte = (v) => {
  const clamped = clamp(v, -stickDiameter / 2, stickDiameter / 2);
  return Math.round(
    ((clamped + stickDiameter / 2) / stickDiameter) * noOfSteps
  );
};
```

When the finger lifts, the corresponding joystick offset resets to `{ x: 0, y: 0 }`, and the app sends a centering packet.

## Right Trackpad Mode

The right side can operate as a swipe-to-look trackpad instead of a physical joystick.

In trackpad mode, right-side touch movement is converted into a synthetic right-stick offset:

1. Read the raw touch coordinates.
2. Smooth the coordinates with the One Euro filter.
3. Compare the current filtered coordinate to the previous filtered coordinate.
4. Convert the delta over time into velocity.
5. Pass the velocity through a gain curve.
6. Convert the final velocity magnitude and angle into a joystick offset.
7. Store that offset in `rightKnobOffset`.

The important state is:

```js
const currentTrackpadInfo = useSharedValue(null);
const lastIteration = useSharedValue(0);
```

`currentTrackpadInfo` stores the previous filtered position, timestamp, and velocity:

```js
{
  x,
  y,
  time: currentTime,
  vx: effectiveVx,
  vy: effectiveVy,
}
```

The direction comes from:

```js
const joystickAngle = Math.atan2(effectiveVy, effectiveVx);
```

The radius comes from a Padé-style velocity curve:

```js
const joystickVelocity =
  (velocityCap * ((1 + gainSV.value) * currentVelocity)) /
  (velocityCap + gainSV.value * currentVelocity);

let joystickRadius = (joystickVelocity / velocityCap) * 40;
```

Then the app writes:

```js
rightKnobOffset.value = {
  x: joystickRadius * Math.cos(joystickAngle),
  y: joystickRadius * Math.sin(joystickAngle),
};
```

Small non-zero movement can be boosted with an anti-deadzone so games register fine aim movement:

```js
if (joystickRadius > 0.02 * 40 && joystickRadius < 0.1 * 40) {
  joystickRadius = 0.2 * 40;
}
```

When the right trackpad finger lifts, the app clears `currentTrackpadInfo`, resets both One Euro filters, resets the right stick to center, and sends a right-stick cancellation packet.

## One Euro Filtering

The One Euro filter is used to smooth right-trackpad coordinates before velocity is calculated.

Current tuning values in `gamepad.jsx`:

```js
const minCutoff = 0.5;
const beta = 0.007;
const dCutoff = 1.0;
```

The filter tracks:

- current sampling frequency
- previous timestamp
- filtered signal state
- previous raw input
- filtered derivative state

The derivative is based on raw-to-raw movement:

```js
const dvalue = rawInitialized.value
  ? (value - lastRaw.value) * freq.value
  : 0.0;
```

The adaptive cutoff is:

```js
const cutoff = minCutoff + beta * Math.abs(edvalue);
```

This means low-speed movement gets more smoothing, while faster movement gets less smoothing and lower perceived latency.

## Shoulder And Trigger Controls

Each shoulder region can act as either:

- analog trigger, or
- digital bumper/shoulder button

The mode is decided by the first meaningful vertical movement after touchdown:

```js
const diff = triggerDirectionUpwards
  ? initialY - touch.y
  : touch.y - initialY;

const nextMode = diff > 0 ? 'trigger' : diff < 0 ? 'button' : null;
```

With `continuousMode` false, the mode latches until the finger lifts. This prevents accidental switching between trigger and bumper while the same finger is active.

Analog trigger pull is clamped:

```js
triggerPullLeft.value = clampTriggerPull(diff);
```

The derived snapshot converts it to the gamepad range:

```js
Math.round((triggerPullValueLeft / triggerLength) * noOfSteps)
```

Digital shoulder press is represented as `0` or `1`.

## D-Pad And ABXY Controls

D-pad and ABXY each have:

- a cluster activation area
- a center anchor area
- individual button hit regions

On touchdown inside a cluster, the app records the controlling finger:

```js
facePadFinger.value = touch.id;
dPadFinger.value = touch.id;
```

On movement, the app checks which child button contains the finger and updates the active button shared value:

```js
activeFaceButton.value = nextFaceButton;
activeDpadButton.value = nextDpadButton;
```

The derived snapshot converts those active labels into enum values:

```js
dPadValues[activeDpadButton.value]
facepadValues[activeFaceButton.value]
```

When the finger lifts, the active button is set to `null` and a cancellation packet clears that control in the WebView.

## Start, View, LS, And RS

Start, View, LS, and RS are digital buttons.

On press:

1. The finger id is stored.
2. The button shared value is set to `1`.
3. Haptic feedback is triggered.
4. A packet is sent immediately.

On release:

1. The button value is set to `0`.
2. The finger id resets to `-1`.
3. A cancellation packet is sent.

Packet indexes:

```text
10  LS / L3
11  RS / R3
12  View / Select
13  Menu / Start
```

## Haptics

The app uses `expo-haptics` for discrete button feedback.

Haptics fire for:

- ABXY press changes
- D-pad press changes
- View/Select press
- Menu/Start press
- LB/RB digital press
- LS/RS stick-click press
- LT/RT only when the trigger reaches maximum pull

Haptics do not fire for normal joystick movement.

## Snapshot Sending

The app avoids injecting every move event if the controller state has not changed.

It stores the last sent snapshot:

```js
const previousSnapshot = useSharedValue(null);
```

On every move:

1. Build `currentSnapshot`.
2. Compare it to `previousSnapshot`.
3. If different, copy it into `previousSnapshot`.
4. Call `sendNativePacket(currentSnapshot.value)`.

This reduces unnecessary WebView JavaScript injection and keeps the gesture path lighter.

## Release And Cancellation Packets

When a specific control is released, the app sends a targeted cancellation packet. This packet is based on the current snapshot, but with one control cleared.

Examples:

- left stick release sets indexes `0` and `1` to center
- right stick release sets indexes `5` and `6` to center
- left shoulder release clears indexes `2` and `3`
- right shoulder release clears indexes `7` and `8`
- D-pad release clears index `4`
- ABXY release clears index `9`
- View release clears index `12`
- Start release clears index `13`

When all touches end, the app sends a full release packet three times:

```js
const releasePacket = Array(14).fill(65535);
sendNativePacket(releasePacket);
sendNativePacket(releasePacket);
sendNativePacket(releasePacket);
```

On the WebView side, `window.uG(data)` treats a packet beginning with `65535, 65535, 65535` as a release signal and resets all axes/buttons:

```js
const isRelease =
  data[0] === 65535 &&
  data[1] === 65535 &&
  data[2] === 65535;

if (isRelease) {
  gp.axes = [0, 0, 0, 0];
  gp.buttons = gp.buttons.map(() => ({
    pressed: false,
    value: 0,
    touched: false,
  }));
  gp.timestamp = performance.now();
  return;
}
```

## WebView Packet Decoding

Inside `window.uG(data)`, packet values are converted into standard Gamepad API fields.

Analog stick values:

```js
const toAxis = (value) => {
  let val = (value / STEPS) * 2 - 1;
  if (Math.abs(val) < DEADZONE) return 0;
  return Math.min(1, Math.max(-1, val));
};
```

Trigger values:

```js
const toTrigger = (value) =>
  Math.min(1, Math.max(0, value / STEPS));
```

Axis mapping:

```text
data[0] -> axes[0] left stick X
data[1] -> axes[1] left stick Y
data[5] -> axes[2] right stick X
data[6] -> axes[3] right stick Y
```

Trigger mapping:

```text
data[2] -> buttons[6] left trigger
data[7] -> buttons[7] right trigger
```

Digital button mapping:

```js
const btnMap = {
  3: 4,   // left shoulder
  8: 5,   // right shoulder
  10: 10, // LS / L3
  11: 11, // RS / R3
  12: 8,  // View / Select
  13: 9,  // Menu / Start
};
```

ABXY mapping:

```js
if (data[9] > 0) {
  const fIdx = [0, 1, 2, 3][data[9] - 1];
  nextButtons[fIdx].pressed = true;
  nextButtons[fIdx].value = 1;
}
```

D-pad mapping:

```js
const dpadMap = {
  1: 12, // up
  2: 13, // down
  3: 15, // right
  4: 14, // left
};
```

After decoding, the script replaces the axis and button arrays with new references:

```js
gp.axes = nextAxes;
gp.buttons = nextButtons;
gp.timestamp = performance.now();
```

Replacing references is important because some web game input loops notice changes more reliably when `axes` and `buttons` are fresh objects instead of mutated in place.

## Threading And Performance Notes

Most input work happens on the Reanimated/UI thread:

- touch ownership
- hit detection
- joystick offset calculation
- trigger pull calculation
- active button selection
- current snapshot derivation

The app crosses to the JS thread only for discrete side effects:

- injecting packets into the WebView with `sendNativePacket`
- haptic feedback
- toggling React state for UI features

The high-frequency path avoids React renders by storing live control state in shared values.

## Auto-Hide Interaction

The gamepad tracks the last input activity time in a shared value:

```js
const lastGamepadActivityTime = useSharedValue(performance.now());
```

Touch down and move update this timestamp. A `useFrameCallback` checks whether the gamepad has been idle long enough and hides the overlay after the timeout, unless a modal/menu is open.

This is separate from input insertion. It only controls whether the visual overlay and gesture surface are mounted.

## Settings That Affect Input

Some settings have both React state and shared value mirrors.

Examples:

```js
const [trackpadMode, setTrackpadMode] = useState(true);
const trackpadModeSV = useSharedValue(true);

const [gain, setGain] = useState(1.5);
const gainSV = useSharedValue(1.5);

const [sensitivity, setSensitivity] = useState(10);
const sensitivitySV = useSharedValue(10);
```

React state updates the settings UI. Shared values are read by worklets during gestures. This prevents high-frequency input code from depending on React render timing.

## End-To-End Example

Example: the user presses and moves the right trackpad.

1. Finger touches the right half of the lower screen.
2. The app assigns that finger to `rightJoystickFinger`.
3. The first filtered coordinate is stored in `currentTrackpadInfo`.
4. On each move, the app filters the new coordinate.
5. It computes delta, velocity, gain-adjusted velocity, radius, and angle.
6. It writes the result to `rightKnobOffset`.
7. `currentSnapshot` converts `rightKnobOffset` into packet indexes `5` and `6`.
8. If the snapshot differs from the previous snapshot, the app injects:

```js
window.uG([ ...14 values... ]);
```

9. `window.uG` maps indexes `5` and `6` to `gp.axes[2]` and `gp.axes[3]`.
10. The cloud game reads `navigator.getGamepads()[0].axes` and receives right-stick movement.

Example: the user releases the finger.

1. `onTouchesUp` sees the released touch id matches `rightJoystickFinger`.
2. The app resets `rightKnobOffset` to center.
3. Trackpad filter state is reset.
4. A targeted right-stick cancellation packet is injected.
5. If all touches are gone, a full release packet is injected three times.
6. The fake Gamepad object returns to neutral.
