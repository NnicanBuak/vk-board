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
 * In development (no VK context), falls back to direct userId auth.
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
