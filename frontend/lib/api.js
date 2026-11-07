// Single gateway to the backend (same-origin, proxied by next.config.mjs).
export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || `Request failed (${status})`);
    this.status = status;
    this.code = body?.code;
    this.field = body?.field;
    this.body = body;
  }
}

const BASE = "/api";

async function request(path, { method = "GET", body, signal } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: "same-origin",
      headers: body !== undefined ? { "content-type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new ApiError(0, { error: "Can't reach the Zenoryx API. Is the backend running?" });
  }
  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: res.status >= 500 ? "The server returned an unexpected response." : text };
    }
  }
  if (!res.ok) {
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      throw new ApiError(res.status, { error: "The API is waking up or unavailable. Try again in a few seconds." });
    }
    throw new ApiError(res.status, data);
  }
  return data;
}

export const api = {
  get: (path, opts) => request(path, opts),
  post: (path, body = {}, opts) => request(path, { ...opts, method: "POST", body }),
  del: (path, opts) => request(path, { ...opts, method: "DELETE" }),
};

export const qk = {
  me: ["me"],
  projects: ["projects"],
  project: (id) => ["project", id],
  status: (id) => ["project", id, "status"],
  files: (id) => ["project", id, "files"],
  chunks: (id, path) => ["project", id, "chunks", path],
  commits: (id) => ["project", id, "commits"],
  messages: (id) => ["project", id, "messages"],
};
