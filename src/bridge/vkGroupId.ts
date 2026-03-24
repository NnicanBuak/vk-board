import bridge, { parseURLSearchParamsForGetLaunchParams } from '@vkontakte/vk-bridge';

export type VKGroupId = number;

function normalizeVKGroupId(value: unknown): VKGroupId | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export async function resolveVKGroupId(): Promise<VKGroupId | null> {
  try {
    const launchParams = await bridge.send('VKWebAppGetLaunchParams');
    const groupId = normalizeVKGroupId(launchParams.vk_group_id);
    if (groupId !== null) {
      return groupId;
    }
  } catch {
    // Ignore bridge failures and fall back to URL launch params in dev/test.
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const launchParams = parseURLSearchParamsForGetLaunchParams(window.location.search);
  return normalizeVKGroupId(launchParams.vk_group_id)
    ?? normalizeVKGroupId(launchParams.vk_testing_group_id)
    ?? null;
}
