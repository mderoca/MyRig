/**
 * The demo user id.
 *
 * MyRig has no login. To still give each visitor their own saved builds, we
 * generate a random id the first time the app runs in a browser and keep it in
 * localStorage. Every /api/builds call sends it.
 *
 * It identifies a browser, not a person - clear site data and you are a new
 * user. That is fine: the app stores no personal information.
 *
 *   myrig_user_a1b2c3d4
 */

const STORAGE_KEY = 'myrig_user_id'

function generateUserId() {
  const random = Math.random().toString(16).slice(2, 10).padEnd(8, '0')
  return `myrig_user_${random}`
}

/** Returns this browser's demo user id, creating it on first use. */
export function getUserId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY)
    if (!id) {
      id = generateUserId()
      localStorage.setItem(STORAGE_KEY, id)
    }
    return id
  } catch {
    // Private browsing with storage disabled: fall back to a per-session id so
    // the app still works, it just will not remember builds after a reload.
    return generateUserId()
  }
}
