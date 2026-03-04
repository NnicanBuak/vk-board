import { useEffect } from 'react';
import { ConfigProvider, AdaptivityProvider, AppRoot, SplitLayout, SplitCol, ScreenSpinner } from '@vkontakte/vkui';
import { RouterProvider } from '@vkontakte/vk-mini-apps-router';
import '@vkontakte/vkui/dist/vkui.css';

import { router } from './router/routes';
import { UserProvider, useUser } from './store/UserContext';
import { useVKBridge } from './bridge/useVKBridge';
import { ErrorPlaceholder } from './components/common/ErrorPlaceholder';
import { AppView } from './AppView';

function AppInner() {
  const { user, ready, error } = useVKBridge();
  const { setUser } = useUser();

  useEffect(() => {
    if (user) setUser(user);
  }, [user, setUser]);

  if (!ready) {
    return (
      <SplitLayout>
        <SplitCol>
          <ScreenSpinner />
        </SplitCol>
      </SplitLayout>
    );
  }

  if (error) {
    return (
      <SplitLayout>
        <SplitCol>
          <ErrorPlaceholder message={error} />
        </SplitCol>
      </SplitLayout>
    );
  }

  return <AppView />;
}

export default function App() {
  return (
    <ConfigProvider>
      <AdaptivityProvider>
        <AppRoot>
          <RouterProvider router={router}>
            <UserProvider>
              <AppInner />
            </UserProvider>
          </RouterProvider>
        </AppRoot>
      </AdaptivityProvider>
    </ConfigProvider>
  );
}
