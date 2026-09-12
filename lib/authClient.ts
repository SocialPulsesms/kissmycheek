'use client';

/**
 * Universal client-side logout utility for Kiss My Cheek.
 * Flushes server session cookies, client document.cookie, and browser storage,
 * then immediately navigates to /login.
 */
export async function performLogout() {
  try {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'logout' })
    });
  } catch (err) {
    console.warn('Server logout request failed, continuing with client clearance', err);
  }

  // Clear all cookie variants
  document.cookie = "session-token=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;";
  document.cookie = "session-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT;";

  // Clear local & session storage but preserve remembered login credentials & biometric configuration
  try {
    const rememberedEmail = localStorage.getItem('kmc_remembered_email');
    const rememberedPassword = localStorage.getItem('kmc_remembered_password');
    const rememberMe = localStorage.getItem('kmc_remember_me');
    const bioCred = localStorage.getItem('kmc_biometric_credential');

    const kmcKeys = Object.keys(localStorage).filter(k => k.startsWith('kmc_') || k.includes('session') || k.includes('auth'));
    kmcKeys.forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
    sessionStorage.setItem('kmc_splash_shown', 'true');

    // Restore login credentials so inputs remain filled
    if (rememberedEmail) localStorage.setItem('kmc_remembered_email', rememberedEmail);
    if (rememberedPassword) localStorage.setItem('kmc_remembered_password', rememberedPassword);
    if (rememberMe) localStorage.setItem('kmc_remember_me', rememberMe);
    if (bioCred) localStorage.setItem('kmc_biometric_credential', bioCred);
  } catch (e) {}

  // Notify in-app managers immediately to stop any ringing or active call
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('kmc_logout'));
    } catch {}
  }

  // Hard reload directly to /login
  window.location.replace('/login');
}
