import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const router = Router();

/**
 * POST /api/auth
 * Body: { vk_params: string } — signed launch params from VK Bridge VKWebAppGetLaunchParams
 * Returns: { token: string }
 *
 * In local dev mode (VK_SECRET not set), accepts { userId, firstName, lastName } directly.
 */
router.post('/', (req: Request, res: Response): void => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'JWT_SECRET not configured' });
    return;
  }

  const vkSecret = process.env.VK_SECRET;

  // Dev mode: no VK signature validation
  if (!vkSecret || process.env.NODE_ENV === 'development') {
    const { userId, firstName = 'Dev', lastName = 'User' } = req.body as {
      userId?: number;
      firstName?: string;
      lastName?: string;
    };

    if (!userId) {
      res.status(400).json({ error: 'userId required in dev mode' });
      return;
    }

    const token = jwt.sign({ userId, firstName, lastName }, secret, { expiresIn: '1h' });
    res.json({ token });
    return;
  }

  // Production: validate vk_sign
  const { vk_params } = req.body as { vk_params?: string };
  if (!vk_params) {
    res.status(400).json({ error: 'vk_params required' });
    return;
  }

  const parsed = Object.fromEntries(new URLSearchParams(vk_params));
  const { sign, ...rest } = parsed;

  const checkString = Object.keys(rest)
    .filter((k) => k.startsWith('vk_'))
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join('&');

  const expectedSign = crypto
    .createHmac('sha256', vkSecret)
    .update(checkString)
    .digest('base64url');

  if (expectedSign !== sign) {
    res.status(403).json({ error: 'Invalid vk_sign' });
    return;
  }

  const userId = Number(rest['vk_user_id']);
  const firstName = rest['vk_first_name'] ?? '';
  const lastName = rest['vk_last_name'] ?? '';

  const token = jwt.sign({ userId, firstName, lastName }, secret, { expiresIn: '1h' });
  res.json({ token });
});

export default router;
