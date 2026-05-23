import { useCallback, useEffect, useState } from 'react';
import type {
  Appeal,
  ErrorResponse,
  InitAppealResponse,
  ResolveAppealRequest,
  SubmitAppealRequest,
  SubredditConfig,
} from '../../shared/types';
import { DEFAULT_CONFIG } from '../../shared/types';

const isErrorResponse = (value: unknown): value is ErrorResponse =>
  typeof value === 'object' &&
  value !== null &&
  'status' in value &&
  (value as ErrorResponse).status === 'error';

const requestJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });
  const data = (await response.json()) as T | ErrorResponse;

  if (!response.ok || isErrorResponse(data)) {
    throw new Error(isErrorResponse(data) ? data.message : 'Request failed');
  }

  return data as T;
};

export const useAppeal = () => {
  const [username, setUsername] = useState('');
  const [isBanned, setIsBanned] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false);
  const [cooldownEndsAt, setCooldownEndsAt] = useState(0);
  const [maxAppealsReached, setMaxAppealsReached] = useState(false);
  const [latestAppeal, setLatestAppeal] = useState<Appeal | null>(null);
  const [rules, setRules] = useState<string[]>(['Other']);
  const [config, setConfig] = useState<SubredditConfig>(DEFAULT_CONFIG);
  const [pendingAppeals, setPendingAppeals] = useState<Appeal[]>([]);
  const [resolvedAppeals, setResolvedAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState('');

  const init = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await requestJson<InitAppealResponse>('/api/init');
      setUsername(data.username);
      setIsBanned(data.isBanned);
      setIsModerator(data.isModerator);
      setCooldownActive(data.cooldownActive);
      setCooldownEndsAt(data.cooldownEndsAt);
      setMaxAppealsReached(data.maxAppealsReached);
      setLatestAppeal(data.latestAppeal);
      setRules(data.rules);
      setConfig(data.config);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  const submitAppeal = useCallback(
    async (form: SubmitAppealRequest) => {
      setSubmitting(true);
      setError('');
      try {
        await requestJson('/api/submit-appeal', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        setSubmitSuccess(true);
        await init();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Submission failed');
      } finally {
        setSubmitting(false);
      }
    },
    [init]
  );

  const loadAppeals = useCallback(async () => {
    if (!isModerator) return;

    setLoading(true);
    setError('');
    try {
      const data = await requestJson<{
        pending: Appeal[];
        resolved: Appeal[];
      }>('/api/get-appeals');
      setPendingAppeals(data.pending);
      setResolvedAppeals(data.resolved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load appeals');
    } finally {
      setLoading(false);
    }
  }, [isModerator]);

  const resolveAppeal = useCallback(
    async (payload: ResolveAppealRequest) => {
      setSubmitting(true);
      setError('');
      try {
        await requestJson('/api/resolve-appeal', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        await loadAppeals();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Resolution failed');
      } finally {
        setSubmitting(false);
      }
    },
    [loadAppeals]
  );

  useEffect(() => {
    // The app needs one initial server sync when the Devvit webview mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void init();
  }, [init]);

  return {
    username,
    isBanned,
    isModerator,
    cooldownActive,
    cooldownEndsAt,
    maxAppealsReached,
    latestAppeal,
    rules,
    config,
    pendingAppeals,
    resolvedAppeals,
    loading,
    submitting,
    submitSuccess,
    error,
    init,
    submitAppeal,
    loadAppeals,
    resolveAppeal,
  };
};
