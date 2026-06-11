export const PWA_CLEAN_SPOOF = `
(function() {
  // 1. The PWA "Standalone" Flag
  Object.defineProperty(navigator, 'standalone', {
    get: () => true,
    configurable: true
  });

  // 2. The CSS Media Query Spoof
  const originalMatchMedia = window.matchMedia;
  window.matchMedia = function(query) {
    if (query.includes('display-mode: standalone') || query.includes('display-mode: fullscreen')) {
      return {
        matches: true,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      };
    }
    return originalMatchMedia.call(window, query);
  };

  // 3. Gamepad API Support
  // Some WebViews lazily load the gamepad API. This ensures it's "visible" to the site scripts.
  if (!navigator.getGamepads) {
    navigator.getGamepads = () => [];
  }

  true;
})();
`;
