import { View } from '@vkontakte/vkui';
import { useActiveVkuiLocation } from '@vkontakte/vk-mini-apps-router';
import { PANELS } from './router/routes';
import { HomePanel } from './panels/HomePanel';
import { BoardPanel } from './panels/BoardPanel';

export function AppView() {
  const { panel } = useActiveVkuiLocation();

  return (
    <View activePanel={panel ?? PANELS.HOME}>
      <HomePanel id={PANELS.HOME} />
      <BoardPanel id={PANELS.BOARD} />
    </View>
  );
}
