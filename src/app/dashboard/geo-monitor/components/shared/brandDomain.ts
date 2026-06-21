// Best-effort brand → domain guesser for logo lookup (BrandLogo's Clearbit/Google
// chain resolves the rest, with a letter-avatar fallback when no logo exists).
// Shared by Brand Ranking (VisibilityTab) and the Competitors matrix.

const KNOWN: [string, string][] = [
  // cameras / photo (longest key first to avoid prefix collisions)
  ['camp snap', 'campsnap.com'],
  ['paper shoot', 'papershootcamera.com'],
  ['flashback', 'flashback.camera'],
  ['lomography', 'lomography.com'],
  ['kodak', 'kodak.com'],
  ['fujifilm', 'fujifilm.com'],
  ['fuji', 'fujifilm.com'],
  ['canon', 'canon.com'],
  ['nikon', 'nikon.com'],
  ['leica', 'leica-camera.com'],
  ['sony', 'sony.com'],
  ['ricoh', 'ricoh.com'],
  ['polaroid', 'polaroid.com'],
  ['instax', 'instax.com'],
  ['gopro', 'gopro.com'],
  ['dji', 'dji.com'],
  ['vsco', 'vsco.co'],
  ['hipstamatic', 'hipstamatic.com'],
  ['prequel', 'prequel.app'],
  ['snapseed', 'snapseed.online'],
  ['youcam', 'perfectcorp.com'],
  ['rewindpix', 'rewindpix.com'],
]

export function guessBrandDomain(brand: string): string {
  const lower = (brand || '').toLowerCase().trim()
  if (!lower) return ''
  for (const [key, domain] of KNOWN) {
    if (lower === key || lower.startsWith(key + ' ') || lower.startsWith(key)) {
      return domain
    }
  }
  // Multi-word brand → join the leading alpha words ("camp snap" → campsnap.com);
  // drop trailing model tokens with digits ("X100VI", "Q3", "PS135").
  const words = lower
    .split(/\s+/)
    .filter(w => /^[a-z]/.test(w) && !/\d/.test(w))
  const stem = (words.length ? words.join('') : lower.replace(/[^a-z]/g, '')).slice(0, 24)
  return stem ? `${stem}.com` : ''
}
