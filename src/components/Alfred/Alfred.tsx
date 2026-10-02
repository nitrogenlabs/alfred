import {useFlux, useFluxListener} from '@nlabs/arkhamjs-utils-react';
import {Button, Dialog, DialogTitle, Tabs, Textarea} from '@nlabs/gothamui';
import {useCallback, useEffect, useId, useMemo, useRef, useState} from 'react';

import {createAlfredController} from '../../controller.js';
import {AlfredFaq} from '../AlfredFaq/AlfredFaq.js';
import {AlfredLogo} from '../AlfredLogo/AlfredLogo.js';
import {AlfredWaveform} from '../AlfredWaveform/AlfredWaveform.js';

import type {CSSProperties, FormEvent} from 'react';
import type {AlfredProps, Draft} from '../../types.js';

export const Alfred = ({branding = {}, connectivity, context, instanceId, knowledge, language = 'en-US', name = 'Alfred', theme}: AlfredProps) => {
  const flux = useFlux();
  const generatedId = useId();
  const id = instanceId || generatedId;
  const titleId = `alfred-title-${generatedId}`;
  const descriptionId = `alfred-description-${generatedId}`;
  const questionId = `alfred-question-${generatedId}`;
  const actions = useMemo(
    () => createAlfredController(flux, id, connectivity, {language, name}),
    [flux, id, connectivity, language, name]
  );
  const [state, setState] = useState(actions.read);
  const styles: CSSProperties & Record<`--alfred-${string}`, string | undefined> = {
    '--alfred-accent': theme?.accent,
    '--alfred-footer': theme?.footer,
    '--alfred-header': theme?.header
  };
  const [open, setOpen] = useState(false);
  const [launcherHovered, setLauncherHovered] = useState(false);
  const [launcherFocused, setLauncherFocused] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [support, setSupport] = useState(false);
  const [question, setQuestion] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useFluxListener(
    actions.event,
    useCallback(() => setState(actions.read()), [actions])
  );
  useEffect(() => {
    actions.setContext(context, knowledge);
    setState(actions.read());
    setSupport(false);
    setQuestion('');
    setConfirmed(false);
    setActiveTab('chat');
  }, [actions, context, knowledge]);
  useEffect(() => () => actions.dispose(), [actions]);
  useEffect(() => {
    if(open && activeTab === 'faq') {
      void actions.loadFaqs();
    }
  }, [actions, activeTab, open]);
  useEffect(() => {
    end.current?.scrollIntoView?.({
      block: 'nearest'
    });
  }, [state.turns.length, state.status]);
  const busy = state.status !== 'idle';
  const ask = (event: FormEvent) => {
    event.preventDefault();
    if(question.trim() && !busy) {
      void actions.ask(question);
      setQuestion('');
    }
  };
  const reset = () => {
    void actions.clear();
    setSupport(false);
    setConfirmed(false);
    setQuestion('');
  };
  const handoff = () => {
    void actions.prepareSupport();
    setSupport(true);
    setConfirmed(false);
  };
  const suggestions = branding.prompts || [
    'What can you help me with?',
    'How do I get started?',
    'Where can I learn more?'
  ];
  return (
    <>
      <Button
        aria-label={`Open Ask ${name}`}
        className="nx-ask-launch"
        lang={language}
        onBlur={() => setLauncherFocused(false)}
        onClick={() => setOpen(true)}
        onFocus={() => setLauncherFocused(true)}
        onMouseEnter={() => setLauncherHovered(true)}
        onMouseLeave={() => setLauncherHovered(false)}
        style={styles}
        type="button"
      >
        <span aria-hidden="true" className="nx-alfred-idle">
          <AlfredLogo active={!open && !launcherHovered && !launcherFocused} className="nx-alfred-swirl" />
        </span>
        <span aria-hidden="true" className="nx-alfred-active">
          <AlfredWaveform active={!open && (launcherHovered || launcherFocused)} />
          <span className="nx-alfred-label">ask {name.toLowerCase()}</span>
        </span>
      </Button>
      <Dialog
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        className="nx-ask-panel"
        lang={language}
        onClose={setOpen}
        open={open}
        size="lg"
        style={styles}
      >
        <header className="nx-ask-header">
          <div className="nx-ask-brand">
            <AlfredLogo active={open} className="nx-ask-brand-logo" />
            <div>
              <DialogTitle id={titleId}>
                ask <strong>{name.toLowerCase()}</strong>
              </DialogTitle>
              <p id={descriptionId}>{branding.description || `I’m ${name}, your AI assistant.`}</p>
            </div>
          </div>
          <button
            aria-label={`Close Ask ${name}`}
            className="nx-ask-close"
            onClick={() => setOpen(false)}
            type="button"
          >
            ×
          </button>
        </header>
        {connectivity.loadFaqs && !support && !state.ticket ? (
          <Tabs
            ariaLabel={`${name} views`}
            className="nx-ask-tabs"
            items={[
              {
                current: activeTab === 'chat',
                id: 'chat',
                label: 'Chat'
              },
              {
                current: activeTab === 'faq',
                id: 'faq',
                label: 'FAQ'
              }
            ]}
            onTabChange={(item) => setActiveTab(item.id!)}
          />
        ) : null}
        <div className="nx-ask-body">
          {state.ticket ? (
            <div className="nx-ask-success" role="status">
              <h3>
                {state.ticket.queued
                  ? 'Your message is saved.'
                  : `Ticket ${state.ticket.ticketNumber} created.`}
              </h3>
              <p>
                {state.ticket.queued
                  ? 'Delivery to support is pending. We’ll retry automatically; you don’t need to submit it again.'
                  : branding.supportSuccess || 'Your message and contact details have been sent to support.'}
              </p>
              <button onClick={reset} type="button">
                Start a new conversation
              </button>
            </div>
          ) : support && state.draft ? (
            <form
              className="nx-ask-support"
              onSubmit={(event) => {
                event.preventDefault();
                void actions.submit(confirmed);
              }}
            >
              <div>
                <h3>Send a message to support</h3>
                <p>
                  Review your details and message. Your message will be sent through this site’s support
                  service.
                </p>
              </div>
              <div className="nx-ask-fields">
                {(
                  [
                    ['firstName', 'First name', 'text', true],
                    ['lastName', 'Last name', 'text', false],
                    ['email', 'Email', 'email', true],
                    ['phone', 'Callback number (optional)', 'tel', false],
                    ['company', 'Company (optional)', 'text', false]
                  ] as const
                ).map(([name, label, type, required]) => (
                  <label key={name}>
                    {label}
                    <input
                      autoComplete={
                        {
                          company: 'organization',
                          email: 'email',
                          firstName: 'given-name',
                          lastName: 'family-name',
                          phone: 'tel'
                        }[name]
                      }
                      disabled={state.locked}
                      maxLength={name === 'email' ? 254 : name === 'phone' ? 24 : 160}
                      name={name}
                      onChange={(event) => void actions.editDraft(name as keyof Draft, event.target.value)}
                      required={required}
                      type={type}
                      value={state.draft![name]}
                    />
                  </label>
                ))}
              </div>
              <label>
                Your message
                <Textarea
                  disabled={state.locked}
                  maxLength={4000}
                  name="message"
                  onChange={(event) => void actions.editDraft('message', event.target.value)}
                  required
                  rows={5}
                  value={state.draft.message}
                />
              </label>
              <label className="nx-ask-confirm">
                <input
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  required
                  type="checkbox"
                />
                <span>
                  I confirm these details and want to send this message to support. This does not subscribe me
                  to marketing email.
                </span>
              </label>
              <Button className="nx-ask-primary" disabled={busy || !confirmed} type="submit">
                {busy ? 'Saving message…' : state.locked ? 'Retry same message' : 'Confirm and send'}
              </Button>
              {state.locked ? (
                <button disabled={busy} onClick={reset} type="button">
                  Start over
                </button>
              ) : (
                <button onClick={() => setSupport(false)} type="button">
                  Back to conversation
                </button>
              )}
            </form>
          ) : activeTab === 'faq' ? (
            <section aria-label="Frequently asked questions">
              <AlfredFaq actions={actions} state={state} />
            </section>
          ) : (
            <>
              {!state.turns.length ? (
                <div className="nx-ask-welcome">
                  <span aria-hidden="true" className="nx-ask-mark">
                    {name.charAt(0).toUpperCase()}.
                  </span>
                  <h3>{branding.welcomeTitle || 'How can I help?'}</h3>
                  <p>{branding.welcomeDescription || 'Ask a question. I’ll find answers with sources.'}</p>
                  <div className="nx-ask-suggestions">
                    {suggestions.map((suggestion) => (
                      <button
                        disabled={busy}
                        key={suggestion}
                        onClick={() => void actions.ask(suggestion)}
                        type="button"
                      >
                        {suggestion}
                        <span aria-hidden="true">↗</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div aria-live="polite" className="nx-ask-turns" role="log">
                  {state.turns.map((turn, index) => (
                    <article className={`nx-ask-turn nx-ask-${turn.role}`} key={index}>
                      <strong>{turn.role === 'user' ? 'You' : name}</strong>
                      <p>{turn.text}</p>
                      {turn.sources?.length ? (
                        <nav aria-label="Answer sources">
                          {turn.sources.map((source) => (
                            <a href={source.url} key={source.url} rel="noopener noreferrer" target="_blank">
                              {source.title || new URL(source.url).hostname} ↗
                            </a>
                          ))}
                        </nav>
                      ) : null}
                    </article>
                  ))}
                  {state.status === 'answering' ? (
                    <p role="status">Looking through the documentation…</p>
                  ) : null}
                  <div ref={end} />
                </div>
              )}
              <form className="nx-ask-compose" onSubmit={ask}>
                <label className="nx-ask-sr-only" htmlFor={questionId}>
                  Your question
                </label>
                <Textarea
                  disabled={busy}
                  id={questionId}
                  maxLength={1200}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder={`Ask ${name}…`}
                  required
                  rows={2}
                  value={question}
                />
                <Button className="nx-ask-primary" disabled={busy || !question.trim()} type="submit">
                  Ask
                </Button>
              </form>
              <div className="nx-ask-tools">
                <>
                  {connectivity.submitSupport ? (
                    <button disabled={busy} onClick={handoff} type="button">
                      Send a message to support
                    </button>
                  ) : null}
                </>
                {state.turns.length ? (
                  <button disabled={busy} onClick={reset} type="button">
                    Clear conversation
                  </button>
                ) : null}
              </div>
            </>
          )}
          {state.error ? (
            <p className="nx-ask-error" role="alert">
              {state.error}
            </p>
          ) : null}
        </div>
        <footer className="nx-ask-footer">
          AI can make mistakes. Check the linked sources. Don’t share passwords or payment details.{' '}
          {branding.email ? <a href={`mailto:${branding.email}`}>Email support</a> : null}
        </footer>
      </Dialog>
    </>
  );
};
