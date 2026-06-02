/* DogeFood Lab — Service Worker v5 (permanent no-op)
 * ---------------------------------------------------
 * This file MUST remain deployed at /service-worker.js forever.
 * Removing it causes "Not found" rejection errors in browsers
 * that previously registered a SW and keep trying to update it.
 *
 * This SW does absolutely nothing:
 *   - No install logic
 *   - No activate logic
 *   - No fetch handler
 *   - No cache usage
 *
 * All requests go straight to the network via browser default.
 * Previous SW registrations will update to this harmless version
 * and quietly expire.
 */
