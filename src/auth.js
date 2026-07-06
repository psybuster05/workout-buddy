// Casual gate, not security: the app is a public static site with device-local
// data, so this only keeps strangers with the URL from poking around. The
// password's SHA-256 lives here in the bundle; a matching hash in localStorage
// unlocks the device permanently (changing the password re-locks everyone).
const PASS_HASH = '441b7681786fefcf0b41c3952a0ffecb1221315407a031f61d145ae99dbe9bf7'
const UNLOCK_KEY = 'workout-tracker:unlock'

export async function hashPassword(pw) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw))
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function isUnlocked() {
  try {
    return localStorage.getItem(UNLOCK_KEY) === PASS_HASH
  } catch {
    return false
  }
}

export async function tryUnlock(pw) {
  if ((await hashPassword(pw)) !== PASS_HASH) return false
  try {
    localStorage.setItem(UNLOCK_KEY, PASS_HASH)
  } catch {
    // storage blocked — still unlock for this visit
  }
  return true
}
