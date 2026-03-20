import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

// Module-level ref — updated on every render by the active panel,
// never causes re-renders, always holds the freshest callback.
const _actionRef = { current: null as (() => void) | null };
export const fabClickRef = _actionRef;


interface FabCtx {
  visible: boolean;
  showFab: (action: () => void) => void;
  hideFab: () => void;
}

const FabCtx = createContext<FabCtx>({ visible: false, showFab: () => {}, hideFab: () => {} });

export function FabProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  const showFab = useCallback((action: () => void) => {
    _actionRef.current = action;
    setVisible(true);
  }, []);

  const hideFab = useCallback(() => {
    setVisible(false);
  }, []);

  return <FabCtx.Provider value={{ visible, showFab, hideFab }}>{children}</FabCtx.Provider>;
}

export function useFab() {
  return useContext(FabCtx);
}
