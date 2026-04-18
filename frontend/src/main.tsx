/* @refresh reload */
import { render } from 'solid-js/web'
import { RouterProvider } from '@tanstack/solid-router'

import { getRouter } from '@/router'

const router = getRouter()
const rootElement = document.getElementById('app')

if (!rootElement) {
  throw new Error('App root element not found')
}

render(() => <RouterProvider router={router} />, rootElement)