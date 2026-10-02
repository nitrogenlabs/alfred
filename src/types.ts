export interface Source {
  title: string;
  url: string;
}
export interface Turn {
  role: 'user' | 'assistant';
  sources?: Source[];
  text: string;
}
export interface Draft {
  company: string;
  email: string;
  firstName: string;
  lastName: string;
  message: string;
  phone: string;
}
export interface FaqItem {
  answer: string;
  id: string;
  question: string;
  sources: Source[];
}
export interface RequestContext {
  context: string;
  knowledge?: unknown;
  signal: AbortSignal;
}
export interface ChatRequest extends RequestContext {
  history: Turn[];
  question: string;
}
export interface SupportRequest extends RequestContext {
  confirmed: boolean;
  draft: Draft;
  requestId: string;
}
export interface TicketReceipt {
  queued?: boolean;
  ticketNumber?: string;
}
export interface AlfredConnectivity {
  chat: (request: ChatRequest) => Promise<{
    answer: string;
    sources?: Source[];
  }>;
  loadFaqs?: (request: RequestContext) => Promise<FaqItem[]>;
  submitSupport?: (request: SupportRequest) => Promise<TicketReceipt>;
}
export interface AssistantState {
  context: string;
  knowledge?: unknown;
  draft?: Draft;
  error: string;
  faqError: string;
  faqs: FaqItem[];
  faqStatus: 'idle' | 'loading' | 'ready' | 'error';
  locked: boolean;
  requestId?: string;
  status: 'idle' | 'answering' | 'submitting';
  ticket?: TicketReceipt;
  turns: Turn[];
}
export interface AlfredBranding {
  description?: string;
  email?: string;
  prompts?: string[];
  welcomeTitle?: string;
  welcomeDescription?: string;
  supportSuccess?: string;
}
export interface AlfredProps {
  branding?: AlfredBranding;
  connectivity: AlfredConnectivity;
  context: string;
  instanceId?: string;
  knowledge?: unknown;
  theme?: Partial<Record<'accent' | 'header' | 'footer', string>>;
}
