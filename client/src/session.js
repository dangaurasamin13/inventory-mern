// The session lives in sessionStorage: it belongs to ONE tab, so a link pasted into a new tab starts logged out,
// and everything is cleared when the browser (or tab) is closed.
['token', 'user'].forEach((k) => localStorage.removeItem(k));   // clean up the old shared session

export const getToken = () => sessionStorage.getItem('token');
export const getUser = () => JSON.parse(sessionStorage.getItem('user') || 'null');
export function clearSession() { ['token', 'user'].forEach((k) => sessionStorage.removeItem(k)); }
export function setSession(d) { sessionStorage.setItem('token', d.token); sessionStorage.setItem('user', JSON.stringify(d.user)); }
export const updateUser = (u) => sessionStorage.setItem('user', JSON.stringify(u));
