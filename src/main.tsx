import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { testFirestoreConnection } from './services/firebase.ts';

// Test connection to Google Cloud Firestore
testFirestoreConnection().catch(console.error);

createRoot(document.getElementById('root')!).render(<App />);
