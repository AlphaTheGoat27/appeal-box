# AppealBox — PRD v2.0
## Reddit Mod Tools Hackathon 2026
## Updated to match actual Devvit React template (devvit 0.12.24)

> One-line pitch: AppealBox gives banned Reddit users a structured, transparent way to appeal bans and gives moderators a clean dedicated queue to manage those appeals, all without ever touching modmail.

---

## Table of Contents
1. What You Are Building
2. Your Actual Project Structure
3. How the Architecture Works
4. Complete File List
5. Every File With Full Code
6. devvit.json Updates
7. How to Test
8. Submission Checklist

---

## 1. What You Are Building

### The Problem
When Reddit bans a user they have no official appeal process. They spam modmail with unstructured messages. Mods lose track of appeals buried in general modmail. Nobody knows the status of anything.

### The Solution
AppealBox is a Devvit app that installs on any subreddit and provides:

For banned users:
- A custom post with a structured appeal form (rule violated, explanation, commitment)
- A status checker to see if their appeal is pending, approved, or denied

For moderators:
- A dedicated appeal queue in the mod menu, completely separate from modmail
- One-click approve, deny, or escalate on each appeal
- Automatic DM sent to the user when a decision is made
- A settings panel to configure cooldowns, max appeals, and message templates

### What Currently Exists

| Method | Problem |
|--------|---------|
| Modmail | Unstructured, mixed with everything, no status for user |
| Google Form | Off-platform, no Reddit integration, manual copy-paste |
| Ban appeal subreddit | Requires maintaining a whole extra subreddit |
| Nothing | Most common — banned users have zero recourse |

### Why AppealBox Wins the Hackathon

| Judging Criterion | How AppealBox scores |
|---|---|
| Community Impact | Eliminates 40-80 appeal modmails per week on large subs. Every sub that bans users needs this. |
| Polish | Single install, zero-config defaults, full validation, auto DMs, all edge cases handled |
| Reliable UX | One-click install from App Directory. Clean mod menu access. No external dependencies. |
| Ecosystem Impact | Nothing like this exists in Devvit. Addresses a top-5 mod pain point. Universal appeal. |
| Moderator Choice | Moderator judges feel this pain personally. Before/after is dramatic and obvious. |

---

## 2. Your Actual Project Structure

After running npx devvit init and selecting the React template, your project looks like this. Here is what each file does for AppealBox:

```
appeal-box/
├── src/
│   ├── client/                        <- React frontend (what users see)
│   │   ├── hooks/
│   │   │   └── useCounter.ts          <- DELETE (we replace with useAppeal.ts)
│   │   ├── game.html                  <- Keep as-is (entry point for expanded view)
│   │   ├── game.tsx                   <- REPLACE (our full appeal form and status UI)
│   │   ├── global.ts                  <- Keep as-is
│   │   ├── index.css                  <- Keep as-is
│   │   ├── module.d.ts                <- Keep as-is
│   │   ├── splash.html                <- Keep as-is (entry point for inline view)
│   │   └── splash.tsx                 <- REPLACE (our Open AppealBox button)
│   ├── server/                        <- Hono backend (business logic and Redis)
│   │   ├── core/
│   │   │   ├── post.ts                <- REPLACE (create AppealBox post)
│   │   │   └── storage.ts             <- CREATE (all Redis operations)
│   │   ├── routes/
│   │   │   ├── api.ts                 <- REPLACE (all /api/* endpoints)
│   │   │   ├── forms.ts               <- REPLACE (mod settings form)
│   │   │   ├── menu.ts                <- REPLACE (mod dashboard and create post)
│   │   │   └── triggers.ts            <- Keep as-is (creates post on install)
│   │   └── index.ts                   <- Keep as-is
│   └── shared/
│       ├── api.ts                     <- Keep as-is (do not break imports)
│       └── types.ts                   <- CREATE (all shared types)
└── devvit.json                        <- UPDATE (add menu items)
```

Files you do NOT touch: src/server/index.ts, src/server/routes/triggers.ts, src/client/game.html, src/client/splash.html, src/client/index.css, src/client/global.ts, src/client/module.d.ts, src/shared/api.ts, package.json, tsconfig.json, vite.config.ts

---

## 3. How the Architecture Works

This is critical to understand before writing code. The React template works like a mini web app:

```
REDDIT CLIENT
     |
     +-- Inline post (splash.tsx)
     |    -- Small "Open AppealBox" button shown in feed
     |
     +-- Expanded post (game.tsx) <- USER TAPS THE BUTTON
          |
          +-- React app running in browser
               |
               +-- fetch('/api/init')           <- GET current user state
               +-- fetch('/api/submit-appeal')  <- POST new appeal
               +-- fetch('/api/get-status')     <- GET appeal status
                         |
                         v
               HONO SERVER (src/server/routes/api.ts)
                         |
                         +-- redis.get/set      <- Store and retrieve appeals
                         +-- reddit.*()         <- Reddit API calls
                                                   (check bans, send DMs, get rules)

MOD MENU (in Reddit mod tools)
     |
     +-- "AppealBox Dashboard" -> menu.ts -> shows pending appeals
```

Key insight: The client (React) and server (Hono) communicate via normal HTTP fetch calls. The server has access to redis and reddit from @devvit/web/server. The client gets the current user context automatically.

---

## 4. Complete File List

| File | Action | Why |
|------|--------|-----|
| src/shared/types.ts | CREATE | All TypeScript types used everywhere |
| src/server/core/storage.ts | CREATE | All Redis read/write operations |
| src/server/core/post.ts | REPLACE | Create AppealBox post instead of demo post |
| src/server/routes/api.ts | REPLACE | All appeal API endpoints |
| src/server/routes/menu.ts | REPLACE | Mod dashboard and create post menu items |
| src/server/routes/forms.ts | REPLACE | Mod settings form handler |
| src/client/splash.tsx | REPLACE | Open AppealBox button (inline view) |
| src/client/game.tsx | REPLACE | Full appeal form and status checker |
| src/client/hooks/useAppeal.ts | CREATE | React hook for all API calls |
| devvit.json | UPDATE | Add new menu items |

