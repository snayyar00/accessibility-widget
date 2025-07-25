import Cookies from 'js-cookie';

export const COOKIE_NAME = {
  TOKEN: 'token',
};

export function setAuthenticationCookie(token: string): void {
  Cookies.set(COOKIE_NAME.TOKEN, token, {
    path: '/',
    expires: 1,
  });
}

export function getAuthenticationCookie(): string | undefined {
  return Cookies.get(COOKIE_NAME.TOKEN);
}

export function clearAuthenticationCookie(): void {
  Cookies.remove(COOKIE_NAME.TOKEN, { path: '/' });
}
