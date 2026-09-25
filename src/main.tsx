import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './ui/styles.css';

// Canvases draw text with the pixel font, so wait for it before the first render.
document.fonts.load('20px J').finally(() => {
  createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
});