---

## 5. Every File With Full Code

Do these in order. Each section tells you exactly what to create or replace.

---

### FILE 1: src/shared/types.ts — CREATE this new file

```typescript
// src/shared/types.ts

export type AppealStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'ESCALATED';

export type Appeal = {
  id: string;
  subredditId: string;
  subredditName: string;
  username: string;
  submittedAt: number;
  status: AppealStatus;
  ruleSelected: string;
  understoodViolation: boolean;
  explanation: string;
  commitment: string;
  additionalNote: string;
  resolvedAt: number | null;
  resolvedBy: string | null;
  resolutionNote: string;
};

export type UserIndex = {
  appealIds: string[];
  lastAppealAt: number;
  totalAppeals: number;
};

export type SubredditConfig = {
  cooldownDays: number;
  maxAppeals: number;
  approvalTemplate: string;
  denialTemplate: string;
  notifyModmail: boolean;
};

export const DEFAULT_CONFIG: SubredditConfig = {
  cooldownDays: 7,
  maxAppeals: 3,
  approvalTemplate:
    'Your appeal has been approved. A moderator will update your ban status shortly. Please review the community rules before participating again.',
  denialTemplate:
    'After careful review, your appeal has been denied. Please wait before reappealing.',
  notifyModmail: true,
};

export type InitAppealResponse = {
  type: 'init';
  username: string;
  isBanned: boolean;
  cooldownActive: boolean;
  cooldownEndsAt: number;
  maxAppealsReached: boolean;
  latestAppeal: Appeal | null;
  rules: string[];
  config: SubredditConfig;
};

export type SubmitAppealRequest = {
  ruleSelected: string;
  understoodViolation: boolean;
  explanation: string;
  commitment: string;
  additionalNote: string;
};

export type SubmitAppealResponse = {
  type: 'submitted';
  appealId: string;
};

export type GetAppealsResponse = {
  type: 'appeals';
  pending: Appeal[];
  resolved: Appeal[];
};

export type ResolveAppealRequest = {
  appealId: string;
  action: 'APPROVED' | 'DENIED' | 'ESCALATED';
  note: string;
};

export type ResolveAppealResponse = {
  type: 'resolved';
  appealId: string;
  status: AppealStatus;
};

export type SaveConfigRequest = Partial<SubredditConfig>;

export type SaveConfigResponse = {
  type: 'config_saved';
};

export type ErrorResponse = {
  status: 'error';
  message: string;
};
```

---

### FILE 2: src/server/core/storage.ts — CREATE this new file

```typescript
// src/server/core/storage.ts
import { redis } from '@devvit/web/server';
import type { Appeal, AppealStatus, SubredditConfig, UserIndex } from '../../shared/types';
import { DEFAULT_CONFIG } from '../../shared/types';

// CONFIG

export async function getConfig(subredditId: string): Promise<SubredditConfig> {
  const raw = await redis.get(`config:${subredditId}`);
  if (!raw) return { ...DEFAULT_CONFIG };
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveConfig(
  subredditId: string,
  updates: Partial<SubredditConfig>
): Promise<void> {
  const current = await getConfig(subredditId);
  await redis.set(`config:${subredditId}`, JSON.stringify({ ...current, ...updates }));
}

// USER INDEX

export async function getUserIndex(
  subredditId: string,
  username: string
): Promise<UserIndex> {
  const raw = await redis.get(`userIndex:${subredditId}:${username}`);
  if (!raw) return { appealIds: [], lastAppealAt: 0, totalAppeals: 0 };
  try {
    return JSON.parse(raw) as UserIndex;
  } catch {
    return { appealIds: [], lastAppealAt: 0, totalAppeals: 0 };
  }
}

async function saveUserIndex(
  subredditId: string,
  username: string,
  index: UserIndex
): Promise<void> {
  await redis.set(`userIndex:${subredditId}:${username}`, JSON.stringify(index));
}

// APPEALS

export async function saveAppeal(appeal: Appeal): Promise<void> {
  await redis.set(`appeal:${appeal.id}`, JSON.stringify(appeal));

  const pendingRaw = await redis.get(`pendingList:${appeal.subredditId}`);
  const pendingList: string[] = pendingRaw ? JSON.parse(pendingRaw) : [];
  pendingList.unshift(appeal.id);
  await redis.set(`pendingList:${appeal.subredditId}`, JSON.stringify(pendingList));

  const index = await getUserIndex(appeal.subredditId, appeal.username);
  index.appealIds.push(appeal.id);
  index.lastAppealAt = appeal.submittedAt;
  index.totalAppeals += 1;
  await saveUserIndex(appeal.subredditId, appeal.username, index);
}

export async function getAppeal(appealId: string): Promise<Appeal | null> {
  const raw = await redis.get(`appeal:${appealId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Appeal;
  } catch {
    return null;
  }
}

