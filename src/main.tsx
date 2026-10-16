import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { router } from './app/routes'
import { requestPersistentStorage } from './lib/share'
import { initPwa } from './lib/pwa'
import './index.css'

void requestPersistentStorage()
initPwa()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
