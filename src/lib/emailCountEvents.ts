/** Compteur global de mails non traités (sidebar / header). */
export const UNTREATED_EMAIL_COUNT_EVENT = 'dashboard:untreated-email-count';

export function dispatchUntreatedEmailCount(count: number) {
  window.dispatchEvent(
    new CustomEvent(UNTREATED_EMAIL_COUNT_EVENT, { detail: { count } }),
  );
}
