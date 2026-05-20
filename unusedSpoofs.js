const DEEP_MASK_SPOOF = `
(function() {
  // 1. MOCK CHROME CLIENT HINTS (The #1 way modern Chrome is verified)
  if (!navigator.userAgentData) {
    const mockData = {
      brands: [
        { brand: 'Google Chrome', version: '142' },
        { brand: 'Chromium', version: '142' },
        { brand: 'Not?A_Brand', version: '99' }
      ],
      mobile: false,
      platform: 'Windows',
      getHighEntropyValues: (hints) => Promise.resolve({
        architecture: 'x86',
        model: '',
        platformVersion: '15.0.0',
        bitness: '64'
      })
    };
    Object.defineProperty(navigator, 'userAgentData', { get: () => mockData });
  }

  // 2. MOCK THE GPU (Canvas Fingerprinting)
  // Websites check the GPU renderer. If it says "Apple GPU", they know you're on an iPad.
  const getParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(parameter) {
    // UNMASKED_RENDERER_WEBGL
    if (parameter === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)';
    // UNMASKED_VENDOR_WEBGL
    if (parameter === 37445) return 'Google Inc. (NVIDIA)';
    return getParameter.apply(this, arguments);
  };

  // 3. KILL POINTER & TOUCH (The Hardware Giveaway)
  // This tells the CSS engine you have a "fine" pointer (mouse) and no touch.
  Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });
  
  // 4. OVERRIDE SCREEN (Prevent Aspect Ratio Detection)
  const width = 1920;
  const height = 1080;
  Object.defineProperty(window.screen, 'width', { get: () => width });
  Object.defineProperty(window.screen, 'height', { get: () => height });
  Object.defineProperty(window, 'innerWidth', { get: () => width });
  Object.defineProperty(window, 'innerHeight', { get: () => height });

  // 5. INJECT CSS TO FORCE DESKTOP LAYOUT
  // Many sites use CSS media queries. This forces them to think the screen is huge.
  const style = document.createElement('style');
  style.innerHTML = \`
    @media (pointer: coarse) {
      /* Force the site to ignore touch-specific CSS */
    }
    html, body {
      min-width: 1280px !important;
    }
  \`;
  document.head.appendChild(style);

  true;
})();
`;

const NVIDIA_SPOOF = `
(function() {
  // 1. Tell the site we are in "Standalone" (Installed) mode
  Object.defineProperty(navigator, 'standalone', { get: () => true });

  // 2. Mock the PWA display mode
  const originalMatchMedia = window.matchMedia;
  window.matchMedia = function(query) {
    if (query.includes('display-mode: standalone')) {
      return { matches: true, media: query, onchange: null, addListener:()=>{}, removeListener:()=>{}, addEventListener:()=>{}, removeEventListener:()=>{}, dispatchEvent:()=>false };
    }
    return originalMatchMedia.call(window, query);
  };

  // 3. DO NOT delete touch events
  // NVIDIA needs touch events for the on-screen controls to work!
  
  // 4. Gamepad API (Crucial for streaming)
  // Ensure the gamepad API is visible
  if (!navigator.getGamepads) {
    navigator.getGamepads = () => [];
  }

  true;
})();
`;