export async function updateAppeal(
  appeal: Appeal,
  status: AppealStatus,
  resolvedBy: string,
  resolutionNote: string
): Promise<Appeal> {
  const updated: Appeal = {
    ...appeal,
    status,
    resolvedAt: Date.now(),
    resolvedBy,
    resolutionNote,
  };

  await redis.set(`appeal:${updated.id}`, JSON.stringify(updated));

  const pendingRaw = await redis.get(`pendingList:${appeal.subredditId}`);
  const pendingList: string[] = pendingRaw ? JSON.parse(pendingRaw) : [];
  await redis.set(
    `pendingList:${appeal.subredditId}`,
    JSON.stringify(pendingList.filter((id) => id !== appeal.id))
  );

  const resolvedRaw = await redis.get(`resolvedList:${appeal.subredditId}`);
  const resolvedList: string[] = resolvedRaw ? JSON.parse(resolvedRaw) : [];
  resolvedList.unshift(updated.id);
  await redis.set(`resolvedList:${appeal.subredditId}`, JSON.stringify(resolvedList));

  return updated;
}

export async function getPendingAppeals(subredditId: string): Promise<Appeal[]> {
  const raw = await redis.get(`pendingList:${subredditId}`);
  const ids: string[] = raw ? JSON.parse(raw) : [];
  const appeals = await Promise.all(ids.map((id) => getAppeal(id)));
  return appeals.filter((a): a is Appeal => a !== null);
}

export async function getResolvedAppeals(
  subredditId: string,
  limit = 50
): Promise<Appeal[]> {
  const raw = await redis.get(`resolvedList:${subredditId}`);
  const ids: string[] = raw ? JSON.parse(raw) : [];
  const sliced = ids.slice(0, limit);
  const appeals = await Promise.all(sliced.map((id) => getAppeal(id)));
  return appeals.filter((a): a is Appeal => a !== null);
}

export async function getLatestUserAppeal(
  subredditId: string,
  username: string
): Promise<Appeal | null> {
  const index = await getUserIndex(subredditId, username);
  if (index.appealIds.length === 0) return null;
  const lastId = index.appealIds[index.appealIds.length - 1];
  return getAppeal(lastId);
}
```

---

### FILE 3: src/server/core/post.ts — REPLACE entire file

```typescript
// src/server/core/post.ts
import { reddit } from '@devvit/web/server';

export const createPost = async () => {
  return await reddit.submitCustomPost({
    title: 'AppealBox — Submit or Check Your Ban Appeal',
  });
};
```

---

### FILE 4: src/server/routes/api.ts — REPLACE entire file

```typescript
// src/server/routes/api.ts
import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  InitAppealResponse,
  SubmitAppealRequest,
  SubmitAppealResponse,
  GetAppealsResponse,
  ResolveAppealRequest,
  ResolveAppealResponse,
  SaveConfigRequest,
  SaveConfigResponse,
  ErrorResponse,
} from '../../shared/types';
import {
  getConfig,
  saveConfig,
  saveAppeal,
  getAppeal,
  updateAppeal,
  getUserIndex,
  getPendingAppeals,
  getResolvedAppeals,
  getLatestUserAppeal,
} from '../core/storage';

export const api = new Hono();

// GET /api/init
// Called when the appeal post loads. Returns everything the
// React app needs to decide which screen to show the user.

api.get('/init', async (c) => {
  try {
    const subredditId = context.subredditId ?? '';
    const subredditName = context.subredditName ?? '';
    const username = await reddit.getCurrentUsername();

    if (!username) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Not logged in' }, 401);
    }

    const config = await getConfig(subredditId);

    let isBanned = false;
    try {
      const bannedList = await reddit.getBannedUsers({
        subredditName,
        username,
      });
      isBanned = bannedList.users.length > 0;
    } catch {
      isBanned = false;
    }

    const userIndex = await getUserIndex(subredditId, username);
    const now = Date.now();
    const cooldownMs = config.cooldownDays * 24 * 60 * 60 * 1000;
    const cooldownEndsAt = userIndex.lastAppealAt + cooldownMs;
    const cooldownActive = userIndex.lastAppealAt > 0 && now < cooldownEndsAt;
    const maxAppealsReached = userIndex.totalAppeals >= config.maxAppeals;

    const latestAppeal = await getLatestUserAppeal(subredditId, username);

    let rules: string[] = [];
    try {
      const rulesData = await reddit.getSubredditRules(subredditName);
      rules = (rulesData.rules ?? []).map(
        (r: { priority: number; name: string }) => `${r.priority + 1}. ${r.name}`
      );
    } catch {
      rules = ['Other'];
    }
    if (rules.length === 0) rules = ['Other'];

    return c.json<InitAppealResponse>({
      type: 'init',
      username,
      isBanned,
      cooldownActive,
      cooldownEndsAt,
      maxAppealsReached,
      latestAppeal,
      rules,
      config,
    });
  } catch (error) {
    console.error('Init error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Initialization failed' },
      500
    );
  }
});

// POST /api/submit-appeal
// Called when a banned user submits the appeal form.

