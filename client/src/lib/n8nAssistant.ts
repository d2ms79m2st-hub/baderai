export type AssistantMessage = { role: "user" | "assistant"; content: string };

type N8nPayload = {
  taskId?: string;
  status?: string;
  reply?: string | null;
  sourceStatus?: string | null;
  officialSite?: string | null;
  taskUrl?: string | null;
  output?: string | null;
  text?: string | null;
  answer?: string | null;
  message?: string | null;
};

const START_URL = "https://uijhhj.app.n8n.cloud/webhook/assistant-start";
const STATUS_URL = "https://uijhhj.app.n8n.cloud/webhook/assistant-status";
const POLL_INTERVAL_MS = 5000;
const MAX_WAIT_MS = 60000;

function getReply(payload: N8nPayload) {
  const value = payload.reply ?? payload.output ?? payload.text ?? payload.answer;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function postJson(url: string, body: Record<string, unknown>, signal: AbortSignal) {
  const response = await fetch(url, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const text = await response.text();
  let payload: N8nPayload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { /* n8n returned non-JSON */ }
  if (!response.ok) throw new Error(`n8n HTTP ${response.status}`);
  return payload;
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener("abort", () => { window.clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
  });
}

export async function askN8nAssistant(input: { message: string; sessionKey: string; history: AssistantMessage[] }) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), MAX_WAIT_MS + 5000);
  try {
    const started = await postJson(START_URL, { message: input.message, sessionKey: input.sessionKey, history: input.history }, controller.signal);
    const immediateReply = getReply(started);
    if (immediateReply) return { reply: immediateReply, sourceStatus: started.sourceStatus ?? "n8n_verified_context", officialSite: started.officialSite };
    if (!started.taskId) throw new Error("n8n start response has no taskId or reply");

    const deadline = Date.now() + MAX_WAIT_MS;
    while (Date.now() < deadline) {
      await wait(POLL_INTERVAL_MS, controller.signal);
      const status = await postJson(STATUS_URL, { taskId: started.taskId }, controller.signal);
      const reply = getReply(status);
      if (reply && ["running", "queued", "pending"].indexOf(String(status.status).toLowerCase()) === -1) {
        return { reply, sourceStatus: status.sourceStatus ?? "n8n_verified_context", officialSite: status.officialSite };
      }
      if (["failed", "error", "cancelled"].includes(String(status.status).toLowerCase())) throw new Error(`n8n task ${status.status}`);
    }
    throw new Error("n8n task timed out");
  } finally {
    window.clearTimeout(timeout);
  }
}
