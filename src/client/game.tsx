import './index.css';

import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { ReactNode } from 'react';
import type { Appeal, SubmitAppealRequest } from '../shared/types';
import { useAppeal } from './hooks/useAppeal';

type AppealHook = ReturnType<typeof useAppeal>;

export const App = () => {
  const appeal = useAppeal();
  const { loadAppeals } = appeal;
  const [activeTab, setActiveTab] = useState<'submit' | 'status' | 'mod'>(
    'submit'
  );

  useEffect(() => {
    if (activeTab === 'mod') void loadAppeals();
  }, [activeTab, loadAppeals]);

  if (appeal.loading && !appeal.username) {
    return (
      <Screen>
        <p className="text-sm text-neutral-400">Loading AppealBox...</p>
      </Screen>
    );
  }

  if (appeal.error && !appeal.username) {
    return (
      <Screen>
        <Card>
          <StatusBadge
            tone="red"
            title="Could not load"
            message={appeal.error}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 bg-neutral-950 px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black tracking-normal text-white">
              AppealBox
            </h1>
            <p className="text-xs text-neutral-500">
              Structured ban appeals for this community
            </p>
          </div>
          <div className="text-right text-xs text-neutral-500">
            Signed in as
            <span className="ml-1 font-semibold text-neutral-300">
              u/{appeal.username}
            </span>
          </div>
        </div>
      </header>

      <nav className="border-b border-neutral-800 bg-neutral-900">
        <div className="mx-auto flex max-w-4xl overflow-x-auto px-2">
          <Tab
            label="Submit Appeal"
            active={activeTab === 'submit'}
            onClick={() => setActiveTab('submit')}
          />
          <Tab
            label="My Status"
            active={activeTab === 'status'}
            onClick={() => setActiveTab('status')}
          />
          {appeal.isModerator && (
            <Tab
              label="Mod Dashboard"
              active={activeTab === 'mod'}
              onClick={() => setActiveTab('mod')}
            />
          )}
        </div>
      </nav>

      <main className="mx-auto max-w-4xl p-4">
        {activeTab === 'submit' && <SubmitView appeal={appeal} />}
        {activeTab === 'status' && <StatusView appeal={appeal} />}
        {activeTab === 'mod' && appeal.isModerator && <ModView appeal={appeal} />}
      </main>
    </div>
  );
};

const SubmitView = ({ appeal }: { appeal: AppealHook }) => {
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
        <StatusBadge
          tone="green"
          title="Appeal submitted"
          message="Your appeal is in the queue. Use My Status to track updates."
        />
      </Card>
    );
  }

  if (!appeal.isBanned) {
    return (
      <Card>
        <StatusBadge
          tone="neutral"
          title="You are not banned"
          message="This form is only for users who are currently banned from this community."
        />
      </Card>
    );
  }

  if (appeal.maxAppealsReached) {
    return (
      <Card>
        <StatusBadge
          tone="red"
          title="Appeal limit reached"
          message="You have reached the maximum number of appeals for this community."
        />
      </Card>
    );
  }

  if (appeal.cooldownActive) {
    return (
      <Card>
        <StatusBadge
          tone="yellow"
          title="Cooldown active"
          message={`You can submit a new appeal on ${new Date(
            appeal.cooldownEndsAt
          ).toLocaleDateString()}.`}
        />
      </Card>
    );
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.ruleSelected) nextErrors.ruleSelected = 'Select a rule.';
    if (form.explanation.trim().length < 50) {
      nextErrors.explanation = 'Write at least 50 characters.';
    }
    if (form.commitment.trim().length < 20) {
      nextErrors.commitment = 'Write at least 20 characters.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) void appeal.submitAppeal(form);
  };

  return (
    <Card>
      <div className="mb-5 rounded border border-sky-900 bg-sky-950 px-3 py-2 text-sm text-sky-200">
        Be specific, respectful, and honest. Moderators can see every appeal
        from this community in one dedicated queue.
      </div>

      <Field label="Which rule did you violate?" error={errors.ruleSelected}>
        <select
          className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-orange-500"
          value={form.ruleSelected}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              ruleSelected: event.target.value,
            }))
          }
        >
          <option value="">Select a rule</option>
          {appeal.rules.map((rule) => (
            <option key={rule} value={rule}>
              {rule}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Do you understand why this was a violation?">
        <div className="grid gap-2 sm:grid-cols-2">
          <RadioOption
            label="Yes, I understand"
            checked={form.understoodViolation}
            onChange={() =>
              setForm((current) => ({ ...current, understoodViolation: true }))
            }
          />
          <RadioOption
            label="No, I need clarification"
            checked={!form.understoodViolation}
            onChange={() =>
              setForm((current) => ({ ...current, understoodViolation: false }))
            }
          />
        </div>
      </Field>

      <Field
        label={`Explain your side (${form.explanation.length}/1000)`}
        error={errors.explanation}
      >
        <textarea
          className="min-h-32 w-full resize-y rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-orange-500"
          maxLength={1000}
          placeholder="Tell the mod team what happened from your perspective."
          value={form.explanation}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              explanation: event.target.value,
            }))
          }
        />
      </Field>

      <Field
        label={`What will you do differently? (${form.commitment.length}/500)`}
        error={errors.commitment}
      >
        <textarea
          className="min-h-24 w-full resize-y rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-orange-500"
          maxLength={500}
          placeholder="Describe how you will avoid this situation in the future."
          value={form.commitment}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              commitment: event.target.value,
            }))
          }
        />
      </Field>

      <Field label={`Anything else? (${form.additionalNote.length}/300)`}>
        <textarea
          className="min-h-20 w-full resize-y rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-orange-500"
          maxLength={300}
          placeholder="Add optional context for the mod team."
          value={form.additionalNote}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              additionalNote: event.target.value,
            }))
          }
        />
      </Field>

      {appeal.error && (
        <p className="mb-3 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-200">
          {appeal.error}
        </p>
      )}

      <button
        className="w-full rounded bg-orange-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:bg-neutral-800 disabled:text-neutral-500"
        onClick={handleSubmit}
        disabled={appeal.submitting}
      >
        {appeal.submitting ? 'Submitting...' : 'Submit Appeal'}
      </button>
    </Card>
  );
};

