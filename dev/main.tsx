import { createRoot } from 'react-dom/client';
import { App } from './App';

// No CSS import needed — Chart.tsx already imports styles/chart-core.css.
createRoot(document.getElementById('root')!).render(<App />);
