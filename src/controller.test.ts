import {expect, test, vi} from 'vitest';

import {createAlfredController} from './controller.js';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {AssistantState} from './types.js';

const setup = (
  chat = vi.fn().mockResolvedValue({
    answer: 'Answer',
    sources: [
      {
        title: 'Docs',
        url: 'https://example.org'
      }
    ]
  })
) => {
  const states = new Map<string, AssistantState>();
  const flux = {
    dispatch: vi.fn(),
    getState: (key: string, initial: AssistantState) =>
      states.get(key) || initial,
    setState: async (key: string, state: AssistantState) => {
      states.set(key, state);
    }
  } as unknown as FluxFramework;
  const submitSupport = vi.fn().mockResolvedValue({
    ticketNumber: '1'
  });
  const loadFaqs = vi.fn().mockResolvedValue([]);
  const connectivity = {
    chat,
    loadFaqs,
    submitSupport
  };
  const controller = createAlfredController(flux, 'one', connectivity);
  controller.setContext('docs', {
    collection: 'custom'
  });
  return {
    chat,
    connectivity,
    controller,
    flux,
    loadFaqs,
    submitSupport
  };
};

test('answers with host knowledge and rejects duplicate or invalid requests', async () => {
  const {controller, chat} = setup();
  await controller.ask('');
  await controller.ask('x'.repeat(1201));

  expect(chat).not.toHaveBeenCalled();

  const pending = controller.ask('Hello');
  await controller.ask('duplicate');
  await pending;

  expect(chat).toHaveBeenCalledTimes(1);
  expect(chat.mock.calls[0][0]).toMatchObject({
    context: 'docs',
    knowledge: {
      collection: 'custom'
    },
    question: 'Hello'
  });
  expect(controller.read().turns[1].sources?.[0].title).toBe('Docs');

  await controller.clear();

  expect(controller.read().turns).toEqual([]);
});

test('ignores stale answers after a context switch and isolates instances', async () => {
  let resolve!: (value: { answer: string }) => void;
  const {controller, flux, connectivity} = setup(
    vi.fn(
      () =>
        new Promise((r) => {
          resolve = r;
        })
    )
  );
  const pending = controller.ask('old');
  await vi.waitFor(() => expect(resolve).toBeTypeOf('function'));
  controller.setContext('new');
  resolve({
    answer: 'obsolete'
  });
  await pending;

  expect(controller.read().turns).toEqual([]);

  const other = createAlfredController(flux, 'two', connectivity);
  other.setContext('other');

  expect(controller.read().context).toBe('new');

  controller.dispose();
  other.dispose();
});

test('locks ambiguous support submissions and retries with the same request ID', async () => {
  const {controller, submitSupport} = setup();
  await controller.prepareSupport();
  await controller.editDraft('firstName', 'Ada');
  await controller.submit(false);

  expect(submitSupport).not.toHaveBeenCalled();

  submitSupport.mockRejectedValueOnce(new Error('Unknown outcome'));
  await controller.submit(true);
  const id = controller.read().requestId;
  await controller.editDraft('firstName', 'Changed');

  expect(controller.read().draft?.firstName).toBe('Ada');

  await controller.submit(true);

  expect(submitSupport.mock.calls[1][0].requestId).toBe(id);
  expect(controller.read().ticket?.ticketNumber).toBe('1');
});

test('reports invalid responses and retries FAQ loading', async () => {
  const {controller, chat, loadFaqs, submitSupport} = setup();
  chat.mockResolvedValue({});
  await controller.ask('Hi');

  expect(controller.read().error).toBeTruthy();

  loadFaqs.mockRejectedValueOnce(new Error('Offline'));
  await controller.loadFaqs();

  expect(controller.read().faqStatus).toBe('error');

  await controller.loadFaqs();

  expect(controller.read().faqStatus).toBe('ready');

  await controller.prepareSupport();
  submitSupport.mockResolvedValue({});
  await controller.submit(true);

  expect(controller.read().error).toBeTruthy();
});

