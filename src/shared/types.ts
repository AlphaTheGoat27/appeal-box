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
  isModerator: boolean;
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
