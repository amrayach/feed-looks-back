/// <reference types="vite/client" />
/// <reference types="vite-plugin-glsl/ext" />
import { CLIENT_CONFIG } from '@/config'

async function main(): Promise<void> {
  const mode = CLIENT_CONFIG.runtime_mode
  console.info(`[main] starting in runtime_mode=${mode}`)
  if (mode === 'capture') {
    const { start } = await import('@/modes/capture')
    await start()
  } else {
    const { start } = await import('@/modes/performance')
    await start()
  }
}

main().catch((err) => {
  console.error('[main] fatal:', err)
  const root = document.body
  const message = document.createElement('pre')
  message.style.cssText =
    'position:fixed;inset:0;padding:2rem;color:#ff8a7a;font-family:monospace;white-space:pre-wrap;background:#050505;'
  message.textContent = `fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}`
  root.append(message)
})
