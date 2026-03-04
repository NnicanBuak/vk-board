import { Panel, PanelHeader, PanelHeaderBack, Spinner, Div } from '@vkontakte/vkui';
import { useRouteNavigator, useParams } from '@vkontakte/vk-mini-apps-router';

interface Props {
  id: string;
}

// NOTE: Full implementation in the next stage. Stub ensures the app compiles.
export function BoardPanel({ id }: Props) {
  const navigator = useRouteNavigator();
  const params = useParams<'boardId'>();

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => navigator.back()} />}>
        Доска
      </PanelHeader>
      <Div style={{ display: 'flex', justifyContent: 'center' }}>
        <Spinner />
      </Div>
      <p style={{ textAlign: 'center', color: '#888', fontSize: 12 }}>
        boardId: {params?.boardId}
      </p>
    </Panel>
  );
}
