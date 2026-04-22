import type { LabelStyle, PhraseResponse } from '@shared/types'

const HUD_CSS = `
.hud-root {
  position: fixed;
  inset: 0;
  pointer-events: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
  color: #f0ece5;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
}
.hud-stack {
  position: absolute;
  left: 6vw;
  bottom: 6vh;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  max-width: min(64ch, 70vw);
}
.hud-row { display: flex; flex-direction: column; gap: 0.2rem; }
.hud-label {
  font-size: 0.72rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  opacity: 0.7;
}
.hud-value {
  font-size: 1.1rem;
  line-height: 1.35;
  letter-spacing: 0.01em;
}
.hud-row-copy .hud-value { font-size: 1.6rem; font-weight: 500; }
.hud-row-maqam .hud-value { font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }

.hud-root[data-style='editorial_luxury'] { font-family: 'Playfair Display', Georgia, serif; color: #eae0ce; }
.hud-root[data-style='wellness_soft']     { color: #e3ddd0; font-weight: 300; }
.hud-root[data-style='reward_burst']      { color: #fff7b1; font-weight: 600; letter-spacing: 0.04em; }
.hud-root[data-style='brand_assurance']   { color: #d7e3ff; font-weight: 500; }
.hud-root[data-style='relatable_warm']    { color: #ffd9b0; }

.hud-root[data-state='degraded'] .hud-row-copy .hud-value { color: #ff8a7a; }
.hud-root[data-state='degraded']::after {
  content: 'DEGRADED';
  position: absolute;
  top: 2vh;
  right: 2vw;
  font-size: 0.7rem;
  letter-spacing: 0.25em;
  opacity: 0.8;
  color: #ff8a7a;
}
`

const FIELD_LAYOUT = [
  { key: 'maqam', label: 'Maqam' },
  { key: 'translation', label: 'Translation' },
  { key: 'strategy', label: 'Strategy' },
  { key: 'confidence', label: 'Confidence' },
  { key: 'copy', label: 'Copy' },
] as const

type FieldKey = (typeof FIELD_LAYOUT)[number]['key']

export interface HudUpdatePayload {
  maqam: string
  translation: string
  strategy: string
  confidence: string
  copy: string
  labelStyle: LabelStyle
}

function ensureStyles(): void {
  const id = 'hud-inline-styles'
  if (document.getElementById(id)) return
  const el = document.createElement('style')
  el.id = id
  el.textContent = HUD_CSS
  document.head.append(el)
}

export class SemanticHud {
  private readonly root: HTMLDivElement
  private readonly stack: HTMLDivElement
  private readonly fields = new Map<FieldKey, HTMLSpanElement>()

  constructor(parent: HTMLElement = document.body) {
    ensureStyles()
    this.root = document.createElement('div')
    this.root.className = 'hud-root'
    this.stack = document.createElement('div')
    this.stack.className = 'hud-stack'

    for (const { key, label } of FIELD_LAYOUT) {
      const row = document.createElement('div')
      row.className = `hud-row hud-row-${key}`
      const labelEl = document.createElement('span')
      labelEl.className = 'hud-label'
      labelEl.textContent = label
      const valueEl = document.createElement('span')
      valueEl.className = 'hud-value'
      valueEl.dataset.field = key
      valueEl.textContent = '—'
      row.append(labelEl, valueEl)
      this.stack.append(row)
      this.fields.set(key, valueEl)
    }

    this.root.append(this.stack)
    parent.append(this.root)
  }

  update(response: PhraseResponse): void {
    const short = response.short_semantic
    this.setText('maqam', short.maqam_hypothesis)
    this.setText('translation', short.platform_translation)
    this.setText('strategy', short.wrongness_strategy)
    this.setText('confidence', `${Math.round(short.confidence * 100)}%`)
    this.setText('copy', short.copy_fragment)
    this.setLabelStyle(response.full_reinterpretation.ui_patch.label_style)
    this.clearDegraded()
  }

  setLabelStyle(style: LabelStyle): void {
    this.root.dataset.style = style
  }

  showDegraded(message: string): void {
    this.root.dataset.state = 'degraded'
    this.setText('copy', message)
  }

  clearDegraded(): void {
    delete this.root.dataset.state
  }

  dispose(): void {
    this.root.remove()
  }

  private setText(key: FieldKey, value: string): void {
    const el = this.fields.get(key)
    if (el) el.textContent = value
  }
}