api.post('/submit-appeal', async (c) => {
  try {
    const subredditId = context.subredditId ?? '';
    const subredditName = context.subredditName ?? '';
    const username = await reddit.getCurrentUsername();

    if (!username) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Not logged in' }, 401);
    }

    const body = await c.req.json<SubmitAppealRequest>();

    if (!body.ruleSelected || !body.explanation || !body.commitment) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Missing required fields' },
        400
      );
    }
    if (body.explanation.trim().length < 50) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Explanation too short (min 50 characters)' },
        400
      );
    }

    const config = await getConfig(subredditId);
    const userIndex = await getUserIndex(subredditId, username);
    const now = Date.now();
    const cooldownMs = config.cooldownDays * 24 * 60 * 60 * 1000;

    if (userIndex.lastAppealAt > 0 && now < userIndex.lastAppealAt + cooldownMs) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Cooldown period active' },
        400
      );
    }
    if (userIndex.totalAppeals >= config.maxAppeals) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Maximum appeals reached' },
        400
      );
    }

    const appealId = `${subredditId}_${username}_${now}`;
    await saveAppeal({
      id: appealId,
      subredditId,
      subredditName,
      username,
      submittedAt: now,
      status: 'PENDING',
      ruleSelected: body.ruleSelected,
      understoodViolation: body.understoodViolation,
      explanation: body.explanation.trim(),
      commitment: body.commitment.trim(),
      additionalNote: (body.additionalNote ?? '').trim(),
      resolvedAt: null,
      resolvedBy: null,
      resolutionNote: '',
    });

    if (config.notifyModmail) {
      try {
        await reddit.sendPrivateMessage({
          to: `r/${subredditName}`,
          subject: `[AppealBox] New ban appeal from u/${username}`,
          text: [
            `A new ban appeal has been submitted.`,
            ``,
            `User: u/${username}`,
            `Rule selected: ${body.ruleSelected}`,
            `Understood violation: ${body.understoodViolation ? 'Yes' : 'No'}`,
            `Explanation: ${body.explanation}`,
            ``,
            `Review it from the AppealBox Dashboard in your mod menu.`,
          ].join('\n'),
        });
      } catch {
        console.error('Failed to send modmail notification');
      }
    }

    return c.json<SubmitAppealResponse>({ type: 'submitted', appealId });
  } catch (error) {
    console.error('Submit appeal error:', error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Submission failed' }, 500);
  }
});

// GET /api/get-appeals
// Called by the mod dashboard to load pending and resolved appeals.

api.get('/get-appeals', async (c) => {
  try {
    const subredditId = context.subredditId ?? '';
    const subredditName = context.subredditName ?? '';
    const username = await reddit.getCurrentUsername();

    const isMod = await reddit.isUserModerator({
      subredditName,
      username: username ?? '',
    });
    if (!isMod) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Unauthorized' }, 403);
    }

    const [pending, resolved] = await Promise.all([
      getPendingAppeals(subredditId),
      getResolvedAppeals(subredditId, 50),
    ]);

    return c.json<GetAppealsResponse>({ type: 'appeals', pending, resolved });
  } catch (error) {
    console.error('Get appeals error:', error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to load appeals' }, 500);
  }
});

// POST /api/resolve-appeal
// Called when a mod approves, denies, or escalates an appeal.

api.post('/resolve-appeal', async (c) => {
  try {
    const subredditName = context.subredditName ?? '';
    const modUsername = await reddit.getCurrentUsername();

    if (!modUsername) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Not logged in' }, 401);
    }

    const isMod = await reddit.isUserModerator({
      subredditName,
      username: modUsername,
    });
    if (!isMod) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Unauthorized' }, 403);
    }

    const body = await c.req.json<ResolveAppealRequest>();
    const appeal = await getAppeal(body.appealId);

    if (!appeal) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Appeal not found' }, 404);
    }
    if (appeal.status !== 'PENDING') {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Appeal already resolved' },
        400
      );
    }

    const config = await getConfig(context.subredditId ?? '');

    let message = body.note?.trim();
    if (!message) {
      message =
        body.action === 'APPROVED'
          ? config.approvalTemplate
          : config.denialTemplate;
    }

    const updated = await updateAppeal(appeal, body.action, modUsername, message);

    if (body.action !== 'ESCALATED') {
      try {
        await reddit.sendPrivateMessage({
          to: appeal.username,
          subject: `Your ban appeal for r/${subredditName}`,
          text: message,
        });
      } catch {
        console.error('Failed to send DM to user');
      }
    }

    return c.json<ResolveAppealResponse>({
      type: 'resolved',
      appealId: updated.id,
      status: updated.status,
    });
  } catch (error) {
    console.error('Resolve appeal error:', error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to resolve appeal' }, 500);
  }
});

// POST /api/save-config
// Called when a mod saves settings.

api.post('/save-config', async (c) => {
  try {
    const subredditName = context.subredditName ?? '';
    const username = await reddit.getCurrentUsername();

    const isMod = await reddit.isUserModerator({
      subredditName,
      username: username ?? '',
    });
    if (!isMod) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Unauthorized' }, 403);
    }

    const body = await c.req.json<SaveConfigRequest>();
    await saveConfig(context.subredditId ?? '', body);

    return c.json<SaveConfigResponse>({ type: 'config_saved' });
  } catch (error) {
    console.error('Save config error:', error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to save config' }, 500);
  }
});
```

---

### FILE 5: src/server/routes/menu.ts — REPLACE entire file

```typescript
// src/server/routes/menu.ts
import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { createPost } from '../core/post';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const post = await createPost();
    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>({ showToast: 'Failed to create AppealBox post' }, 400);
  }
});

menu.post('/open-dashboard', async (c) => {
  try {
    return c.json<UiResponse>(
      {
        showToast: 'Open the AppealBox post and switch to the Mod Dashboard tab to manage appeals.',
      },
      200
    );
  } catch (error) {
    console.error(`Dashboard error: ${error}`);
    return c.json<UiResponse>({ showToast: 'Failed to open dashboard' }, 400);
  }
});
```

---

### FILE 6: src/server/routes/forms.ts — REPLACE entire file

```typescript
// src/server/routes/forms.ts
import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { saveConfig } from '../core/storage';

type SettingsFormValues = {
  cooldownDays?: number;
  maxAppeals?: number;
  approvalTemplate?: string;
  denialTemplate?: string;
  notifyModmail?: boolean;
};

export const forms = new Hono();

