import { Hono } from 'hono';
import { context, reddit } from '@devvit/web/server';
import type {
  ErrorResponse,
  GetAppealsResponse,
  InitAppealResponse,
  ResolveAppealRequest,
  ResolveAppealResponse,
  SaveConfigRequest,
  SaveConfigResponse,
  SubmitAppealRequest,
  SubmitAppealResponse,
} from '../../shared/types';
import {
  getAppeal,
  getConfig,
  getLatestUserAppeal,
  getPendingAppeals,
  getResolvedAppeals,
  getUserIndex,
  saveAppeal,
  saveConfig,
  updateAppeal,
} from '../core/storage';

export const api = new Hono();

const getUsername = async () =>
  context.username ?? (await reddit.getCurrentUsername());

const getIsModerator = async (
  subredditName: string,
  username: string
): Promise<boolean> => {
  try {
    const moderators = reddit.getModerators({ subredditName, username, limit: 1 });
    return (await moderators.get(1)).length > 0;
  } catch {
    return false;
  }
};

const getIsBanned = async (
  subredditName: string,
  username: string
): Promise<boolean> => {
  try {
    const bannedUsers = reddit.getBannedUsers({
      subredditName,
      username,
      limit: 1,
    });
    return (await bannedUsers.get(1)).length > 0;
  } catch {
    return false;
  }
};

const getRules = async (subredditName: string): Promise<string[]> => {
  try {
    const rules = await reddit.getRules(subredditName);
    const labels = rules
      .sort((a, b) => a.priority - b.priority)
      .map((rule) => `${rule.priority + 1}. ${rule.shortName}`);

    return labels.length > 0 ? labels : ['Other'];
  } catch {
    return ['Other'];
  }
};

const requireModerator = async () => {
  const username = await getUsername();
  if (!username) return { username: null, isModerator: false };

  return {
    username,
    isModerator: await getIsModerator(context.subredditName, username),
  };
};

api.get('/init', async (c) => {
  try {
    const username = await getUsername();
    if (!username) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Not logged in' },
        401
      );
    }

    const config = await getConfig(context.subredditId);
    const userIndex = await getUserIndex(context.subredditId, username);
    const cooldownMs = config.cooldownDays * 24 * 60 * 60 * 1000;
    const cooldownEndsAt = userIndex.lastAppealAt + cooldownMs;
    const now = Date.now();

    return c.json<InitAppealResponse>({
      type: 'init',
      username,
      isBanned: await getIsBanned(context.subredditName, username),
      isModerator: await getIsModerator(context.subredditName, username),
      cooldownActive: userIndex.lastAppealAt > 0 && now < cooldownEndsAt,
      cooldownEndsAt,
      maxAppealsReached: userIndex.totalAppeals >= config.maxAppeals,
      latestAppeal: await getLatestUserAppeal(context.subredditId, username),
      rules: await getRules(context.subredditName),
      config,
    });
  } catch (error) {
    console.error('AppealBox init failed:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Initialization failed' },
      500
    );
  }
});

