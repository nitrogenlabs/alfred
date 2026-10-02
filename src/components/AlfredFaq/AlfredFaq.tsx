import {FaqSection} from '@nlabs/gothamui';

import type {createAlfredController} from '../../controller.js';
import type {AssistantState} from '../../types.js';

export const AlfredFaq = ({
  actions,
  state
}: {
  readonly actions: Pick<ReturnType<typeof createAlfredController>, 'loadFaqs'>;
  readonly state: AssistantState;
}) => (
  <div>
    {state.faqStatus === 'idle' || state.faqStatus === 'loading' ? (
      <p role="status">Loading frequently asked questions…</p>
    ) : state.faqStatus === 'error' ? (
      <p role="status">
        FAQs are temporarily unavailable. You can still ask {state.name || 'Alfred'}.{' '}
        <button onClick={() => void actions.loadFaqs()} type="button">
          Try again
        </button>
      </p>
    ) : state.faqs.length ? (
      <FaqSection
        faqs={state.faqs.map((item) => ({
          answer: (
            <details>
              <summary>Read answer</summary>
              <p>{item.answer}</p>
              <nav aria-label={`Sources for ${item.question}`}>
                {item.sources.map((source) => (
                  <a href={source.url} key={source.url} rel="noopener noreferrer" target="_blank">
                    {source.title}
                  </a>
                ))}
              </nav>
            </details>
          ),
          id: item.id,
          question: item.question
        }))}
        title="Most asked questions"
      />
    ) : (
      <p>No FAQs yet. Ask {state.name || 'Alfred'} a question.</p>
    )}
  </div>
);
