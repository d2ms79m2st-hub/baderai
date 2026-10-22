export type AssistantMessage = { role: "user" | "assistant"; content: string };

type N8nPayload = {
  taskId?: string;
  status?: string;
  reply?: string | null;
  sourceStatus?: string | null;
  officialSite?: string | null;
  output?: string | null;
  text?: string | null;
  answer?: string | null;
  error?: string | null;
};

const START_URL = "https://uijhhj.app.n8n.cloud/webhook/assistant-start";
const STATUS_URL = "https://uijhhj.app.n8n.cloud/webhook/assistant-status";
const POLL_INTERVAL_MS = 5000;
const MAX_WAIT_MS = 60000;
const MAX_ATTEMPTS = 2;

function getReply(payload: N8nPayload) {
  const value = payload.reply ?? payload.output ?? payload.text ?? payload.answer;
  if (typeof value !== "string" || !value.trim()) return null;
  return value.replace(/\\\*\*/g, "").replace(/\*\*/g, "").trim();
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      window.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

async function postJson(url: string, body: Record<string, unknown>, signal: AbortSignal) {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
      const text = await response.text();
      let payload: N8nPayload = {};
      try { payload = text ? JSON.parse(text) : {}; } catch { /* non-JSON response */ }
      if (response.ok) return payload;
      const error = new Error(payload.error || `assistant_http_${response.status}`) as Error & { status?: number };
      error.status = response.status;
      throw error;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("assistant_request_failed");
      const status = (lastError as Error & { status?: number }).status;
      const retryable = status === 429 || (status !== undefined && status >= 500);
      if (!retryable || attempt === MAX_ATTEMPTS - 1) throw lastError;
      await wait(1200 * (attempt + 1), signal);
    }
  }
  throw lastError ?? new Error("assistant_request_failed");
}

export async function askN8nAssistant(input: { message: string; sessionKey: string; history: AssistantMessage[] }) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), MAX_WAIT_MS + 5000);
  try {
    const started = await postJson(START_URL, {
      message: input.message,
      sessionKey: input.sessionKey,
      history: input.history,
    }, controller.signal);
    const immediateReply = getReply(started);
    if (immediateReply) return { reply: immediateReply, sourceStatus: started.sourceStatus ?? "verified_context", officialSite: started.officialSite };
    if (!started.taskId) throw new Error("assistant_missing_task_id");

    const deadline = Date.now() + MAX_WAIT_MS;
    while (Date.now() < deadline) {
      await wait(POLL_INTERVAL_MS, controller.signal);
      const status = await postJson(STATUS_URL, { taskId: started.taskId }, controller.signal);
      const reply = getReply(status);
      const state = String(status.status ?? "").toLowerCase();
      if (reply && !["running", "queued", "pending"].includes(state)) {
        return { reply, sourceStatus: status.sourceStatus ?? "verified_context", officialSite: status.officialSite };
      }
      if (["failed", "error", "cancelled"].includes(state)) throw new Error(`assistant_task_${state}`);
    }
    throw new Error("assistant_timeout");
  } finally {
    window.clearTimeout(timeout);
  }
}