api.post('/submit-appeal', async (c) => {
  try {
    const username = await getUsername();
    if (!username) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Not logged in' },
        401
      );
    }

    const body = await c.req.json<SubmitAppealRequest>();
    const explanation = body.explanation?.trim() ?? '';
    const commitment = body.commitment?.trim() ?? '';

    if (!body.ruleSelected || !explanation || !commitment) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Missing required fields' },
        400
      );
    }

    if (explanation.length < 50) {
      return c.json<ErrorResponse>(
        {
          status: 'error',
          message: 'Explanation too short. Please write at least 50 characters.',
        },
        400
      );
    }

    if (commitment.length < 20) {
      return c.json<ErrorResponse>(
        {
          status: 'error',
          message: 'Commitment too short. Please write at least 20 characters.',
        },
        400
      );
    }

    if (!(await getIsBanned(context.subredditName, username))) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Only banned users can submit appeals.' },
        403
      );
    }

    const config = await getConfig(context.subredditId);
    const userIndex = await getUserIndex(context.subredditId, username);
    const now = Date.now();
    const cooldownMs = config.cooldownDays * 24 * 60 * 60 * 1000;

    if (userIndex.lastAppealAt > 0 && now < userIndex.lastAppealAt + cooldownMs) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Cooldown period active.' },
        400
      );
    }

    if (userIndex.totalAppeals >= config.maxAppeals) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Maximum appeals reached.' },
        400
      );
    }

    const appealId = `${context.subredditId}:${username}:${now}`;
    await saveAppeal({
      id: appealId,
      subredditId: context.subredditId,
      subredditName: context.subredditName,
      username,
      submittedAt: now,
      status: 'PENDING',
      ruleSelected: body.ruleSelected,
      understoodViolation: body.understoodViolation,
      explanation,
      commitment,
      additionalNote: body.additionalNote?.trim() ?? '',
      resolvedAt: null,
      resolvedBy: null,
      resolutionNote: '',
    });

    if (config.notifyModmail) {
      try {
        await reddit.sendPrivateMessage({
          to: `/r/${context.subredditName}`,
          subject: `[AppealBox] New ban appeal from u/${username}`,
          text: [
            'A new ban appeal has been submitted.',
            '',
            `User: u/${username}`,
            `Rule selected: ${body.ruleSelected}`,
            `Understood violation: ${body.understoodViolation ? 'Yes' : 'No'}`,
            '',
            'Review it from the AppealBox Dashboard tab in the AppealBox post.',
          ].join('\n'),
        });
      } catch (error) {
        console.error('Failed to send AppealBox modmail notification:', error);
      }
    }

    return c.json<SubmitAppealResponse>({ type: 'submitted', appealId });
  } catch (error) {
    console.error('AppealBox submission failed:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Submission failed' },
      500
    );
  }
});

api.get('/get-appeals', async (c) => {
  const { isModerator } = await requireModerator();
  if (!isModerator) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Moderator access required' },
      403
    );
  }

  return c.json<GetAppealsResponse>({
    type: 'appeals',
    pending: await getPendingAppeals(context.subredditId),
    resolved: await getResolvedAppeals(context.subredditId),
  });
});

api.post('/resolve-appeal', async (c) => {
  try {
    const { username, isModerator } = await requireModerator();
    if (!username || !isModerator) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Moderator access required' },
        403
      );
    }

    const body = await c.req.json<ResolveAppealRequest>();
    const appeal = await getAppeal(body.appealId);
    if (!appeal || appeal.subredditId !== context.subredditId) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Appeal not found' },
        404
      );
    }

    const config = await getConfig(context.subredditId);
    const fallbackNote =
      body.action === 'APPROVED'
        ? config.approvalTemplate
        : body.action === 'DENIED'
          ? config.denialTemplate
          : 'Your appeal has been escalated for further moderator review.';
    const note = body.note?.trim() || fallbackNote;
    const updated = await updateAppeal(appeal, body.action, username, note);

    try {
      await reddit.sendPrivateMessage({
        to: appeal.username,
        subject: `Your r/${context.subredditName} appeal is ${body.action.toLowerCase()}`,
        text: note,
      });
    } catch (error) {
      console.error('Failed to send AppealBox decision DM:', error);
    }

    return c.json<ResolveAppealResponse>({
      type: 'resolved',
      appealId: updated.id,
      status: updated.status,
    });
  } catch (error) {
    console.error('AppealBox resolve failed:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Resolution failed' },
      500
    );
  }
});

api.post('/save-config', async (c) => {
  const { isModerator } = await requireModerator();
  if (!isModerator) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Moderator access required' },
      403
    );
  }

  const body = await c.req.json<SaveConfigRequest>();
  await saveConfig(context.subredditId, {
    cooldownDays: Math.max(0, Number(body.cooldownDays ?? 7)),
    maxAppeals: Math.max(1, Number(body.maxAppeals ?? 3)),
    approvalTemplate: body.approvalTemplate,
    denialTemplate: body.denialTemplate,
    notifyModmail: Boolean(body.notifyModmail),
  });

  return c.json<SaveConfigResponse>({ type: 'config_saved' });
});
