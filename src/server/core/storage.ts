import { redis } from '@devvit/web/server';
import type {
  Appeal,
  AppealStatus,
  SubredditConfig,
  UserIndex,
} from '../../shared/types';
import { DEFAULT_CONFIG } from '../../shared/types';

const readJson = async <T>(key: string, fallback: T): Promise<T> => {
  const raw = await redis.get(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = async <T>(key: string, value: T): Promise<void> => {
  await redis.set(key, JSON.stringify(value));
};

export async function getConfig(
  subredditId: string
): Promise<SubredditConfig> {
  const saved = await readJson<Partial<SubredditConfig>>(
    `config:${subredditId}`,
    {}
  );
  return { ...DEFAULT_CONFIG, ...saved };
}

export async function saveConfig(
  subredditId: string,
  updates: Partial<SubredditConfig>
): Promise<void> {
  const current = await getConfig(subredditId);
  await writeJson(`config:${subredditId}`, { ...current, ...updates });
}

export async function getUserIndex(
  subredditId: string,
  username: string
): Promise<UserIndex> {
  return readJson<UserIndex>(`userIndex:${subredditId}:${username}`, {
    appealIds: [],
    lastAppealAt: 0,
    totalAppeals: 0,
  });
}

async function saveUserIndex(
  subredditId: string,
  username: string,
  index: UserIndex
): Promise<void> {
  await writeJson(`userIndex:${subredditId}:${username}`, index);
}

export async function saveAppeal(appeal: Appeal): Promise<void> {
  await writeJson(`appeal:${appeal.id}`, appeal);

  const pendingList = await readJson<string[]>(
    `pendingList:${appeal.subredditId}`,
    []
  );
  await writeJson(`pendingList:${appeal.subredditId}`, [
    appeal.id,
    ...pendingList.filter((id) => id !== appeal.id),
  ]);

  const index = await getUserIndex(appeal.subredditId, appeal.username);
  await saveUserIndex(appeal.subredditId, appeal.username, {
    appealIds: [...index.appealIds, appeal.id],
    lastAppealAt: appeal.submittedAt,
    totalAppeals: index.totalAppeals + 1,
  });
}

export async function getAppeal(appealId: string): Promise<Appeal | null> {
  return readJson<Appeal | null>(`appeal:${appealId}`, null);
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

  await writeJson(`appeal:${updated.id}`, updated);

  const pendingList = await readJson<string[]>(
    `pendingList:${appeal.subredditId}`,
    []
  );
  await writeJson(
    `pendingList:${appeal.subredditId}`,
    pendingList.filter((id) => id !== appeal.id)
  );

  const resolvedList = await readJson<string[]>(
    `resolvedList:${appeal.subredditId}`,
    []
  );
  await writeJson(`resolvedList:${appeal.subredditId}`, [
    updated.id,
    ...resolvedList.filter((id) => id !== updated.id),
  ]);

  return updated;
}

export async function getPendingAppeals(
  subredditId: string
): Promise<Appeal[]> {
  const ids = await readJson<string[]>(`pendingList:${subredditId}`, []);
  const appeals = await Promise.all(ids.map((id) => getAppeal(id)));
  return appeals.filter((appeal): appeal is Appeal => appeal !== null);
}

export async function getResolvedAppeals(
  subredditId: string,
  limit = 50
): Promise<Appeal[]> {
  const ids = await readJson<string[]>(`resolvedList:${subredditId}`, []);
  const appeals = await Promise.all(
    ids.slice(0, limit).map((id) => getAppeal(id))
  );
  return appeals.filter((appeal): appeal is Appeal => appeal !== null);
}

export async function getLatestUserAppeal(
  subredditId: string,
  username: string
): Promise<Appeal | null> {
  const index = await getUserIndex(subredditId, username);
  const latestId = index.appealIds.at(-1);
  return latestId ? getAppeal(latestId) : null;
}
