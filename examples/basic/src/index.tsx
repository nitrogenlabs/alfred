import {Alfred} from '@nlabs/alfred';
import {Flux} from '@nlabs/arkhamjs';
import {FluxProvider} from '@nlabs/arkhamjs-utils-react';
import {i18n, initReactI18next} from '@nlabs/gothamui';
import {createRoot} from 'react-dom/client';
import '@nlabs/gothamui/styles/tailwind.css';
import '@nlabs/alfred/styles.css';
import './styles.css';
import type {AlfredConnectivity} from '@nlabs/alfred';
if(!i18n.isInitialized) await i18n.use(initReactI18next).init({fallbackLng:'en',lng:'en',resources:{en:{translation:{}}}});
const parameters = new URLSearchParams(window.location.search);
const name = parameters.get('name') || undefined;
const language = parameters.get('language') || undefined;
const knowledge = {collection:'example-product-guide'};
const connectivity: AlfredConnectivity = {
  chat:async({knowledge,language,name,question})=>({answer:`${name} (${language}) demo response from ${(knowledge as {collection:string}).collection}: ${question}`,sources:[{title:'Example documentation',url:'https://example.org/docs'}]}),
  loadFaqs:async()=>[{answer:'Your app supplies the knowledge and backend connection.',id:'1',question:'Who owns the knowledge?',sources:[]}],
  submitSupport:async()=>({ticketNumber:'DEMO-1'})
};
createRoot(document.getElementById('app')!).render(<FluxProvider flux={Flux}><main><h1>Your knowledge. Your connectivity.</h1><p>This standalone consumer uses a mock product adapter. It does not call NitrogenX.</p></main><Alfred branding={{description:'Example product assistant',prompts:['Ask about our product']}} connectivity={connectivity} context="example-product" knowledge={knowledge} language={language} name={name} /></FluxProvider>);
