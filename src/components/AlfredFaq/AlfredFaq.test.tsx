import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect, test} from 'vitest';

import {initialAssistant} from '../../controller.js';
import {AlfredFaq} from './AlfredFaq.js';

import type {createAlfredController} from '../../controller.js';

test('keeps FAQ failures recoverable without interrupting chat', async () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  let retried = false;
  const actions: Pick<ReturnType<typeof createAlfredController>, 'loadFaqs'> = {
    loadFaqs: async () => {
      retried = true;
    }
  };
  await act(async () =>
    root.render(
      <AlfredFaq
        actions={actions}
        state={{
          ...initialAssistant(),
          faqStatus: 'error'
        }}
      />
    )
  );
  await act(async () => container.querySelector('button')!.click());

  expect(retried).toBe(true);
  expect(container.textContent).toContain('still ask Alfred');

  await act(async () => root.unmount());
});


test('uses the configured name in empty and unavailable FAQs', async () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const state = {...initialAssistant('docs', undefined, {name: 'Jeeves'}), faqStatus: 'ready' as const};
  const actions = {loadFaqs: async () => {}};
  await act(async () => root.render(<AlfredFaq actions={actions} state={state} />));

  expect(container.textContent).toContain('Ask Jeeves a question.');

  await act(async () => root.render(<AlfredFaq actions={actions} state={{...state, faqStatus: 'error'}} />));

  expect(container.textContent).toContain('still ask Jeeves.');

  await act(async () => root.unmount());
});
