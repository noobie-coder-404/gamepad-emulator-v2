# Rectrix: Architecture & Technical Guide

Welcome to the Rectrix codebase. This document explains how the app is structured, why certain technical choices were made, and how the different pieces fit together so anyone can jump in and contribute.

## 1. Project Overview

Rectrix is a mobile app that turns a smartphone into a virtual gamepad. It wraps a web browser (WebView) to play browser-based cloud games (like GeForce Now or Xbox Cloud Gaming), spoofing the environment to look like a desktop PC.

## 2. Cloud Gaming Mode

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

## 3. UI Architecture Notes

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

## 4. Guidelines for Contributors

1.  **Avoid `console.log` in gesture callbacks.**
    Gestures (like `onTouchesMove`) fire constantly. Logging strings across the bridge during these events will severely degrade performance. If debugging is necessary, limit it to `onTouchesDown` or `onTouchesUp`.

2.  **Minimize `runOnJS` calls.**
    Reanimated worklets run on the UI thread. Calling JS functions requires crossing the bridge. Keep `runOnJS` limited to discrete actions (like sending a finalized network packet or routing).

3.  **Test on physical hardware.**
    Simulators handle multi-touch, network latency, and UI thread performance differently than real devices. Gamepad logic should always be tested on a physical phone.