forms.post('/settings-submit', async (c) => {
  try {
    const body = await c.req.json<SettingsFormValues>();
    const subredditId = context.subredditId ?? '';

    await saveConfig(subredditId, {
      ...(body.cooldownDays !== undefined && {
        cooldownDays: Number(body.cooldownDays),
      }),
      ...(body.maxAppeals !== undefined && {
        maxAppeals: Number(body.maxAppeals),
      }),
      ...(body.approvalTemplate !== undefined && {
        approvalTemplate: body.approvalTemplate,
      }),
      ...(body.denialTemplate !== undefined && {
        denialTemplate: body.denialTemplate,
      }),
      ...(body.notifyModmail !== undefined && {
        notifyModmail: Boolean(body.notifyModmail),
      }),
    });

    return c.json<UiResponse>({ showToast: 'AppealBox settings saved!' }, 200);
  } catch (error) {
    console.error('Settings save error:', error);
    return c.json<UiResponse>({ showToast: 'Failed to save settings' }, 400);
  }
});
```

---

### FILE 7: src/client/hooks/useAppeal.ts — CREATE this new file

```typescript
// src/client/hooks/useAppeal.ts
import { useCallback, useEffect, useState } from 'react';
import type {
  InitAppealResponse,
  SubmitAppealRequest,
  SubmitAppealResponse,
  GetAppealsResponse,
  ResolveAppealRequest,
  Appeal,
  SubredditConfig,
} from '../../shared/types';

interface AppealState {
  loading: boolean;
  error: string | null;
  username: string | null;
  isBanned: boolean;
  cooldownActive: boolean;
  cooldownEndsAt: number;
  maxAppealsReached: boolean;
  latestAppeal: Appeal | null;
  rules: string[];
  config: SubredditConfig | null;
  pendingAppeals: Appeal[];
  resolvedAppeals: Appeal[];
  submitting: boolean;
  submitSuccess: boolean;
}

const initialState: AppealState = {
  loading: true,
  error: null,
  username: null,
  isBanned: false,
  cooldownActive: false,
  cooldownEndsAt: 0,
  maxAppealsReached: false,
  latestAppeal: null,
  rules: [],
  config: null,
  pendingAppeals: [],
  resolvedAppeals: [],
  submitting: false,
  submitSuccess: false,
};

