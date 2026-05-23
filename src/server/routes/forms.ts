import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import type { SaveConfigRequest } from '../../shared/types';
import { saveConfig } from '../core/storage';

export const forms = new Hono();

forms.post('/settings-submit', async (c) => {
  const values = await c.req.json<SaveConfigRequest>();

  await saveConfig(context.subredditId, {
    cooldownDays: Math.max(0, Number(values.cooldownDays ?? 7)),
    maxAppeals: Math.max(1, Number(values.maxAppeals ?? 3)),
    approvalTemplate: values.approvalTemplate,
    denialTemplate: values.denialTemplate,
    notifyModmail: Boolean(values.notifyModmail),
  });

  return c.json<UiResponse>({
    showToast: { text: 'AppealBox settings saved', appearance: 'success' },
  });
});
