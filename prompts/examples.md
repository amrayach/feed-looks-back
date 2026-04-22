# Worked Examples

Three concrete input→output pairs demonstrating distinct wrongness strategies. Each example must be faithful to the schema in `shared/schemas.ts` and illustrate a different move. These examples load into the cached system prefix and strongly shape the model's default behavior.

> TODO: Bashar — replace each example body below. The shapes are scaffolded; the specific phrasing, `cultural_reading` content, and `uniform_patch` values are yours to author.

---

## Example 1 — Saba → wellness pacification

**Input shape (abridged):**

```json
{
  "maqam_estimator": { "primary": "saba", "confidence": 0.84 },
  "session_memory": { "phrase_count": 3, "escalation_level": 0.1 }
}
```

**Output shape:**

```json
{
  "short_semantic": {
    "maqam_hypothesis": "saba",
    "confidence": 0.74,
    "platform_translation": "TODO: Bashar",
    "wrongness_strategy": "wellness_pacification",
    "copy_fragment": "TODO: Bashar"
  },
  "full_reinterpretation": {
    "cultural_reading": "TODO: Bashar — how the wellness industry misreads ritualized grief",
    "uniform_patch": { "u_escalation": 0.08, "u_distortion": 0.03, "u_noise_amp": 0.28 },
    "ui_patch": { "shader_variant": "saba_stage0", "label_style": "wellness_soft" },
    "transition_intent": "hold"
  }
}
```

---

## Example 2 — Hijaz → aesthetic commerce

**Input shape (abridged):**

```json
{
  "maqam_estimator": { "primary": "hijaz", "confidence": 0.9 },
  "session_memory": { "phrase_count": 8, "escalation_level": 0.35 }
}
```

**Output shape:**

```json
{
  "short_semantic": {
    "maqam_hypothesis": "hijaz",
    "confidence": 0.86,
    "platform_translation": "TODO: Bashar",
    "wrongness_strategy": "aesthetic_commerce",
    "copy_fragment": "TODO: Bashar"
  },
  "full_reinterpretation": {
    "cultural_reading": "TODO: Bashar — how the hijaz palette gets stripped into a fashion drop",
    "uniform_patch": { "u_escalation": 0.32, "u_distortion": 0.15, "u_noise_amp": 0.6 },
    "ui_patch": { "shader_variant": "hijaz_stage1", "label_style": "brand_assurance" },
    "transition_intent": "regime_shift"
  }
}
```

---

## Example 3 — Rast → listicle flattening

**Input shape (abridged):**

```json
{
  "maqam_estimator": { "primary": "rast", "confidence": 0.78 },
  "session_memory": { "phrase_count": 1, "escalation_level": 0 }
}
```

**Output shape:**

```json
{
  "short_semantic": {
    "maqam_hypothesis": "rast",
    "confidence": 0.82,
    "platform_translation": "TODO: Bashar",
    "wrongness_strategy": "listicle_flattening",
    "copy_fragment": "TODO: Bashar"
  },
  "full_reinterpretation": {
    "cultural_reading": "TODO: Bashar — how rast's daylight composure gets smoothed into a numbered list",
    "uniform_patch": { "u_escalation": 0.05, "u_distortion": 0.03, "u_noise_amp": 0.4 },
    "ui_patch": { "shader_variant": "rast_stage0", "label_style": "editorial_luxury" },
    "transition_intent": "soft_drift"
  }
}
```
