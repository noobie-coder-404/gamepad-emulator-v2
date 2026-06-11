import { createContext, useContext, useMemo, useState } from 'react';

export const APP_MODES = {
  CLOUD_GAMING: 'cloud gaming',
};

const ModeContext = createContext(null);

export function ModeProvider({ children }) {
  const [mode, setMode] = useState(null);

  const value = useMemo(() => ({ mode, setMode }), [mode]);

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useMode() {
  const context = useContext(ModeContext);

  if (!context) {
    throw new Error('useMode must be used inside ModeProvider');
  }

  return context;
}
