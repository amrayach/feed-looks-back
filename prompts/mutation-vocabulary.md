# Mutation Vocabulary — Human Mirror

**Authority is `shared/schemas.ts`.** This document is a human-readable mirror for prompt authoring. If they diverge, the code wins and the prompt loses.

## Maqam (5)

- `rast` — the composed, daylight-confident mode
- `bayati` — tender ache, modal grief
- `hijaz` — distance, heat, longing
- `saba` — explicit grief, ritualized
- `ajam` — celebratory, warm-major-adjacent

## Shader variant (15 = 5 maqams × 3 stages)

Pattern: `{maqam}_{stage0|stage1|stage2}`. Stage 0 is baseline; stage 2 is "louder UI."

```
rast_stage0    rast_stage1    rast_stage2
bayati_stage0  bayati_stage1  bayati_stage2
hijaz_stage0   hijaz_stage1   hijaz_stage2
saba_stage0    saba_stage1    saba_stage2
ajam_stage0    ajam_stage1    ajam_stage2
```

`saba_stage0` uses a dedicated shader (wellness-coded, sage+lavender, slow breath). The other 14 share a parametric skeleton shader with distinct default uniform values.

## Label style (5)

- `editorial_luxury` — luxury-magazine feature voice; cream/gold palette, italic pull-quotes
- `wellness_soft` — spa/meditation voice; soft sans, sage/lavender palette, low-contrast
- `reward_burst` — reward-loop voice; bright yellow + electric blue, exclamation-heavy
- `brand_assurance` — fashion-drop voice; sans-serif confidence, commerce color
- `relatable_warm` — recommendation-algorithm voice; warm terracotta, chat-style intimacy

## Transition intent (3)

- `hold` — visual state persists; little or no mutation this phrase
- `soft_drift` — gentle parameter shift; palette stays nearby, noise_amp may shift
- `regime_shift` — noticeable perceptual change: palette flip, shader switch, escalation bump

## Uniform names in common use

The renderer exposes these shader uniforms. Unknown keys in `uniform_patch` are silently ignored (failing-open is intentional).

- `u_escalation` — 0..1
- `u_distortion` — 0..0.4
- `u_noise_amp` — 0..1
- `u_noise_scale` — 1..8
- `u_palette_shift` — -0.5..0.5
- `u_grain` — 0..0.5
