import { useState } from 'react';
import { SplitLayout, SplitCol, View } from '@vkontakte/vkui';
import { useActiveVkuiLocation } from '@vkontakte/vk-mini-apps-router';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Icon28AddOutline } from '@vkontakte/icons';
import { PANELS } from './router/routes';
import { HomePanel } from './panels/HomePanel';
import { BoardPanel } from './panels/BoardPanel';
import { BoardAccessPanel } from './panels/BoardAccessPanel';
import { UpdateBanner } from './components/common/UpdateBanner';
import { FabProvider } from './store/FabContext';
import { useFab, fabClickRef } from './store/fabState';

function GlobalFab() {
  const { visible } = useFab();
  const { panel } = useActiveVkuiLocation();

  if (!visible || panel === PANELS.BOARD_ACCESS) return null;

  return (
    <button
      className="fab"
      onClick={() => fabClickRef.current?.()}
      aria-label="Добавить"
    >
      <Icon28AddOutline />
    </button>
  );
}

function AppViewInner() {
  const { panel } = useActiveVkuiLocation();
  const [needRefresh, setNeedRefresh] = useState(false);

  const { updateServiceWorker } = useRegisterSW({
    onNeedRefresh() { setNeedRefresh(true); },
    onOfflineReady() {},
  });

  return (
    <SplitLayout>
      <SplitCol stretchedOnMobile width="100%">
        <View activePanel={panel ?? PANELS.HOME}>
          <HomePanel id={PANELS.HOME} />
          <BoardPanel id={PANELS.BOARD} />
          <BoardAccessPanel id={PANELS.BOARD_ACCESS} />
        </View>
        <GlobalFab />
      </SplitCol>
      {needRefresh && (
        <UpdateBanner onUpdate={() => updateServiceWorker(true)} />
      )}
    </SplitLayout>
  );
}

export function AppView() {
  return (
    <FabProvider>
      <AppViewInner />
    </FabProvider>
  );
}
