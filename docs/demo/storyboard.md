# Demo Storyboard — Day 1 Draft

**Status:** Day 1 scaffold. Will be rewritten Thursday (2026-04-23) once real audio lands and the full pipeline is measurable. This version adapts the brief's section 09 to current Day 1 capabilities, which include a functional end-to-end keyboard mock but not live audio.

## Demo context

- Length: 90 seconds for judge evaluation; 3 minutes for performance documentation.
- Team: Bashar performs; Amay operates the laptop and narrates if needed.
- Hardware: AMD Vega integrated GPU, laptop mic, guitar through audio interface (Day 2+).

## Day 1 demo — keyboard driven

**Acknowledge up front**: today's capture is keyboard-driven. Keys 1–5 stand in for the five maqams while the phrase detector is stubbed. The pipeline from keyboard event to scene mutation is the same pipeline that will eventually fire on real phrase boundaries; we are demonstrating the *response* layer in isolation.

### Beat 1 (0:00 – 0:15) — First strike

- Press `1` → rast. Shader lands on `rast_stage0`. HUD reads "7 signs you are finally aligned with your Monday."
- Narration: *"The system has decided this maqam is a listicle."*

### Beat 2 (0:15 – 0:45) — Across the modes

- Press `4` → saba. HUD slides into wellness voice. "Breathe in for 4. Hold. Exhale for 6."
- Press `2` → bayati. Spotify mood-tag mistranslation.
- Press `3` → hijaz. Fashion drop copy. The shader changes perceptibly.

### Beat 3 (0:45 – 1:15) — Escalation

- Repeated presses of the same maqam cause `escalation_level` to ratchet. Stage 1 renders. Colors get louder, noise increases, the label_style sharpens.
- Narration: *"It cannot calm down. Each return is more confident, and more wrong."*

### Beat 4 (1:15 – 1:30) — DEGRADED (optional demo)

- Toggle the server into capture mode with an empty cache → next phrase misses → scene holds last valid uniforms, HUD shows the degraded state.
- Narration: *"Failure looks like holding. The piece does not blink out."*

## Day 2+ storyboard (placeholder)

Once live audio lands, the keyboard beats above become guitar phrases. The storyboard is otherwise unchanged — the interesting shape is not the input device, it is the gap between the musical phrase and the feed's reading of it.

> TODO: Bashar — the full 3-minute performance storyboard, maqam-by-maqam, with the specific phrases you intend to play at the show.
