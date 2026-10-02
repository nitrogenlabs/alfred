# @nlabs/alfred

A living AI assistant for your website. Alfred provides the UI and conversation flow; your app supplies the knowledge and connectivity.

Built with React 19, GothamUI, and ArkhamJS. Includes the flowing translucent Alfred logo, still-image fallback, accessible modal, Chat/FAQ tabs, citations, and optional support handoff.

## Install

```sh
npm install @nlabs/alfred @nlabs/gothamui @nlabs/arkhamjs @nlabs/arkhamjs-utils-react react react-dom
```

Use your existing GothamUI/ArkhamJS provider and Tailwind v4 setup. Alfred reads the Flux instance with `useFlux`, so mount it within `FluxProvider` from `@nlabs/arkhamjs-utils-react`. Do not create a second store when your app already supplies one. Initialize GothamUI’s exported `i18n` with `initReactI18next` if your app does not already initialize it (see `examples/basic/src/index.tsx`). Import Alfred's CSS after GothamUI/base styles:

```tsx
import {Alfred} from '@nlabs/alfred';
import type {AlfredConnectivity} from '@nlabs/alfred';
import '@nlabs/alfred/styles.css';

const knowledge = {collection: 'public-product-docs'};
const connectivity: AlfredConnectivity = {
  chat: async ({context, history, knowledge, question, signal}) => {
    // Your SDK calls your backend. No provider keys belong in browser code.
    return myClient.ask({context, history, knowledge, question, signal});
  },
};

// Inside your application's existing providers:
<Alfred
  branding={{
    description: 'I’m Alfred, your product assistant.',
    prompts: ['What can you help me with?', 'How do I get started?'],
  }}
  connectivity={connectivity}
  context="my-product"
  knowledge={knowledge}
/>
```

`myClient` above is your own backend client. Keep `connectivity` and `knowledge` referentially stable (module constants or `useMemo`) so rendering does not reset the conversation. Changing `context` or knowledge identity clears previous context and cancels/ignores its pending results. Use distinct `instanceId` values for multiple assistants; omitted IDs are generated automatically.

## Knowledge and connectivity

Alfred does not ingest documents, choose a model, or retrieve private data. `knowledge` is optional opaque metadata/public content passed to your callbacks. Your backend chooses how to retrieve evidence and generate answers.

Chat receives `{context, history, knowledge, question, signal}` and returns `{answer, sources?: [{title, url}]}`. History is bounded to the last six turns and each text is limited to 2,500 characters. Questions have a 1,200-character limit. Only HTTP(S) source links are displayed. Responses are rendered as text.

For NLabs apps, implement callbacks through MetropolisJS/Rip-Hunter. Other apps can use their own SDK. Pass cancellation to your client where supported; Alfred also ignores obsolete responses.

### Optional FAQs

```tsx
const connectivity: AlfredConnectivity = {
  chat: request => myClient.ask(request),
  loadFaqs: async ({context, signal}) => myClient.faqs({context, signal}),
};
```

FAQ results are `{id, question, answer, sources: [{title, url}]}` objects. The FAQ tab is hidden when `loadFaqs` is omitted. Loading failures expose a retry; up to 15 items are displayed.

### Optional support

```tsx
const connectivity: AlfredConnectivity = {
  chat: request => myClient.ask(request),
  submitSupport: ({context, draft, requestId, confirmed, signal}) =>
    myClient.createTicket({context, ...draft, requestId, confirmed, signal}),
};
```

`draft` includes first/last name, email, phone, company, and message. Return `{ticketNumber}` for confirmed delivery or `{queued: true}` for durable acceptance with delivery pending. A failed/ambiguous submission locks details and retains the same request ID for retry. Your backend must implement idempotency and actual durable delivery. The package does not send emails or create CRM records by itself. Without `submitSupport`, the form is hidden.

## Branding and theme

`branding` supports `description`, `email`, `prompts`, `welcomeTitle`, `welcomeDescription`, and `supportSuccess`. `theme` supports CSS values for `accent`, `header`, and `footer`. Alfred's name and default artwork remain recognizable. Import `AlfredLogo` separately to reuse the animated mark:

```tsx
import {AlfredLogo} from '@nlabs/alfred';
<AlfredLogo active className="my-logo-size" />
```

Give the logo a width and height. Animation pauses when inactive or the document is hidden. Reduced motion and animation failure use the original still. Conversation state is stored through scoped ArkhamJS actions and Flux events; credentials and backend authorization stay with your app.

## NitrogenX in use

![Alfred on NitrogenX](docs/assets/nitrogenx-desktop.png)
![Alfred on mobile](docs/assets/nitrogenx-mobile.png)

[Documentation](https://alfred.nitrogenx.co) · [Source](https://github.com/nitrogenlabs/alfred)

## Development

```sh
npm install
npm test
npm run typecheck
npm run lint
npm run build
npm pack
node scripts/verify-consumer.mjs # installs the packed example and runs Playwright
npm start # opens the prepared example on localhost:3301
```

Lex handles compilation and Vitest tests. The package ships ESM, TypeScript declarations, CSS, and local assets. Use the NitrogenX integration and installed tarball consumer to verify desktop/mobile happy paths with Playwright.

MIT. Outfit font is licensed under the SIL Open Font License; see the bundled font license.