const StatusView = ({ appeal }: { appeal: AppealHook }) => {
  const current = appeal.latestAppeal;

  if (!current) {
    return (
      <Card>
        <StatusBadge
          tone="neutral"
          title="No appeal found"
          message="You have not submitted an appeal yet."
        />
      </Card>
    );
  }

  const status = {
    PENDING: {
      tone: 'yellow' as const,
      title: 'Under review',
      message:
        'Your appeal is in the queue. You will receive a Reddit DM when a decision is made.',
    },
    APPROVED: {
      tone: 'green' as const,
      title: 'Approved',
      message:
        current.resolutionNote ||
        'Your appeal was approved. A moderator will update your ban status shortly.',
    },
    DENIED: {
      tone: 'red' as const,
      title: 'Denied',
      message: current.resolutionNote || 'Your appeal was denied.',
    },
    ESCALATED: {
      tone: 'orange' as const,
      title: 'Escalated',
      message:
        current.resolutionNote ||
        'Your appeal has been flagged for senior moderator review.',
    },
  }[current.status];

  return (
    <div className="grid gap-3">
      <Card>
        <p className="mb-3 text-xs text-neutral-500">
          Submitted {new Date(current.submittedAt).toLocaleString()}
        </p>
        <StatusBadge {...status} />
      </Card>

      <Card>
        <SectionTitle>Your submission</SectionTitle>
        <InfoRow label="Rule selected" value={current.ruleSelected} />
        <InfoRow
          label="Understood violation"
          value={current.understoodViolation ? 'Yes' : 'No'}
        />
        <InfoRow label="Explanation" value={current.explanation} />
        <InfoRow label="Commitment" value={current.commitment} />
        {current.additionalNote && (
          <InfoRow label="Additional note" value={current.additionalNote} />
        )}
      </Card>
    </div>
  );
};

