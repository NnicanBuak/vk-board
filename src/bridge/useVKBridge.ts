import { useEffect, useState } from 'react';
import bridge from '@vkontakte/vk-bridge';
import { authenticate } from '../api/auth';
import type { VKUser } from '../types/user';

interface BridgeState {
  user: VKUser | null;
  ready: boolean;
  error: string | null;
}

/**
 * Initializes VK Bridge, fetches user info and authenticates with the backend.
 * In development (no vk_params available), falls back to userId from env.
 */
export function useVKBridge(): BridgeState {
  const [state, setState] = useState<BridgeState>({ user: null, ready: false, error: null });

  useEffect(() => {
    async function init() {
      try {
        bridge.send('VKWebAppInit');

        const userInfo = await bridge.send('VKWebAppGetUserInfo');
        const user: VKUser = {
          userId: userInfo.id,
          firstName: userInfo.first_name,
          lastName: userInfo.last_name,
          photo100: userInfo.photo_100,
        };

        // Try to get signed launch params for backend JWT validation
        try {
          const { sign, params } = await bridge.send('VKWebAppGetLaunchParams');
          const vk_params = new URLSearchParams({ ...(params as object), sign } as Record<string, string>).toString();
          await authenticate({ vk_params });
        } catch {
          // Fallback for dev environment: authenticate with userId only
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
