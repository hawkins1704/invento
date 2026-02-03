
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from './src/pages/LandingPage';

export async function prerender() {
  // Renderizar solo la LandingPage para el prerender
  // Envolver en MemoryRouter para que Link funcione en el contexto de prerender
  const html = renderToString(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
  );
  
  return {
    html,
  };
}
