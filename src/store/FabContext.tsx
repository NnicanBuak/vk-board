import { useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { FabContext, fabClickRef } from './fabState';

export function FabProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  const showFab = useCallback((action: () => void) => {
    fabClickRef.current = action;
    setVisible(true);
  }, []);

  const hideFab = useCallback(() => {
    setVisible(false);
  }, []);

  return <FabContext.Provider value={{ visible, showFab, hideFab }}>{children}</FabContext.Provider>;
}
