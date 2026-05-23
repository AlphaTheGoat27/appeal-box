import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

export const Splash = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-4 text-white">
      <div className="w-full max-w-sm rounded-lg border border-neutral-800 bg-neutral-900 p-5 text-center shadow-xl">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded bg-orange-600 text-xl font-black">
          A
        </div>
        <h1 className="text-xl font-bold">AppealBox</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Structured ban appeals and a dedicated moderator queue for r/
          {context.subredditName}.
        </p>
        <button
          className="mt-5 w-full rounded bg-orange-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-700"
          onClick={(event) => requestExpandedMode(event.nativeEvent, 'game')}
        >
          Open AppealBox
        </button>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
