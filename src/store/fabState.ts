import { createContext, useContext } from 'react';

interface FabCtx {
  visible: boolean;
  showFab: (action: () => void) => void;
  hideFab: () => void;
}

export const FabContext = createContext<FabCtx>({
  visible: false,
  showFab: () => {},
  hideFab: () => {},
});

// Exposed ref lets the global FAB invoke the latest handler without re-renders.
export const fabClickRef = { current: null as (() => void) | null };

export function useFab(): FabCtx {
  return useContext(FabContext);
}
