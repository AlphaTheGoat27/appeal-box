import { context, reddit } from '@devvit/web/server';

export const createPost = async () => {
  return reddit.submitCustomPost({
    subredditName: context.subredditName,
    title: 'AppealBox - Submit or Check Your Ban Appeal',
    splash: {
      appDisplayName: 'AppealBox',
    },
  });
};
