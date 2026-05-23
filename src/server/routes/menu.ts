import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { createPost } from '../core/post';
import { getConfig } from '../core/storage';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const post = await createPost();

    return c.json<UiResponse>({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating AppealBox post: ${error}`);
    return c.json<UiResponse>({ showToast: 'Failed to create AppealBox post' }, 400);
  }
});

menu.post('/open-dashboard', async (c) => {
  return c.json<UiResponse>({
    showToast: 'Open the AppealBox post and switch to the Mod Dashboard tab.',
  });
});

menu.post('/settings', async (c) => {
  const config = await getConfig(context.subredditId);

  return c.json<UiResponse>({
    showForm: {
      name: 'settingsForm',
      data: config,
      form: {
        title: 'AppealBox Settings',
        acceptLabel: 'Save settings',
        fields: [
          {
            type: 'number',
            name: 'cooldownDays',
            label: 'Cooldown days',
            defaultValue: config.cooldownDays,
            required: true,
          },
          {
            type: 'number',
            name: 'maxAppeals',
            label: 'Maximum appeals per user',
            defaultValue: config.maxAppeals,
            required: true,
          },
          {
            type: 'paragraph',
            name: 'approvalTemplate',
            label: 'Approval message template',
            defaultValue: config.approvalTemplate,
            required: true,
          },
          {
            type: 'paragraph',
            name: 'denialTemplate',
            label: 'Denial message template',
            defaultValue: config.denialTemplate,
            required: true,
          },
          {
            type: 'boolean',
            name: 'notifyModmail',
            label: 'Notify modmail for new appeals',
            defaultValue: config.notifyModmail,
          },
        ],
      },
    },
  });
});
