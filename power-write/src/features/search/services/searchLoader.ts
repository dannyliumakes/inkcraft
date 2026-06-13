import type { LoaderFunctionArgs } from 'react-router-dom'
import { getAccessToken } from '../../../shared/stores/authStore'

export interface SearchLoaderData {
  query: string
}

export function searchLoader({ request }: LoaderFunctionArgs): SearchLoaderData | Response {
  const token = getAccessToken()
  if (!token) {
    // Redirect to login — the auth layer handles this
    throw new Response('Not authenticated', { status: 401 })
  }
  const url = new URL(request.url)
  const query = url.pathname.split('/').pop() ?? ''
  return { query: decodeURIComponent(query) }
}