const ModView = ({ appeal }: { appeal: AppealHook }) => {
  const [tab, setTab] = useState<'pending' | 'resolved'>('pending');
  const [selected, setSelected] = useState<Appeal | null>(null);
  const [note, setNote] = useState('');
  const list = tab === 'pending' ? appeal.pendingAppeals : appeal.resolvedAppeals;

  if (selected) {
    return (
      <div className="grid gap-3">
        <button
          className="w-fit text-sm font-semibold text-orange-400 hover:text-orange-300"
          onClick={() => {
            setSelected(null);
            setNote('');
          }}
        >
          Back to queue
        </button>

        <Card>
          <p className="text-xs uppercase text-neutral-500">Appeal from</p>
          <h2 className="mt-1 text-xl font-bold text-white">
            u/{selected.username}
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            {new Date(selected.submittedAt).toLocaleString()}
          </p>
        </Card>

        <Card>
          <SectionTitle>Appeal details</SectionTitle>
          <InfoRow label="Rule selected" value={selected.ruleSelected} />
          <InfoRow
            label="Understood violation"
            value={selected.understoodViolation ? 'Yes' : 'No'}
          />
          <InfoRow label="Explanation" value={selected.explanation} />
          <InfoRow label="Commitment" value={selected.commitment} />
          {selected.additionalNote && (
            <InfoRow label="Additional note" value={selected.additionalNote} />
          )}
        </Card>

        <Card>
          <Field label="Response to user">
            <textarea
              className="min-h-24 w-full resize-y rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-orange-500"
              placeholder="Leave blank to use the default message template."
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>

          {appeal.error && (
            <p className="mb-3 rounded border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-200">
              {appeal.error}
            </p>
          )}

          <div className="grid gap-2 sm:grid-cols-3">
            <ActionButton
              label="Approve"
              tone="green"
              disabled={appeal.submitting}
              onClick={async () => {
                await appeal.resolveAppeal({
                  appealId: selected.id,
                  action: 'APPROVED',
                  note,
                });
                setSelected(null);
              }}
            />
            <ActionButton
              label="Deny"
              tone="red"
              disabled={appeal.submitting}
              onClick={async () => {
                await appeal.resolveAppeal({
                  appealId: selected.id,
                  action: 'DENIED',
                  note,
                });
                setSelected(null);
              }}
            />
            <ActionButton
              label="Escalate"
              tone="yellow"
              disabled={appeal.submitting}
              onClick={async () => {
                await appeal.resolveAppeal({
                  appealId: selected.id,
                  action: 'ESCALATED',
                  note,
                });
                setSelected(null);
              }}
            />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex border-b border-neutral-800">
        <Tab
          label={`Pending (${appeal.pendingAppeals.length})`}
          active={tab === 'pending'}
          onClick={() => setTab('pending')}
        />
        <Tab
          label={`Resolved (${appeal.resolvedAppeals.length})`}
          active={tab === 'resolved'}
          onClick={() => setTab('resolved')}
        />
      </div>

      {appeal.loading && (
        <p className="py-8 text-center text-sm text-neutral-500">
          Loading appeals...
        </p>
      )}

      {!appeal.loading && list.length === 0 && (
        <Card>
          <StatusBadge
            tone="neutral"
            title={tab === 'pending' ? 'No pending appeals' : 'No resolved appeals'}
            message={
              tab === 'pending'
                ? 'New submissions will appear here.'
                : 'Resolved appeals will be kept here for recent history.'
            }
          />
        </Card>
      )}

      <div className="grid gap-2">
        {list.map((item) => (
          <button
            key={item.id}
            className="rounded border border-neutral-800 bg-neutral-900 p-3 text-left transition hover:border-orange-700 disabled:cursor-default disabled:hover:border-neutral-800"
            onClick={() => {
              if (tab === 'pending') setSelected(item);
            }}
            disabled={tab !== 'pending'}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-white">u/{item.username}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {new Date(item.submittedAt).toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  {item.ruleSelected}
                </p>
              </div>
              <StatusPill status={item.status} />
            </div>
            <p className="mt-3 line-clamp-2 text-sm text-neutral-400">
              {item.explanation}
            </p>
            {tab === 'pending' && (
              <p className="mt-2 text-xs font-semibold text-orange-400">
                Tap to review
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

const Screen = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-4">
    {children}
  </div>
);

const Card = ({ children }: { children: ReactNode }) => (
  <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-xl">
    {children}
  </section>
);

const Tab = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-bold transition ${
      active
        ? 'border-orange-500 text-orange-400'
        : 'border-transparent text-neutral-500 hover:text-neutral-300'
    }`}
    onClick={onClick}
  >
    {label}
  </button>
);

const Field = ({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: ReactNode;
}) => (
  <label className="mb-4 block">
    <span className="mb-1 block text-sm font-bold text-neutral-300">{label}</span>
    {children}
    {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
  </label>
);

const RadioOption = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) => (
  <button
    type="button"
    className={`rounded border px-3 py-2 text-left text-sm transition ${
      checked
        ? 'border-orange-500 bg-orange-950 text-orange-100'
        : 'border-neutral-700 bg-neutral-950 text-neutral-300 hover:border-neutral-500'
    }`}
    onClick={onChange}
  >
    <span
      className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${
        checked ? 'bg-orange-400' : 'bg-neutral-700'
      }`}
    />
    {label}
  </button>
);

const SectionTitle = ({ children }: { children: ReactNode }) => (
  <p className="mb-3 text-xs font-black uppercase tracking-normal text-neutral-500">
    {children}
  </p>
);

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="mb-3 last:mb-0">
    <p className="text-xs font-bold uppercase text-neutral-500">{label}</p>
    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-200">
      {value}
    </p>
  </div>
);

const StatusBadge = ({
  tone,
  title,
  message,
}: {
  tone: 'green' | 'red' | 'yellow' | 'orange' | 'neutral';
  title: string;
  message: string;
}) => {
  const colors = {
    green: 'text-emerald-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400',
    orange: 'text-orange-400',
    neutral: 'text-neutral-300',
  };

  return (
    <div className="py-6 text-center">
      <p className={`text-lg font-black ${colors[tone]}`}>{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-neutral-400">
        {message}
      </p>
    </div>
  );
};

const StatusPill = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; className: string }> = {
    PENDING: {
      label: 'Pending',
      className: 'bg-yellow-950 text-yellow-300 border-yellow-800',
    },
    APPROVED: {
      label: 'Approved',
      className: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    },
    DENIED: {
      label: 'Denied',
      className: 'bg-red-950 text-red-300 border-red-800',
    },
    ESCALATED: {
      label: 'Escalated',
      className: 'bg-orange-950 text-orange-300 border-orange-800',
    },
  };
  const pill = map[status] ?? {
    label: 'Pending',
    className: 'bg-yellow-950 text-yellow-300 border-yellow-800',
  };

  return (
    <span
      className={`rounded border px-2 py-1 text-xs font-bold ${pill.className}`}
    >
      {pill.label}
    </span>
  );
};

const ActionButton = ({
  label,
  tone,
  onClick,
  disabled,
}: {
  label: string;
  tone: 'green' | 'red' | 'yellow';
  onClick: () => void;
  disabled: boolean;
}) => {
  const colors = {
    green: 'bg-emerald-700 hover:bg-emerald-600',
    red: 'bg-red-700 hover:bg-red-600',
    yellow: 'bg-yellow-700 hover:bg-yellow-600',
  };

  return (
    <button
      className={`rounded px-4 py-3 text-sm font-bold text-white transition disabled:bg-neutral-800 disabled:text-neutral-500 ${colors[tone]}`}
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