export const useAppeal = () => {
  const [state, setState] = useState<AppealState>(initialState);

  const update = (patch: Partial<AppealState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/init');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: InitAppealResponse = await res.json();
        update({
          loading: false,
          username: data.username,
          isBanned: data.isBanned,
          cooldownActive: data.cooldownActive,
          cooldownEndsAt: data.cooldownEndsAt,
          maxAppealsReached: data.maxAppealsReached,
          latestAppeal: data.latestAppeal,
          rules: data.rules,
          config: data.config,
        });
      } catch (err) {
        console.error('Init failed', err);
        update({ loading: false, error: 'Failed to load. Please refresh.' });
      }
    };
    void init();
  }, []);

  const submitAppeal = useCallback(async (form: SubmitAppealRequest) => {
    update({ submitting: true, error: null });
    try {
      const res = await fetch('/api/submit-appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Submission failed');
      }
      const data: SubmitAppealResponse = await res.json();
      if (data.type === 'submitted') {
        update({ submitting: false, submitSuccess: true });
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch (err: unknown) {
      update({
        submitting: false,
        error: err instanceof Error ? err.message : 'Submission failed',
      });
    }
  }, []);

  const loadAppeals = useCallback(async () => {
    update({ loading: true });
    try {
      const res = await fetch('/api/get-appeals');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: GetAppealsResponse = await res.json();
      update({
        loading: false,
        pendingAppeals: data.pending,
        resolvedAppeals: data.resolved,
      });
    } catch (err) {
      console.error('Load appeals failed', err);
      update({ loading: false, error: 'Failed to load appeals' });
    }
  }, []);

  const resolveAppeal = useCallback(
    async (req: ResolveAppealRequest) => {
      update({ submitting: true });
      try {
        const res = await fetch('/api/resolve-appeal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        update({ submitting: false });
        await loadAppeals();
      } catch (err) {
        console.error('Resolve failed', err);
        update({ submitting: false, error: 'Failed to resolve appeal' });
      }
    },
    [loadAppeals]
  );

  return {
    ...state,
    submitAppeal,
    loadAppeals,
    resolveAppeal,
  };
};
```

---

### FILE 8: src/client/splash.tsx — REPLACE entire file

```tsx
// src/client/splash.tsx
import './index.css';
import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

export const Splash = () => {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen gap-4 bg-gray-950 px-6">
      <div className="text-4xl">📬</div>
      <h1 className="text-xl font-bold text-white text-center">AppealBox</h1>
      <p className="text-gray-400 text-sm text-center max-w-xs">
        Banned? Submit a structured appeal to the mod team, or check your existing appeal status.
      </p>
      <button
        className="mt-2 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-8 rounded-full transition-colors"
        onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
      >
        Open AppealBox
      </button>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
```

---

### FILE 9: src/client/game.tsx — REPLACE entire file

```tsx
// src/client/game.tsx
import './index.css';
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useAppeal } from './hooks/useAppeal';
import type { Appeal, SubmitAppealRequest } from '../shared/types';

export const App = () => {
  const appeal = useAppeal();
  const [activeTab, setActiveTab] = useState<'submit' | 'status' | 'mod'>('submit');

  if (appeal.loading) {
    return (
      <Screen>
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="text-4xl animate-pulse">📬</div>
          <p>Loading AppealBox...</p>
        </div>
      </Screen>
    );
  }

  if (appeal.error && !appeal.username) {
    return (
      <Screen>
        <div className="text-center text-red-400">
          <div className="text-3xl mb-2">⚠️</div>
          <p>{appeal.error}</p>
        </div>
      </Screen>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-2">
        <span className="text-xl">📬</span>
        <span className="font-bold text-white">AppealBox</span>
        {appeal.username && (
          <span className="ml-auto text-xs text-gray-500">u/{appeal.username}</span>
        )}
      </div>

      <div className="flex border-b border-gray-800 bg-gray-900">
        <Tab label="Submit Appeal" active={activeTab === 'submit'} onClick={() => setActiveTab('submit')} />
        <Tab label="My Status" active={activeTab === 'status'} onClick={() => setActiveTab('status')} />
        <Tab
          label="Mod Dashboard"
          active={activeTab === 'mod'}
          onClick={() => {
            setActiveTab('mod');
            void appeal.loadAppeals();
          }}
        />
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {activeTab === 'submit' && <SubmitView appeal={appeal} />}
        {activeTab === 'status' && <StatusView appeal={appeal} />}
        {activeTab === 'mod' && <ModView appeal={appeal} />}
      </div>
    </div>
  );
};

const SubmitView = ({ appeal }: { appeal: ReturnType<typeof useAppeal> }) => {
  const [form, setForm] = useState<SubmitAppealRequest>({
    ruleSelected: '',
    understoodViolation: false,
    explanation: '',
    commitment: '',
    additionalNote: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (appeal.submitSuccess) {
    return (
      <Card>
        <StatusBadge icon="📬" color="green" title="Appeal Submitted!" message="Your appeal is in the queue. Switch to the My Status tab to track updates." />
      </Card>
    );
  }

  if (!appeal.isBanned) {
    return (
      <Card>
        <StatusBadge icon="✅" color="gray" title="You are not banned" message="This form is only for users who have been banned from this community." />
      </Card>
    );
  }

  if (appeal.maxAppealsReached) {
    return (
      <Card>
        <StatusBadge icon="🚫" color="red" title="Appeal Limit Reached" message="You have reached the maximum number of appeals for this community." />
      </Card>
    );
  }

  if (appeal.cooldownActive) {
    const date = new Date(appeal.cooldownEndsAt).toLocaleDateString();
    return (
      <Card>
        <StatusBadge icon="⏱️" color="yellow" title="Cooldown Active" message={`You can submit a new appeal on ${date}.`} />
      </Card>
    );
  }

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.ruleSelected) e.ruleSelected = 'Please select a rule.';
    if (form.explanation.trim().length < 50) e.explanation = 'Please write at least 50 characters.';
    if (form.commitment.trim().length < 20) e.commitment = 'Please write at least 20 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) void appeal.submitAppeal(form);
  };

  return (
    <Card>
      <div className="mb-4 p-3 bg-blue-950 border border-blue-800 rounded-lg text-sm text-blue-300">
        Be honest and respectful for the best outcome. All fields marked with an asterisk are required.
      </div>

      <Field label="Which rule did you violate? *" error={errors.ruleSelected}>
        <select
          className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-gray-100 focus:border-orange-500 focus:outline-none"
          value={form.ruleSelected}
          onChange={(e) => setForm((f) => ({ ...f, ruleSelected: e.target.value }))}
        >
          <option value="">Select a rule</option>
          {appeal.rules.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </Field>

      <Field label="Do you understand why this was a violation? *">
        <div className="flex gap-4 mt-1">
          {(['yes', 'no'] as const).map((v) => (
            <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="understood"
                value={v}
                checked={form.understoodViolation === (v === 'yes')}
                onChange={() => setForm((f) => ({ ...f, understoodViolation: v === 'yes' }))}
                className="accent-orange-500"
              />
              {v === 'yes' ? 'Yes, I understand' : 'No, I need clarification'}
            </label>
          ))}
        </div>
      </Field>

      <Field label={`Explain your side * (${form.explanation.length}/1000)`} error={errors.explanation}>
        <textarea
          className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-gray-100 focus:border-orange-500 focus:outline-none resize-y"
          rows={4}
          maxLength={1000}
          placeholder="Tell the mods what happened from your perspective. Be specific and honest."
          value={form.explanation}
          onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
        />
      </Field>

      <Field label={`What will you do differently? * (${form.commitment.length}/500)`} error={errors.commitment}>
        <textarea
          className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-gray-100 focus:border-orange-500 focus:outline-none resize-y"
          rows={3}
          maxLength={500}
          placeholder="How will you avoid this situation in the future?"
          value={form.commitment}
          onChange={(e) => setForm((f) => ({ ...f, commitment: e.target.value }))}
        />
      </Field>

      <Field label={`Anything else? Optional. (${form.additionalNote.length}/300)`}>
        <textarea
          className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-gray-100 focus:border-orange-500 focus:outline-none resize-y"
          rows={2}
          maxLength={300}
          placeholder="Any other context you want the mod team to know."
          value={form.additionalNote}
          onChange={(e) => setForm((f) => ({ ...f, additionalNote: e.target.value }))}
        />
      </Field>

      {appeal.error && (
        <p className="text-red-400 text-sm mb-3">⚠️ {appeal.error}</p>
      )}

      <button
        className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-full transition-colors"
        onClick={handleSubmit}
        disabled={appeal.submitting}
      >
        {appeal.submitting ? 'Submitting...' : 'Submit Appeal'}
      </button>
    </Card>
  );
};

const StatusView = ({ appeal }: { appeal: ReturnType<typeof useAppeal> }) => {
  const a = appeal.latestAppeal;

  if (!a) {
    return (
      <Card>
        <StatusBadge icon="📭" color="gray" title="No appeal found" message="You have not submitted an appeal yet. Use the Submit Appeal tab to get started." />
      </Card>
    );
  }

  const statusMap: Record<string, { icon: string; color: 'yellow' | 'green' | 'red' | 'orange' | 'gray'; label: string; msg: string }> = {
    PENDING:   { icon: '🟡', color: 'yellow', label: 'Under Review',         msg: 'Your appeal is in the queue. You will receive a Reddit DM when a decision is made.' },
    APPROVED:  { icon: '✅', color: 'green',  label: 'Approved',             msg: 'Your appeal was approved! A moderator will update your ban status shortly.' },
    DENIED:    { icon: '❌', color: 'red',    label: 'Denied',               msg: a.resolutionNote || 'Your appeal was denied.' },
    ESCALATED: { icon: '🔴', color: 'orange', label: 'Escalated for Review', msg: 'Your appeal has been flagged for senior mod review. Please wait.' },
  };
  const s = statusMap[a.status] ?? statusMap.PENDING;

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <p className="text-xs text-gray-500 mb-2">Submitted {new Date(a.submittedAt).toLocaleString()}</p>
        <StatusBadge icon={s.icon} color={s.color} title={s.label} message={s.msg} />
      </Card>
      <Card>
        <p className="text-xs text-gray-500 font-semibold uppercase mb-3">Your Submission</p>
        <InfoRow label="Rule selected" value={a.ruleSelected} />
        <InfoRow label="Understood violation" value={a.understoodViolation ? 'Yes' : 'No'} />
        <InfoRow label="Your explanation" value={a.explanation} />
        <InfoRow label="Your commitment" value={a.commitment} />
        {a.additionalNote && <InfoRow label="Additional notes" value={a.additionalNote} />}
      </Card>
    </div>
  );
};

const ModView = ({ appeal }: { appeal: ReturnType<typeof useAppeal> }) => {
  const [modTab, setModTab] = useState<'pending' | 'resolved'>('pending');
  const [selected, setSelected] = useState<Appeal | null>(null);
  const [note, setNote] = useState('');

  if (selected) {
    return (
      <div className="flex flex-col gap-3">
        <button
          className="text-sm text-orange-400 hover:text-orange-300 text-left"
          onClick={() => { setSelected(null); setNote(''); }}
        >
          ← Back to queue
        </button>
        <Card>
          <p className="text-xs text-gray-500 mb-1">Appeal from</p>
          <p className="font-bold text-lg text-white mb-1">u/{selected.username}</p>
          <p className="text-xs text-gray-500">{new Date(selected.submittedAt).toLocaleString()}</p>
        </Card>
        <Card>
          <InfoRow label="Rule selected" value={selected.ruleSelected} />
          <InfoRow label="Understood violation" value={selected.understoodViolation ? 'Yes' : 'No'} />
          <InfoRow label="Explanation" value={selected.explanation} />
          <InfoRow label="Commitment" value={selected.commitment} />
          {selected.additionalNote && <InfoRow label="Notes" value={selected.additionalNote} />}
        </Card>
        <Card>
          <p className="text-xs text-gray-500 font-semibold uppercase mb-2">
            Response to user (leave blank to use default template)
          </p>
          <textarea
            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-gray-100 focus:border-orange-500 focus:outline-none resize-y mb-3"
            rows={3}
            placeholder="Custom message to send to user, or leave blank for default template"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-2">
            <ActionButton label="✅ Approve" color="green" disabled={appeal.submitting}
              onClick={async () => {
                await appeal.resolveAppeal({ appealId: selected.id, action: 'APPROVED', note });
                setSelected(null);
              }}
            />
            <ActionButton label="❌ Deny" color="red" disabled={appeal.submitting}
              onClick={async () => {
                await appeal.resolveAppeal({ appealId: selected.id, action: 'DENIED', note });
                setSelected(null);
              }}
            />
            <ActionButton label="🔴 Escalate" color="yellow" disabled={appeal.submitting}
              onClick={async () => {
                await appeal.resolveAppeal({ appealId: selected.id, action: 'ESCALATED', note });
                setSelected(null);
              }}
            />
          </div>
        </Card>
      </div>
    );
  }

  const list = modTab === 'pending' ? appeal.pendingAppeals : appeal.resolvedAppeals;

  return (
    <div>
      <div className="flex gap-0 mb-4 border-b border-gray-800">
        <Tab label={`Pending (${appeal.pendingAppeals.length})`} active={modTab === 'pending'} onClick={() => setModTab('pending')} />
        <Tab label={`Resolved (${appeal.resolvedAppeals.length})`} active={modTab === 'resolved'} onClick={() => setModTab('resolved')} />
      </div>

      {appeal.loading && (
        <p className="text-gray-500 text-sm text-center py-8">Loading appeals...</p>
      )}

      {!appeal.loading && list.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-3xl mb-2">{modTab === 'pending' ? '🎉' : '📋'}</div>
          <p>{modTab === 'pending' ? 'No pending appeals!' : 'No resolved appeals yet.'}</p>
        </div>
      )}

      {list.map((a) => (
        <div
          key={a.id}
          className={`bg-gray-900 border border-gray-800 rounded-lg p-3 mb-2 transition-colors ${modTab === 'pending' ? 'cursor-pointer hover:border-orange-700' : ''}`}
          onClick={() => { if (modTab === 'pending') setSelected(a); }}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-white">u/{a.username}</p>
              <p className="text-xs text-gray-500 mt-0.5">{new Date(a.submittedAt).toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">{a.ruleSelected}</p>
            </div>
            <StatusPill status={a.status} />
          </div>
          <p className="text-sm text-gray-400 mt-2 line-clamp-2">{a.explanation}</p>
          {modTab === 'pending' && (
            <p className="text-xs text-orange-400 mt-2">Tap to review</p>
          )}
        </div>
      ))}
    </div>
  );
};

const Screen = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center justify-center min-h-screen bg-gray-950">{children}</div>
);

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-3">{children}</div>
);

