# Rectrix: Architecture & Technical Guide

Welcome to the Rectrix codebase. This document explains how the app is structured, why certain technical choices were made, and how the different pieces fit together so anyone can jump in and contribute.

## 1. Project Overview

Rectrix is a mobile app that turns a smartphone into a virtual gamepad. It operates in two main modes:

1.  **PC Gamepad Mode:** Acts as a Wi-Fi controller for a local Windows PC, sending input data over the local network.
2.  **Cloud Gaming Mode:** Wraps a web browser (WebView) to play browser-based cloud games (like GeForce Now or Xbox Cloud Gaming), spoofing the environment to look like a desktop PC.

## 2. PC Gamepad Mode

To make the controller feel responsive and prevent input lag, we had to optimize how the app handles touches and network requests.

### UI Thread vs. JS Thread

React Native typically passes touch events from the native UI thread over a bridge to the JavaScript thread. Doing this 60 to 120 times a second for joystick movement causes noticeable lag.
To fix this, we use `react-native-reanimated` and `react-native-gesture-handler`. All gesture tracking and joystick math are executed as "worklets" directly on the UI thread, bypassing the React Native bridge almost entirely.

### Input Smoothing & Math

Touchscreens don't have physical resistance and can report jittery coordinates. We use two main adjustments:

1.  **1-Euro Filter:** Smooths out the raw touch coordinates to reduce jitter without introducing noticeable lag.
2.  **Velocity Capping (`Math.tanh`):** For trackpad swipes, we calculate the speed of the swipe and pass it through a `Math.tanh()` curve. This gently caps the maximum turn speed to simulate the physical boundaries of an analog stick.

### Networking (UDP)

Sending data at high frequencies via standard React Native bridges can trigger garbage collection pauses and latency.
Instead, we use a high-performance library (`react-native-nitro-dgram`).

- The app passes an array of 13 controller values directly to the networking module.
- UDP is used because it doesn't wait for a response, making it ideal for low-latency, continuous input streams where occasional dropped packets don't matter.

### Connecting to the PC

1.  The app scans a QR code to get the PC's local IP address and a pairing code.
2.  It sends a burst of four initial packets (each containing 11 values of just the pairing code) to establish the connection.
3.  The PC receiver (`receiver.js`) validates this 11-value packet and prepares to accept standard 13-value input packets.

## 3. Cloud Gaming Mode

Cloud gaming providers typically block mobile browsers to ensure users get a consistent experience on their official apps. We use a few workarounds to bypass these restrictions.

### Environment Spoofing

When loading the WebView, we modify the environment to look like a desktop PC:

1.  **`X-Requested-With`:** We strip this header out, as Android WebViews usually include it to identify the host app.
2.  **User-Agent:** We set the User-Agent to report as a desktop Chrome browser running on Windows.
3.  **Client Hints (`navigator.userAgentData`):** Modern sites check this API. We inject a JavaScript `Proxy` that overrides the native `userAgentData` to return desktop values (`mobile: false`, `platform: Windows`) while preserving native browser functions to prevent crashes.

### Virtual Gamepad Injection

Cloud gaming sites rely on the HTML5 Gamepad API (`navigator.getGamepads`). We inject a script before the page loads that overrides this API.

- We define a standard "Xbox 360 Controller" object.
- When the user touches the screen, React Native evaluates the input and calls a global JS function (`window.uG()`) inside the WebView.
- This updates the fake controller object, which the cloud gaming site reads as physical controller movement.

## 4. UI Architecture Notes

### Draggable Menu

The top menu can be dragged around the screen. To make it expand smoothly from its center, we animate its width while simultaneously offsetting its `X` coordinate by half of the width difference. We also clamp the coordinates so it can't be dragged off-screen.

### State Management (Shadow States)

For settings like joystick sensitivity, we maintain two states:

- A standard React `useState` to re-render the settings menu UI.
- A Reanimated `useSharedValue` that the gesture worklets read from.
  This allows the high-frequency UI thread gestures to read the settings instantly without waiting for a React re-render.

### Opacity Toggling

When switching between trackpad mode and joystick mode, we don't unmount the joystick component. Doing so causes layout shifts. Instead, we animate its `opacity` to 0 so it retains its spatial dimensions in the flexbox layout while remaining invisible.

### Persistent Settings

Settings are saved to `AsyncStorage` directly inside the `onPress` handlers of the settings menu. Since `AsyncStorage` operations are asynchronous, they save in the background without blocking the UI thread.

## 5. Guidelines for Contributors

1.  **Avoid `console.log` in gesture callbacks.**
    Gestures (like `onTouchesMove`) fire constantly. Logging strings across the bridge during these events will severely degrade performance. If debugging is necessary, limit it to `onTouchesDown` or `onTouchesUp`.

2.  **Minimize `runOnJS` calls.**
    Reanimated worklets run on the UI thread. Calling JS functions requires crossing the bridge. Keep `runOnJS` limited to discrete actions (like sending a finalized network packet or routing).

3.  **Test on physical hardware.**
    Simulators handle multi-touch, network latency, and UI thread performance differently than real devices. Gamepad logic should always be tested on a physical phone.
