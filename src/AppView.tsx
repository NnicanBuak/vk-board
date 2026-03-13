import { useState } from 'react';
import { SplitLayout, SplitCol, View } from '@vkontakte/vkui';
import { useActiveVkuiLocation } from '@vkontakte/vk-mini-apps-router';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { PANELS } from './router/routes';
import { HomePanel } from './panels/HomePanel';
import { BoardPanel } from './panels/BoardPanel';
import { UpdateBanner } from './components/common/UpdateBanner';

export function AppView() {
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
        </View>
      </SplitCol>
      {needRefresh && (
        <UpdateBanner onUpdate={() => updateServiceWorker(true)} />
      )}
    </SplitLayout>
  );
}
