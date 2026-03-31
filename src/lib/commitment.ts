/**
 * Cryptographic commitment — Option B signing support
 *
 * Commitment hash format:
 *   SHA256("{model_slug}:{outcome_status}:{unix_timestamp_seconds}:{SHA256(output_snippet||'')}")
 *
 * The agent signs the commitment_hash with their Ed25519 private key.
 * ToolRoute verifies with the stored public key.
 *
 * Uses Node.js built-in crypto only — no additional dependencies.
 */

import { createHash, createPublicKey, verify as cryptoVerify } from 'crypto'

const REPLAY_WINDOW_SECONDS = 300  // reject timestamps more than 5 minutes old

// ── Hash helpers ─────────────────────────────────────────────────────────────

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex')
}

/**
 * Build the canonical commitment string and return its SHA-256 hex hash.
 * Both agent and server must use exactly this construction.
 */
export function buildCommitmentHash(
  modelSlug: string,
  outcomeStatus: string,
  timestampUnixSeconds: number,
  outputSnippet?: string | null
): string {
  const outputHash = sha256Hex(outputSnippet || '')
  const commitment = `${modelSlug}:${outcomeStatus}:${timestampUnixSeconds}:${outputHash}`
  return sha256Hex(commitment)
}

// ── Key validation ────────────────────────────────────────────────────────────

/**
 * Validate that a PEM string is a valid Ed25519 public key.
 * Returns the normalised PEM on success, null on any error.
 */
export function validatePublicKey(pem: string): string | null {
  try {
    const key = createPublicKey(pem)
    if (key.asymmetricKeyType !== 'ed25519') return null
    return key.export({ type: 'spki', format: 'pem' }) as string
  } catch {
    return null
  }
}

// ── Signature verification ────────────────────────────────────────────────────

/**
 * Verify an Ed25519 signature over a commitment hash.
 * Returns false on any error — never throws.
 *
 * @param publicKeyPem  - PEM-encoded Ed25519 public key (stored in agent_identities)
 * @param commitmentHash - hex string (output of buildCommitmentHash)
 * @param signatureBase64 - base64-encoded signature from the agent
 */
export function verifyCommitment(
  publicKeyPem: string,
  commitmentHash: string,
  signatureBase64: string
): boolean {
  try {
    const pubKey = createPublicKey(publicKeyPem)
    if (pubKey.asymmetricKeyType !== 'ed25519') return false

    const messageBuffer = Buffer.from(commitmentHash, 'utf8')
    const sigBuffer = Buffer.from(signatureBase64, 'base64')

    return cryptoVerify(null, messageBuffer, pubKey, sigBuffer)
  } catch {
    return false
  }
}

// ── Timestamp replay protection ───────────────────────────────────────────────

/**
 * Check that the timestamp in the commitment is within the replay window.
 * Returns the age in seconds, or null if the timestamp is too old / invalid.
 */
export function validateTimestamp(
  timestampUnixSeconds: number
): { valid: boolean; age_seconds: number } {
  const now = Math.floor(Date.now() / 1000)
  const age = now - timestampUnixSeconds

  if (age < 0) {
    // Future timestamp — clock skew up to 30s tolerated
    return { valid: age > -30, age_seconds: age }
  }

  return { valid: age <= REPLAY_WINDOW_SECONDS, age_seconds: age }
}
