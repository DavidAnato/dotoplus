/** SSE EventSource (web) + XHR streaming (React Native, pas de EventSource natif). */

export type SseHandler = (data: Record<string, unknown>) => void;

function parseSseBlock(block: string, onEvent: SseHandler) {
  for (const line of block.split("\n")) {
    const trimmed = line.replace(/\r$/, "");
    if (!trimmed.startsWith("data:")) continue;
    const raw = trimmed.slice(5).trimStart();
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      if (data && typeof data === "object") onEvent(data as Record<string, unknown>);
    } catch {
      /* ignore malformed */
    }
  }
}

export function connectSse(
  url: string,
  onEvent: SseHandler,
  opts?: { onOpen?: () => void; onError?: () => void }
): () => void {
  if (typeof EventSource !== "undefined") {
    const es = new EventSource(url);
    es.onopen = () => opts?.onOpen?.();
    es.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data && typeof data === "object") onEvent(data as Record<string, unknown>);
      } catch {
        /* ignore */
      }
    };
    es.onerror = () => {
      es.close();
      opts?.onError?.();
    };
    return () => es.close();
  }

  const xhr = new XMLHttpRequest();
  let offset = 0;
  let buf = "";
  let opened = false;
  let failed = false;
  const fail = () => {
    if (failed) return;
    failed = true;
    opts?.onError?.();
  };
  xhr.open("GET", url);
  xhr.setRequestHeader("Accept", "text/event-stream");
  xhr.setRequestHeader("Cache-Control", "no-cache");
  xhr.onreadystatechange = () => {
    if (xhr.readyState < XMLHttpRequest.HEADERS_RECEIVED || opened || failed) return;
    if (xhr.status === 200) {
      opened = true;
      opts?.onOpen?.();
      return;
    }
    if (xhr.status >= 400) fail();
  };
  xhr.onprogress = () => {
    const text = xhr.responseText || "";
    const chunk = text.slice(offset);
    offset = text.length;
    buf += chunk;
    const parts = buf.split("\n\n");
    buf = parts.pop() || "";
    for (const block of parts) parseSseBlock(block, onEvent);
  };
  xhr.onerror = () => fail();
  xhr.onload = () => fail();
  xhr.send();
  return () => {
    failed = true;
    xhr.abort();
  };
}
