import { getToken } from './api';

export function connectEvents(onEvent: (name: string, data: any) => void) {
  const ctrl = new AbortController();
  (async () => {
    while (!ctrl.signal.aborted) {
      try {
        const res = await fetch('/events', {
          headers: { Authorization: `Bearer ${getToken()}` },
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) throw new Error('bad response');
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        while(true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i: number;
          while ((i = buf.indexOf('\n\n')) >= 0) {
            const chunk = buf.slice(0, i);
            buf = buf.slice(i + 2);
            let name = 'message', data = '';
            for (const line of chunk.split('\n')) {
              if (line.startsWith('event:')) name = line.slice(6).trim();
              else if (line.startsWith('data:')) data += line.slice(5).trim();
            }
            try { onEvent(name, JSON.parse(data)); } catch { onEvent(name, data); }
          }
        }
      } catch {
        if (ctrl.signal.aborted) return;
      }
      await new Promise((r) => setTimeout(r, 3000)); // reconnect
    }
  })();
  return () => ctrl.abort();
}
