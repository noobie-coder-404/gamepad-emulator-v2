//use minifying and hex encoding or obfuscator.io ( with preset 'high' ) to obfuscate this code so its harder for companies to build patches to stop this

export const initialiseGamepad = `
//for safari
// const style = document.createElement('style');
//   style.innerHTML = '.mobile-only-element { display: none !important; } .desktop-only-element { display: block !important; }';
//   document.head.appendChild(style);

// Inject CSS to make text smaller across the website
const textSizeStyle = document.createElement('style');
// Adjust the percentage (e.g., 95%) to your preferred text size
textSizeStyle.innerHTML = 'html, body { -webkit-text-size-adjust: 95%; text-size-adjust: 95%; font-size: 95% !important; }';
if (document.head) {
    document.head.appendChild(textSizeStyle);
}

(function() {
    const STEPS = 65535;
    const DEADZONE = 0.12;

    const toAxis = (value) => {
        let val = (value / STEPS) * 2 - 1;
        if (Math.abs(val) < DEADZONE) return 0;
        return Math.min(1, Math.max(-1, val));
    };

    const toTrigger = (value) => Math.min(1, Math.max(0, value / STEPS));

    let gp = {
        id: "Xbox 360 Controller (Standard Gamepad)",
        index: 0,
        connected: true,
        mapping: "standard",
        timestamp: performance.now(),
        axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
        vibrationActuator: { type: "dual-rumble" }
    };

    navigator.getGamepads = () => [gp, null, null, null];

    window.uG = function(data) {
        if (!data || data.length < 12) return;

        // Create NEW references for this frame
        const nextAxes = [0, 0, 0, 0];
        const nextButtons = gp.buttons.map(b => ({ ...b }));

        const isRelease = data[0] === 65535 && data[1] === 65535 && data[2] === 65535;

        if (isRelease) {
            gp.axes = [0, 0, 0, 0];
            gp.buttons = gp.buttons.map(() => ({ pressed: false, value: 0, touched: false }));
            gp.timestamp = performance.now();
            return;
        }

        // 1. Map Joysticks
        nextAxes[0] = toAxis(data[0]);
        nextAxes[1] = toAxis(data[1]);
        nextAxes[2] = toAxis(data[5]);
        nextAxes[3] = toAxis(data[6]);

        // 2. Map Triggers
        nextButtons[6].value = toTrigger(data[2]);
        nextButtons[7].value = toTrigger(data[7]);
        [6, 7].forEach(i => {
            nextButtons[i].pressed = nextButtons[i].value > 0.15;
            nextButtons[i].touched = nextButtons[i].value > 0;
        });

        // 3. Binary Buttons (Shoulders/Sticks/Select/Start)
        const btnMap = { 3:4, 8:5, 10:10, 11:11, 12:8, 13:9 };
        for (const [dIdx, gIdx] of Object.entries(btnMap)) {
            const isDown = !!data[dIdx];
            nextButtons[gIdx].pressed = isDown;
            nextButtons[gIdx].value = isDown ? 1 : 0;
            nextButtons[gIdx].touched = isDown;
        }

        // 4. Face Buttons & D-Pad (Reset then apply current state)
        [0, 1, 2, 3, 12, 13, 14, 15].forEach(i => {
            nextButtons[i].pressed = false;
            nextButtons[i].value = 0;
        });

        if (data[9] > 0) {
            const fIdx = [0, 1, 2, 3][data[9] - 1];
            if (fIdx !== undefined) {
                nextButtons[fIdx].pressed = true;
                nextButtons[fIdx].value = 1;
            }
        }

        const dpadMap = { 1: 12, 2: 13, 3: 15, 4: 14 };
        const dIdx = dpadMap[data[4]];
        if (dIdx !== undefined) {
            nextButtons[dIdx].pressed = true;
            nextButtons[dIdx].value = 1;
        }

        // Apply the new references to the gamepad object
        gp.axes = nextAxes;
        gp.buttons = nextButtons;
        gp.timestamp = performance.now();
    };

    const activate = () => {
        window.dispatchEvent(new GamepadEvent("gamepadconnected", { gamepad: gp }));
        window.removeEventListener("touchstart", activate);
        console.log("Virtual Pad Active - Heartbeat Removed");
    };
    window.addEventListener("touchstart", activate);
})();
true;
`;

//FOR THE RECORD, THIS THE UG CORE LOGIC THAT WORKS -
// window.uG = function(data) {
//     if (!data || data.length < 12) return;

//     // 1. Create totally new references (The Secret Sauce)
//     const nextAxes = [
//         toAxis(data[0]),
//         toAxis(data[1]),
//         toAxis(data[5]),
//         toAxis(data[6])
//     ];

//     // Map buttons into a new array of objects
//     const nextButtons = gp.buttons.map((btn, i) => {
//         // ... mapping logic for each index ...
//         return { pressed: isDown, value: val, touched: isDown };
//     });