test('permits omitted optional adapters and safely disposes requests', async () => {
  const {flux, chat} = setup();
  const controller = createAlfredController(flux, 'optional', {
    chat
  });
  controller.setContext('test');
  await controller.loadFaqs();
  await controller.prepareSupport();
  await controller.submit(true);
  await controller.editDraft('email', 'a');

  expect(controller.read().draft).toBeUndefined();

  controller.dispose();
});

test('recovers interrupted controllers while preserving ambiguous support retries', async () => {
  const {controller, flux, connectivity} = setup();
  controller.setContext('resume');
  let resolve!: (value: { answer: string }) => void;
  connectivity.chat.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      })
  );
  const pending = controller.ask('Before replacement');
  await vi.waitFor(() => expect(resolve).toBeTypeOf('function'));
  controller.dispose();
  const replacement = createAlfredController(flux, 'one', connectivity);
  replacement.setContext('resume');

  expect(replacement.read().status).toBe('idle');

  resolve({answer: 'obsolete'});
  await pending;
  await replacement.ask('After replacement');

  expect(replacement.read().turns.at(-1)?.text).toBe('Answer');

  await replacement.prepareSupport();
  let receipt!: (value: { ticketNumber: string }) => void;
  connectivity.submitSupport.mockImplementationOnce(
    () =>
      new Promise((r) => {
        receipt = r;
      })
  );
  const submitting = replacement.submit(true);
  await vi.waitFor(() => expect(receipt).toBeTypeOf('function'));
  const {requestId} = replacement.read();
  replacement.dispose();
  const resumed = createAlfredController(flux, 'one', connectivity);
  resumed.setContext('resume');

  expect(resumed.read().status).toBe('idle');
  expect(resumed.read().locked).toBe(true);

  await resumed.submit(true);

  expect(connectivity.submitSupport.mock.calls.at(-1)?.[0].requestId).toBe(
    requestId
  );

  receipt({ticketNumber: 'obsolete'});
  await submitting;

  expect(resumed.read().ticket?.ticketNumber).toBe('1');
});

test('rejects malformed adapter text and source shapes without rendering unsafe children', async () => {
  const {controller, chat, loadFaqs, submitSupport} = setup();
  chat.mockResolvedValueOnce({answer: {bad: 'object'}});
  await controller.ask('Malformed answer');

  expect(controller.read().error).toBeTruthy();
  expect(controller.read().turns).toHaveLength(1);

  chat.mockResolvedValueOnce({
    answer: 'Valid',
    sources: [{title: {bad: 'object'}, url: 'https://example.org'}]
  });
  await controller.ask('Malformed source');

  expect(controller.read().error).toBeTruthy();

  loadFaqs.mockResolvedValueOnce([
    {answer: {bad: 'object'}, id: '1', question: 'Question', sources: []}
  ]);
  await controller.loadFaqs();

  expect(controller.read().faqStatus).toBe('error');

  await controller.prepareSupport();
  submitSupport.mockResolvedValueOnce({ticketNumber: {bad: 'object'}});
  await controller.submit(true);

  expect(controller.read().ticket).toBeUndefined();
  expect(controller.read().error).toBeTruthy();
});


test('passes configured identity and language to every adapter and keeps defaults', async () => {
  const {connectivity, controller, flux, chat, loadFaqs, submitSupport} = setup();
  await controller.ask('Default');

  expect(chat.mock.calls[0][0]).toMatchObject({language: 'en-US', name: 'Alfred'});

  controller.dispose();
  const custom = createAlfredController(flux, 'configured', connectivity, {language: 'en-GB', name: 'Jeeves'});
  custom.setContext('docs');
  await custom.ask('Hello');
  await custom.loadFaqs();
  await custom.prepareSupport();
  await custom.submit(true);
  for(const adapter of [chat, loadFaqs, submitSupport]) {
    expect(adapter.mock.calls.at(-1)?.[0]).toMatchObject({language: 'en-GB', name: 'Jeeves'});
  }
  custom.dispose();
  const changed = createAlfredController(flux, 'configured', connectivity, {language: 'fr-FR', name: 'Remy'});
  changed.setContext('docs');

  expect(changed.read().turns).toEqual([]);

  await changed.ask('Bonjour');

  expect(chat.mock.calls.at(-1)?.[0]).toMatchObject({language: 'fr-FR', name: 'Remy'});
});
