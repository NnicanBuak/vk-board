import { useEffect, useState } from 'react';
import bridge from '@vkontakte/vk-bridge';
import { authenticate } from '../api/auth';
import type { VKUser } from '../types/user';

interface BridgeState {
  user: VKUser | null;
  ready: boolean;
  error: string | null;
  appearance: 'light' | 'dark';
}

const DEV_USER_ID = import.meta.env.DEV ? 1 : null;

function systemAppearance(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Initializes VK Bridge, fetches user info and authenticates with the backend.
 * Reads appearance from VKWebAppGetConfig and subscribes to VKWebAppUpdateConfig.
 * In dev mode bypasses VK Bridge and uses system color scheme.
 */
export function useVKBridge(): BridgeState {
  const [state, setState] = useState<BridgeState>({
    user: null,
    ready: false,
    error: null,
    appearance: systemAppearance(),
  });

  useEffect(() => {
    // Subscribe to theme updates from VK
    const onEvent = (event: { detail: { type: string; data: unknown } }) => {
      if (event.detail.type === 'VKWebAppUpdateConfig') {
        const data = event.detail.data as { appearance?: string };
        if (data.appearance === 'dark' || data.appearance === 'light') {
          setState((prev) => ({ ...prev, appearance: data.appearance as 'light' | 'dark' }));
        }
      }
    };
    bridge.subscribe(onEvent);

    async function init() {
      if (DEV_USER_ID) {
        const user: VKUser = {
          userId: DEV_USER_ID,
          firstName: 'Dev',
          lastName: 'User',
          photo100: '',
        };
        const vk_params = new URLSearchParams({
          vk_user_id: String(DEV_USER_ID),
          vk_first_name: 'Dev',
          vk_last_name: 'User',
        }).toString();
        await authenticate({ vk_params });
        setState((prev) => ({ ...prev, user, ready: true, error: null }));
        return;
      }

      try {
        bridge.send('VKWebAppInit');

        // Get appearance from VK before anything else
        try {
          const config = await bridge.send('VKWebAppGetConfig');
          const ap = (config as unknown as { appearance?: string }).appearance;
          if (ap === 'dark' || ap === 'light') {
            setState((prev) => ({ ...prev, appearance: ap }));
          }
        } catch { /* fall back to system */ }

        const userInfo = await Promise.race([
          bridge.send('VKWebAppGetUserInfo'),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('VKWebAppGetUserInfo timeout')), 3000),
          ),
        ]);
        const user: VKUser = {
          userId: userInfo.id,
          firstName: userInfo.first_name,
          lastName: userInfo.last_name,
          photo100: userInfo.photo_100,
        };

        const launchParams = await bridge.send('VKWebAppGetLaunchParams');
        const vk_params = new URLSearchParams(
          Object.entries(launchParams).map(([k, v]) => [k, String(v)]),
        ).toString();
        await authenticate({ vk_params });

        setState((prev) => ({ ...prev, user, ready: true, error: null }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'VK Bridge error';
        setState((prev) => ({ ...prev, user: null, ready: true, error: message }));
      }
    }

    init();

    return () => { bridge.unsubscribe(onEvent); };
  }, []);

  return state;
}
