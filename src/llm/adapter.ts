import type { PhraseInput, PhraseResponse } from '@shared/types'
import { callOpus as clientCallOpus } from './client'

// Client-side delegate. The authoritative adapter lives in server/anthropic-adapter.ts
// (which owns the SDK + mock/real path + prompt caching). From the browser we always
// go through /api/phrase (handled by `client.ts`), regardless of which path the server
// is actually running.
//
// Why the name symmetry: anything that wants to "call Opus" can import this file
// without knowing whether it's running server-side or client-side.

export async function callOpus(input: PhraseInput): Promise<PhraseResponse> {
  return clientCallOpus(input)
}

export { PhraseApiError } from './client'