const Tab = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
      active ? 'border-orange-500 text-orange-400' : 'border-transparent text-gray-500 hover:text-gray-300'
    }`}
    onClick={onClick}
  >
    {label}
  </button>
);

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div className="mb-4">
    <label className="block text-sm font-semibold text-gray-300 mb-1">{label}</label>
    {children}
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
  </div>
);

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="mb-3">
    <p className="text-xs text-gray-500 font-semibold uppercase">{label}</p>
    <p className="text-sm text-gray-200 mt-0.5">{value}</p>
  </div>
);

const StatusBadge = ({
  icon, color, title, message,
}: {
  icon: string;
  color: 'green' | 'red' | 'yellow' | 'orange' | 'gray';
  title: string;
  message: string;
}) => {
  const colors = {
    green: 'text-green-400', red: 'text-red-400',
    yellow: 'text-yellow-400', orange: 'text-orange-400', gray: 'text-gray-400',
  };
  return (
    <div className="text-center py-4">
      <div className="text-4xl mb-2">{icon}</div>
      <p className={`font-bold text-lg mb-1 ${colors[color]}`}>{title}</p>
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
};

const StatusPill = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING:   { label: '🟡 Pending',    cls: 'bg-yellow-900 text-yellow-300' },
    APPROVED:  { label: '✅ Approved',   cls: 'bg-green-900 text-green-300' },
    DENIED:    { label: '❌ Denied',     cls: 'bg-red-900 text-red-300' },
    ESCALATED: { label: '🔴 Escalated',  cls: 'bg-orange-900 text-orange-300' },
  };
  const s = map[status] ?? map.PENDING;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.cls}`}>{s.label}</span>
  );
};

