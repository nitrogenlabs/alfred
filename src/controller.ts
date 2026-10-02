import type {FluxFramework} from '@nlabs/arkhamjs';
import type {
  AlfredConnectivity,
  AssistantState,
  Draft,
  Source
} from './types.js';

export const initialAssistant = (
  context = '',
  knowledge?: unknown
): AssistantState => ({
  context,
  error: '',
  faqError: '',
  faqStatus: 'idle',
  faqs: [],
  knowledge,
  locked: false,
  status: 'idle',
  turns: []
});
const errorText = (error: unknown, fallback: string): string =>
  (error instanceof Error ? error.message.slice(0, 500) : fallback);
export const safeSources = (sources: unknown): Source[] => {
  if(!Array.isArray(sources)) {
    throw new Error('Source links could not be read. Please try again.');
  }
  return sources.filter((source) => {
    if(
      !source ||
      typeof source.title !== 'string' ||
      typeof source.url !== 'string'
    ) {
      throw new Error('Source links could not be read. Please try again.');
    }
    try {
      return ['https:', 'http:'].includes(new URL(source.url).protocol);
    } catch{
      return false;
    }
  });
};
export const createAlfredController = (
  flux: FluxFramework,
  instanceId: string,
  connectivity: AlfredConnectivity
) => {
  const key = `alfred:${instanceId}`;
  const event = `ALFRED_CHANGED:${instanceId}`;
  let state: AssistantState = flux.getState(key, initialAssistant());
  let {knowledge} = state;
  let firstActivation = true;
  let generation = 0;
  let disposed = false;
  const requests = new Set<AbortController>();
  let writes = Promise.resolve();
  const write = (next: AssistantState): Promise<void> => {
    state = next;
    writes = writes.then(async () => {
      await flux.setState(key, next);
      await flux.dispatch({
        type: event
      });
    });
    return writes;
  };
  const cancel = () => {
    generation++;
    requests.forEach((request) => request.abort());
    requests.clear();
  };
  const begin = () => {
    const request = new AbortController();
    requests.add(request);
    return {
      context: state.context,
      generation,
      knowledge,
      request,
      signal: request.signal
    };
  };
  const current = (operation: ReturnType<typeof begin>) =>
    !disposed &&
    operation.generation === generation &&
    !operation.signal.aborted;
  return {
    ask: async (question: string): Promise<void> => {
      if(
        disposed ||
        state.status !== 'idle' ||
        !question.trim() ||
        question.length > 1200
      ) {
        return;
      }
      const history = state.turns;
      const operation = begin();
      await write({
        ...state,
        error: '',
        status: 'answering',
        turns: [
          ...history,
          {
            role: 'user' as const,
            text: question.trim()
          }
        ].slice(-40)
      });
      if(!current(operation)) {
        return;
      }
      try {
        const response = await connectivity.chat({
          context: operation.context,
          history: history.slice(-6).map((turn) => ({
            ...turn,
            text: turn.text.slice(0, 2500)
          })),
          knowledge: operation.knowledge,
          question: question.trim(),
          signal: operation.signal
        });
        if(typeof response?.answer !== 'string' || !response.answer.trim()) {
          throw new Error('No answer was returned. Please try again.');
        }
        if(current(operation)) {
          await write({
            ...state,
            status: 'idle',
            turns: [
              ...state.turns,
              {
                role: 'assistant',
                sources: safeSources(response.sources || []),
                text: response.answer
              }
            ]
          });
        }
      } catch(error) {
        if(current(operation)) {
          await write({
            ...state,
            error: errorText(error, 'Please try again.'),
            status: 'idle'
          });
        }
      } finally {
        requests.delete(operation.request);
      }
    },
    clear: async (): Promise<void> => {
      if(!disposed && state.status === 'idle') {
        cancel();
        await write(initialAssistant(state.context, knowledge));
      }
    },
    dispose: () => {
      disposed = true;
      cancel();
    },
    editDraft: async (name: keyof Draft, value: string): Promise<void> => {
      if(!disposed && state.draft && !state.locked) {
        await write({
          ...state,
          draft: {
            ...state.draft,
            [name]: value
          }
        });
      }
    },
    event,
    loadFaqs: async (): Promise<void> => {
      if(
        disposed ||
        !connectivity.loadFaqs ||
        state.faqStatus === 'loading' ||
        state.faqStatus === 'ready'
      ) {
        return;
      }
      const operation = begin();
      await write({
        ...state,
        faqError: '',
        faqStatus: 'loading'
      });
      if(!current(operation)) {
        return;
      }
      try {
        const items = await connectivity.loadFaqs({
          context: operation.context,
          knowledge: operation.knowledge,
          signal: operation.signal
        });
        if(
          !Array.isArray(items) ||
          items.some(
            (item) =>
              !item ||
              typeof item.id !== 'string' ||
              typeof item.question !== 'string' ||
              typeof item.answer !== 'string'
          )
        ) {
          throw new Error('FAQs could not be loaded.');
        }
        if(current(operation)) {
          await write({
            ...state,
            faqStatus: 'ready',
            faqs: items.slice(0, 15).map((item) => ({
              ...item,
              sources: safeSources(item.sources || [])
            }))
          });
        }
      } catch(error) {
        if(current(operation)) {
          await write({
            ...state,
            faqError: errorText(error, 'FAQs could not be loaded.'),
            faqStatus: 'error'
          });
        }
      } finally {
        requests.delete(operation.request);
      }
    },
    prepareSupport: async (): Promise<void> => {
      if(
        disposed ||
        !connectivity.submitSupport ||
        state.draft ||
        state.status !== 'idle'
      ) {
        return;
      }
      await write({
        ...state,
        draft: {
          company: '',
          email: '',
          firstName: '',
          lastName: '',
          message: state.turns
            .filter((turn) => turn.role === 'user')
            .map((turn) => turn.text)
            .join('\n\n')
            .slice(0, 4000),
          phone: ''
        },
        error: '',
        requestId: `web-${crypto.randomUUID()}`
      });
    },
    read: () => state,
    setContext: (context: string, nextKnowledge?: unknown) => {
      const resuming = disposed || firstActivation;
      firstActivation = false;
      disposed = false;
      if(state.context === context && knowledge === nextKnowledge) {
        if(
          resuming &&
          (state.status !== 'idle' || state.faqStatus === 'loading')
        ) {
          void write({
            ...state,
            faqStatus: state.faqStatus === 'loading' ? 'idle' : state.faqStatus,
            status: 'idle'
          });
        }
        return;
      }
      knowledge = nextKnowledge;
      cancel();
      void write(initialAssistant(context, nextKnowledge));
    },
    submit: async (confirmed: boolean): Promise<void> => {
      if(
        disposed ||
        !connectivity.submitSupport ||
        !confirmed ||
        !state.draft ||
        !state.requestId ||
        state.status !== 'idle' ||
        state.ticket
      ) {
        return;
      }
      const operation = begin();
      const draft = {
        ...state.draft
      };
      const {requestId} = state;
      await write({
        ...state,
        error: '',
        locked: true,
        status: 'submitting'
      });
      if(!current(operation)) {
        return;
      }
      try {
        const receipt = await connectivity.submitSupport({
          confirmed,
          context: operation.context,
          draft,
          knowledge: operation.knowledge,
          requestId,
          signal: operation.signal
        });
        if(
          (typeof receipt?.ticketNumber !== 'string' ||
            !receipt.ticketNumber.trim()) &&
          receipt?.queued !== true
        ) {
          throw new Error(
            'Submission could not be confirmed. Retry sends the same details.'
          );
        }
        if(current(operation)) {
          await write({
            ...state,
            status: 'idle',
            ticket: {
              queued: receipt.queued === true,
              ticketNumber:
                typeof receipt.ticketNumber === 'string'
                  ? receipt.ticketNumber
                  : undefined
            }
          });
        }
      } catch(error) {
        if(current(operation)) {
          await write({
            ...state,
            error: errorText(error, 'Please retry with the same details.'),
            status: 'idle'
          });
        }
      } finally {
        requests.delete(operation.request);
      }
    }
  };
};
