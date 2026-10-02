import {act, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';

import {Alfred} from './Alfred.js';

import type {AssistantState} from '../../types.js';

const mock = vi.hoisted(() => ({
  flux: {
    dispatch: async ({type}: {type: string}) => {
      mock.listeners.get(type)?.forEach((listener) => listener());
    },
    getState: (key: string, initial: AssistantState) => mock.states.get(key) || initial,
    setState: async (key: string, state: AssistantState) => {
      mock.states.set(key, state);
    }
  },
  listeners: new Map<string, Set<() => void>>(),
  states: new Map<string, AssistantState>()
}));
vi.mock('@nlabs/arkhamjs-utils-react', () => ({
  useFlux: () => mock.flux,
  useFluxListener: (event: string, listener: () => void) => {
    useEffect(() => {
      const listeners = mock.listeners.get(event) || new Set();
      listeners.add(listener);
      mock.listeners.set(event, listeners);
      return () => {
        listeners.delete(listener);
      };
    }, [event, listener]);
  }
}));
let root: ReturnType<typeof createRoot>;
let container: HTMLDivElement;
const chat = vi.fn();
const loadFaqs = vi.fn();
const submitSupport = vi.fn();
const connectivity = {
  chat,
  loadFaqs,
  submitSupport
};
const button = (name: string) =>
  [...document.querySelectorAll('button')].find(
    (el) => el.textContent === name || el.getAttribute('aria-label') === name
  )!;
const click = async (name: string) => {
  await act(async () => button(name).click());
};
const input = async (selector: string, value: string) => {
  await act(async () => {
    const el = document.querySelector(selector) as HTMLInputElement;
    Object.getOwnPropertyDescriptor(
      el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
      'value'
    )!.set!.call(el, value);
    el.dispatchEvent(
      new Event('input', {
        bubbles: true
      })
    );
  });
};

beforeEach(() => {
  mock.states.clear();
  mock.listeners.clear();
  chat.mockReset().mockResolvedValue({
    answer: 'Custom answer',
    sources: [
      {
        title: 'Guide',
        url: 'https://example.org'
      },
      {
        title: 'unsafe',
        url: 'javascript:alert(1)'
      }
    ]
  });
  loadFaqs.mockReset().mockResolvedValue([
    {
      answer: 'FAQ answer',
      id: '1',
      question: 'FAQ question',
      sources: [
        {
          title: 'FAQ source',
          url: 'https://example.org/faq'
        }
      ]
    }
  ]);
  submitSupport.mockReset().mockResolvedValue({
    ticketNumber: 'A1'
  });
  vi.stubGlobal('matchMedia', () => ({
    addEventListener: vi.fn(),
    matches: false,
    removeEventListener: vi.fn()
  }));
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1)
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

test('shows host prompts, answers with safe sources, switches FAQ and preserves draft', async () => {
  await act(async () =>
    root.render(
      <Alfred
        branding={{
          description: 'Custom assistant',
          email: 'help@example.org',
          prompts: ['Start here'],
          welcomeDescription: 'Your docs',
          welcomeTitle: 'Welcome'
        }}
        connectivity={connectivity}
        context="custom"
      />
    )
  );
  await click('Open Ask Alfred');

  expect(document.body.textContent).toContain('Custom assistant');

  await input('textarea', 'Draft');
  await click('FAQ');

  expect(document.body.textContent).toContain('FAQ question');

  await click('Chat');

  expect(document.querySelector('textarea')!.value).toBe('Draft');

  await click('Start here↗');

  expect(document.body.textContent).toContain('Custom answer');
  expect(document.querySelector('a[href^="javascript:"]')).toBeNull();

  await click('Clear conversation');
  await click('Close Ask Alfred');

  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

test('supports confirmation, locked retry and start over', async () => {
  await act(async () =>
    root.render(
      <Alfred
        branding={{
          supportSuccess: 'Sent to your team'
        }}
        connectivity={connectivity}
        context="custom"
      />
    )
  );
  await click('Open Ask Alfred');
  await click('Send a message to support');
  await input('[name="firstName"]', 'Ada');
  await input('[name="email"]', 'ada@example.org');
  await input('[name="message"]', 'Help');
  await act(async () => document.querySelector<HTMLInputElement>('.nx-ask-confirm input')!.click());
  submitSupport.mockRejectedValueOnce(new Error('Try again'));
  await act(async () =>
    document.querySelector('.nx-ask-support')!.dispatchEvent(
      new Event('submit', {
        bubbles: true,
        cancelable: true
      })
    )
  );

  expect(document.body.textContent).toContain('Try again');

  await click('Retry same message');

  expect(document.body.textContent).toContain('Sent to your team');

  await click('Start a new conversation');
  await click('Send a message to support');
  await click('Back to conversation');
});

test('hides absent features, submits typed questions and uses defaults', async () => {
  await act(async () =>
    root.render(
      <Alfred
        connectivity={{
          chat
        }}
        context="custom"
        theme={{
          accent: '#123456',
          footer: '#eee',
          header: '#fff'
        }}
      />
    )
  );
  await click('Open Ask Alfred');

  expect(button('FAQ')).toBeUndefined();
  expect(button('Send a message to support')).toBeUndefined();

  await input('textarea', 'Hello');
  await act(async () =>
    document.querySelector('.nx-ask-compose')!.dispatchEvent(
      new Event('submit', {
        bubbles: true,
        cancelable: true
      })
    )
  );

  expect(chat).toHaveBeenCalled();
});

test('retries FAQ failure, shows empty results and queued support receipts', async () => {
  loadFaqs.mockRejectedValueOnce(new Error('Offline'));
  await act(async () =>
    root.render(<Alfred connectivity={connectivity} context="custom" instanceId="explicit" />)
  );
  await click('Open Ask Alfred');
  await click('FAQ');

  expect(document.body.textContent).toContain('temporarily unavailable');

  loadFaqs.mockResolvedValue([]);
  await click('Try again');

  expect(document.body.textContent).toContain('No FAQs yet');

  await click('Chat');
  await click('Send a message to support');
  await act(async () => document.querySelector<HTMLInputElement>('.nx-ask-confirm input')!.click());
  submitSupport.mockResolvedValue({
    queued: true
  });
  await act(async () =>
    document.querySelector('.nx-ask-support')!.dispatchEvent(
      new Event('submit', {
        bubbles: true,
        cancelable: true
      })
    )
  );

  expect(document.body.textContent).toContain('Your message is saved.');
});


test('configures assistant identity and language without changing other instances', async () => {
  await act(async () => root.render(
    <Alfred connectivity={connectivity} context="custom" language="en-GB" name="Jeeves" />
  ));
  await click('Open Ask Jeeves');

  expect(document.querySelector('.nx-ask-panel')?.getAttribute('lang')).toBe('en-GB');
  expect(document.body.textContent).toContain('ask jeeves');
  expect(document.body.textContent).toContain('I’m Jeeves, your AI assistant.');
  expect(document.querySelector('textarea')?.getAttribute('placeholder')).toBe('Ask Jeeves…');
  expect(document.querySelector('.nx-ask-mark')?.textContent?.trim()).toBe('J.');

  await input('textarea', 'Hello');
  await act(async () => document.querySelector('.nx-ask-compose')!.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true})));

  expect(chat.mock.calls[0][0]).toMatchObject({language: 'en-GB', name: 'Jeeves'});
  expect(document.querySelector('.nx-ask-assistant strong')?.textContent).toBe('Jeeves');

  await click('Close Ask Jeeves');
  await act(async () => root.render(<Alfred connectivity={connectivity} context="custom" />));
  await click('Open Ask Alfred');

  expect(document.querySelector('.nx-ask-panel')?.getAttribute('lang')).toBe('en-US');
});
