const KEY = 'turbineops_token';
let token: string | null = sessionStorage.getItem(KEY); // memory, backed by sessionStorage

export const getToken = () => token;

export function setToken(t: string | null) {
  token = t;
  if (t) sessionStorage.setItem(KEY, t);
  else sessionStorage.removeItem(KEY);
}

const headers = (json = true): Record<string, string> => ({
  ...(json ? { 'Content-Type': 'application/json' } : {}),
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

function expired() {
  if (token) {
    setToken(null);
    window.dispatchEvent(new Event('auth:expired'));
  }
}

export async function rest<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    method,
    headers: headers(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return null as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) expired();
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function gql<T = any>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch('/graphql', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json().catch(() => ({}));
  if (data.errors?.length) {
    if (data.errors[0].extensions?.code === 'UNAUTHENTICATED') expired();
    throw new Error(data.errors[0].message);
  }
  return data.data as T;
}