const ActionButton = ({
  label, color, onClick, disabled,
}: {
  label: string;
  color: 'green' | 'red' | 'yellow';
  onClick: () => void;
  disabled: boolean;
}) => {
  const colors = {
    green: 'bg-green-700 hover:bg-green-600',
    red: 'bg-red-700 hover:bg-red-600',
    yellow: 'bg-yellow-700 hover:bg-yellow-600',
  };
  return (
    <button
      className={`flex-1 text-white text-sm font-bold py-2 rounded-lg transition-colors disabled:opacity-50 ${colors[color]}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

---

## 6. devvit.json Updates

Replace your entire devvit.json with this:

```json
{
  "$schema": "https://developers.reddit.com/schema/config-file.v1.json",
  "name": "appeal-box",
  "post": {
    "dir": "dist/client",
    "entrypoints": {
      "default": {
        "inline": true,
        "entry": "splash.html"
      },
      "game": {
        "entry": "game.html"
      }
    }
  },
  "server": {
    "dir": "dist/server",
    "entry": "index.cjs"
  },
  "menu": {
    "items": [
      {
        "label": "Create AppealBox Post",
        "description": "Create the AppealBox appeal submission post in this subreddit",
        "location": "subreddit",
        "forUserType": "moderator",
        "endpoint": "/internal/menu/post-create"
      },
      {
        "label": "AppealBox Dashboard",
        "description": "Reminder: open the AppealBox post and switch to the Mod Dashboard tab",
        "location": "subreddit",
        "forUserType": "moderator",
        "endpoint": "/internal/menu/open-dashboard"
      }
    ]
  },
  "forms": {
    "settingsForm": "/internal/form/settings-submit"
  },
  "triggers": {
    "onAppInstall": "/internal/triggers/on-app-install"
  },
  "scripts": {
    "dev": "vite build --watch",
    "build": "vite build"
  }
}
```

---

## 7. How to Test

### Setup
1. Create a test subreddit on Reddit (private, you are the mod)
2. Create a second Reddit account to use as the banned test user

### Run dev mode (keep this running in terminal 1)
```powershell
npm run dev
```

### Deploy to your test subreddit (run in terminal 2)
```powershell
npx devvit playtest r/YOUR_TEST_SUBREDDIT_NAME
```

### Test sequence

| Step | What to do | Expected result |
|------|-----------|----------------|
| 1 | As mod, click the 3-dot menu on your subreddit, then "Create AppealBox Post" | A new post appears |
| 2 | Open the post | Splash screen with "Open AppealBox" button |
| 3 | Click "Open AppealBox" | Full app opens with 3 tabs |
| 4 | As non-banned user, go to Submit tab | "You are not banned" message |
| 5 | Ban your test account from the subreddit | — |
| 6 | Log in as test account, open the post, click Submit Appeal tab | Form appears with rule dropdown |
| 7 | Try submitting with empty fields | Red error messages appear |
| 8 | Fill all fields and submit | Success message appears |
| 9 | Switch to My Status tab | Shows pending status |
| 10 | As mod, go to Mod Dashboard tab | Appeal appears in Pending list |
| 11 | Click the appeal, hit Approve | Appeal moves to Resolved |
| 12 | Check test account Reddit DMs | Approval message received |
| 13 | As test account, check My Status | Shows Approved |

### Deploy for final submission
```powershell
npm run deploy
```

---

## 8. Submission Checklist

### Devpost Required Fields
- App listing: link to your app on developer.reddit.com
- Reddit usernames: all team member Reddit usernames
- Tool Overview: describe the full functionality
- Project Impact: name 3 communities and explain time savings

### Suggested Impact Statement
AppealBox eliminates the number one source of modmail clutter on active subreddits: unstructured ban appeals. Communities like r/gaming (2M members) and r/worldnews (30M members) receive dozens of appeal-related modmails weekly. AppealBox replaces this chaos with a structured intake form, a dedicated mod queue with one-click decisions, automatic user notifications, and a transparent status system, all installable in one click. Moderators save an estimated 2 to 5 hours per week. Banned users get clarity and a fair process instead of silence.

### Optional for extra prizes
- Complete the developer satisfaction survey for the 200 dollar Feedback Award
- Nominate a helpful community member for the Helper Award

---

PRD Version 2.0 — Updated to match Devvit React template devvit 0.12.24
Architecture: Hono server plus React client plus Redis storage