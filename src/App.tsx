import { useEffect } from 'react';
import { ConfigProvider, AdaptivityProvider, AppRoot, SplitLayout, SplitCol, ScreenSpinner } from '@vkontakte/vkui';
import { RouterProvider } from '@vkontakte/vk-mini-apps-router';
import '@vkontakte/vkui/dist/vkui.css';

import { router } from './router/routes';
import { UserProvider, useUser } from './store/UserContext';
import { useVKBridge } from './bridge/useVKBridge';
import { ErrorPlaceholder } from './components/common/ErrorPlaceholder';
import { AppView } from './AppView';
import type { VKUser } from './types/user';

function AppInner({ user }: { user: VKUser | null }) {
  const { setUser } = useUser();
  useEffect(() => { if (user) setUser(user); }, [user, setUser]);
  return <AppView />;
}

// NOTE: useVKBridge must be called outside ConfigProvider so appearance is
// available before ConfigProvider renders. UserProvider is inside so it has
// access to router context.
function AppBridge() {
  const { user, ready, error, appearance } = useVKBridge();

  return (
    <ConfigProvider colorScheme={appearance}>
      <AdaptivityProvider>
        <AppRoot>
          <RouterProvider router={router}>
            <UserProvider>
              {!ready ? (
                <SplitLayout>
                  <SplitCol>
                    <ScreenSpinner />
                  </SplitCol>
                </SplitLayout>
              ) : error ? (
                <SplitLayout>
                  <SplitCol>
                    <ErrorPlaceholder message={error} />
                  </SplitCol>
                </SplitLayout>
              ) : (
                <AppInner user={user} />
              )}
            </UserProvider>
          </RouterProvider>
        </AppRoot>
      </AdaptivityProvider>
    </ConfigProvider>
  );
}

export default function App() {
  return <AppBridge />;
}