//     // 2. Overwrite the properties with the new objects
//     gp.axes = nextAxes;
//     gp.buttons = nextButtons;
//     gp.timestamp = performance.now();
// };

// Old version with the heartbeat trick - kept for reference, but the above version is cleaner and works without it now that we force new references each frame. The heartbeat was a hack to keep GFN's input loop awake, but with proper reference updates, it should no longer be necessary.

// export const initialiseGamepad = `
// (function() {
//     const STEPS = 65535; // Matches your 0-65535 range
//     const DEADZONE = 0.12;

//     const toAxis = (value) => {
//         // Map 0-65535 to -1.0 to 1.0
//         let val = (value / STEPS) * 2 - 1;
//         if (Math.abs(val) < DEADZONE) return 0;
//         return Math.min(1, Math.max(-1, val));
//     };

//     const toTrigger = (value) => Math.min(1, Math.max(0, value / STEPS));

//     let gp = {
//         id: "Xbox 360 Controller (Standard Gamepad)",
//         index: 0,
//         connected: true,
//         mapping: "standard",
//         timestamp: performance.now(),
//         axes: [0, 0, 0, 0],
//         buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
//         vibrationActuator: { type: "dual-rumble" }
//     };

//     // Return a 4-slot array to satisfy Chrome's GamepadList requirement
//     navigator.getGamepads = () => [gp, null, null, null];

//     window.uG = function(data) {
//         if (!data || data.length < 12) return;

//         // 1. Create NEW array references to force the browser to notice changes
//         const nextAxes = [0, 0, 0, 0];
//         const nextButtons = gp.buttons.map(b => ({ ...b }));

//         // Check for Release Packet (All values at 65535)
//         const isRelease = data[0] === 65535 && data[1] === 65535 && data[2] === 65535;

//         if (isRelease) {
//             gp.axes = [0, 0, 0, 0];
//             gp.buttons = gp.buttons.map(() => ({ pressed: false, value: 0, touched: false }));
//             gp.timestamp = performance.now();
//             return;
//         }

//         // 2. Map Joysticks
//         nextAxes[0] = toAxis(data[0]);
//         nextAxes[1] = toAxis(data[1]);
//         nextAxes[2] = toAxis(data[5]);
//         nextAxes[3] = toAxis(data[6]);

//         // 3. Map Triggers
//         nextButtons[6].value = toTrigger(data[2]);
//         nextButtons[7].value = toTrigger(data[7]);
//         [6, 7].forEach(i => {
//             nextButtons[i].pressed = nextButtons[i].value > 0.15;
//             nextButtons[i].touched = nextButtons[i].value > 0;
//         });

//         // 4. Binary Buttons (Shoulders/Sticks)
//         const btnMap = { 3:4, 8:5, 10:10, 11:11 };
//         for (const [dIdx, gIdx] of Object.entries(btnMap)) {
//             const isDown = !!data[dIdx];
//             nextButtons[gIdx].pressed = isDown;
//             nextButtons[gIdx].value = isDown ? 1 : 0;
//             nextButtons[gIdx].touched = isDown;
//         }

//         // 5. Face Buttons & D-Pad
//         [0, 1, 2, 3, 12, 13, 14, 15].forEach(i => {
//             nextButtons[i].pressed = false;
//             nextButtons[i].value = 0;
//         });

//         if (data[9] > 0) {
//             const fIdx = [0, 1, 2, 3][data[9] - 1];
//             if (fIdx !== undefined) {
//                 nextButtons[fIdx].pressed = true;
//                 nextButtons[fIdx].value = 1;
//             }
//         }

//         const dpadMap = { 1: 12, 2: 13, 3: 15, 4: 14 };
//         const dIdx = dpadMap[data[4]];
//         if (dIdx !== undefined) {
//             nextButtons[dIdx].pressed = true;
//             nextButtons[dIdx].value = 1;
//         }

//         // 6. THE HEARTBEAT TRICK
//         // If any axis is moving, we jitter the Home Button (16) at a tiny value
//         // This keeps the GFN "Input Loop" awake without actually pressing a button.
//         const isMoving = nextAxes.some(a => Math.abs(a) > 0.01);
//         if (isMoving) {
//             nextButtons[16].value = 0.001; // Tiny value, usually ignored by games
//             nextButtons[16].touched = true;
//         } else {
//             nextButtons[16].value = 0;
//             nextButtons[16].touched = false;
//         }

//         // 7. Apply the new object states
//         gp.axes = nextAxes;
//         gp.buttons = nextButtons;
//         gp.timestamp = performance.now();
//     };

//     // Initialization trigger
//     const activate = () => {
//         window.dispatchEvent(new GamepadEvent("gamepadconnected", { gamepad: gp }));
//         window.removeEventListener("touchstart", activate);
//         console.log("Virtual Pad Linked");
//     };
//     window.addEventListener("touchstart", activate);
// })();
// true;
// `;
