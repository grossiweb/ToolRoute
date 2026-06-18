// Shared numeric-field validation for telemetry endpoints.
// Type errors → structured 400. Range overflows → clamp + warning.
// Never lets a raw value reach a typed Postgres column unguarded.

const DOCS = '/api/route/model#telemetry'

export interface NumericFieldSpec {
  field: string
  min: number
  max: number
  integer?: boolean
  hint?: string // appended to both error detail and clamp warning
}

export interface CoerceResult {
  value: number | null
  warning?: string
  error?: { error: string; detail: string; docs: string }
}

export function coerceNumericField(raw: unknown, spec: NumericFieldSpec): CoerceResult {
  if (raw == null) return { value: null } // absent is always fine

  let num: number
  if (typeof raw === 'number') {
    num = raw
  } else if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) {
    // Numeric string — Postgres historically cast these; coerce for back-compat,
    // but flag it so agents migrate to JSON numbers.
    num = Number(raw)
    const base = `${spec.field} was sent as a string ("${raw}") and coerced to a number — send a JSON number.`
    const clamp = applyRange(num, spec)
    return clamp.warning
      ? { value: clamp.value, warning: `${base} ${clamp.warning}` }
      : { value: clamp.value, warning: base }
  } else {
    // Non-numeric: "high", "95%", "", boolean, object, NaN
    return {
      value: null,
      error: {
        error: `Invalid ${spec.field}`,
        detail: `Got ${JSON.stringify(raw)} (${typeof raw}). Expected a number ${spec.min}-${spec.max}.${spec.hint ? ' ' + spec.hint : ''}`,
        docs: DOCS,
      },
    }
  }

  if (!Number.isFinite(num)) {
    return { value: null, error: { error: `Invalid ${spec.field}`, detail: `Expected a finite number ${spec.min}-${spec.max}.${spec.hint ? ' ' + spec.hint : ''}`, docs: DOCS } }
  }
  const clamp = applyRange(num, spec)
  return { value: clamp.value, ...(clamp.warning ? { warning: clamp.warning } : {}) }
}

function applyRange(num: number, spec: NumericFieldSpec): { value: number; warning?: string } {
  let n = num
  if (spec.integer && !Number.isInteger(n)) n = Math.round(n)
  if (n < spec.min) return { value: spec.min, warning: `${spec.field} clamped from ${num} to ${spec.min}.${spec.hint ? ' ' + spec.hint : ''}` }
  if (n > spec.max) return { value: spec.max, warning: `${spec.field} clamped from ${num} to ${spec.max}.${spec.hint ? ' ' + spec.hint : ''}` }
  return { value: n }
}

// Live column limits for model_outcome_records (verified against schema).
export const MODEL_REPORT_FIELD_SPECS: NumericFieldSpec[] = [
  { field: 'output_quality_rating', min: 0, max: 9.99, hint: 'This field is 0-10. If sending a 0-100 percentage/confidence, divide by 10.' },
  { field: 'estimated_cost_usd', min: 0, max: 9999.999999, hint: 'USD; max ~$9,999.99 per report.' },
  { field: 'latency_ms', min: 0, max: 2147483647, integer: true, hint: 'Milliseconds; max ~2.1B (24 days).' },
  { field: 'input_tokens', min: 0, max: 2147483647, integer: true },
  { field: 'output_tokens', min: 0, max: 2147483647, integer: true },
  { field: 'retry_count', min: 0, max: 2147483647, integer: true },
  { field: 'human_correction_minutes', min: 0, max: 2147483647, integer: true },
]
