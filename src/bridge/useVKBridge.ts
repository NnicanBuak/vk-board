import { useEffect, useState } from 'react';
import bridge from '@vkontakte/vk-bridge';
import { authenticate } from '../api/auth';
import type { VKUser } from '../types/user';

interface BridgeState {
  user: VKUser | null;
  ready: boolean;
  error: string | null;
}

const DEV_USER_ID = import.meta.env.DEV ? 1 : null;

/**
 * Initializes VK Bridge, fetches user info and authenticates with the backend.
 * In dev mode (NODE_ENV=development) bypasses VK Bridge entirely with userId=1.
 */
export function useVKBridge(): BridgeState {
  const [state, setState] = useState<BridgeState>({ user: null, ready: false, error: null });

  useEffect(() => {
    async function init() {
      // Local dev mode: skip VK Bridge entirely.
      if (DEV_USER_ID) {
        const user: VKUser = {
          userId: DEV_USER_ID,
          firstName: 'Dev',
          lastName: 'User',
          photo100: '',
        };
        await authenticate({ userId: DEV_USER_ID, firstName: 'Dev', lastName: 'User' });
        setState({ user, ready: true, error: null });
        return;
      }

      try {
        bridge.send('VKWebAppInit');

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

        // Try to get signed launch params for backend JWT validation.
        // GetLaunchParamsResponse is a flat object — serialize it as-is for the server.
        try {
          const launchParams = await bridge.send('VKWebAppGetLaunchParams');
          const vk_params = new URLSearchParams(
            Object.entries(launchParams).map(([k, v]) => [k, String(v)]),
          ).toString();
          await authenticate({ vk_params });
        } catch {
          // Fallback for localhost / dev mode without a real VK context.
          await authenticate({
            userId: user.userId,
            firstName: user.firstName,
            lastName: user.lastName,
          });
        }

        setState({ user, ready: true, error: null });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'VK Bridge error';
        setState({ user: null, ready: true, error: message });
      }
    }

    init();
  }, []);

  return state;
}
