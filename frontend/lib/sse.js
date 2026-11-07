// POST + read a Server-Sent Events stream (EventSource can't POST or send bodies).
// Calls onEvent(obj) for every `data:` JSON payload; resolves when the stream ends.
export async function streamSSE(url, body, { onEvent, signal }) {
  const res = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    let message = `Request failed (${res.status})`;
    try {
      message = (await res.json()).error || message;
    } catch {
      /* not JSON */
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const dispatch = (frame) => {
    const data = frame
      .split(/\r?\n/)
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trimStart())
      .join("\n");
    if (!data) return; // comments / heartbeats
    let event;
    try {
      event = JSON.parse(data);
    } catch {
      return; // ignore a malformed frame
    }
    onEvent(event); // handler errors must propagate to the caller
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let m;
    while ((m = /\r?\n\r?\n/.exec(buffer))) {
      const frame = buffer.slice(0, m.index);
      buffer = buffer.slice(m.index + m[0].length);
      dispatch(frame);
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) dispatch(buffer);
}
