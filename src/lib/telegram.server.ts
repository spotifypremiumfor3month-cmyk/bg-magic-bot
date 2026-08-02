const API = "https://api.telegram.org";

function token(): string {
  const value = process.env["TELEGRAM_BOT_TOKEN"];
  if (!value) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  return value;
}

async function call<T = unknown>(method: string, payload: unknown): Promise<T> {
  const response = await fetch(`${API}/bot${token()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await response.json()) as { ok: boolean; result?: T; description?: string };
  if (!response.ok || !json.ok) {
    throw new Error(`Telegram ${method} failed [${response.status}]: ${json.description ?? ""}`);
  }
  return json.result as T;
}

export type InlineKeyboard = Array<Array<{ text: string; url?: string; callback_data?: string }>>;

export function sendMessage(chatId: number, text: string, keyboard?: InlineKeyboard) {
  return call("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  });
}

export function answerCallbackQuery(id: string, text?: string) {
  return call("answerCallbackQuery", { callback_query_id: id, text }).catch(() => undefined);
}

export function sendChatAction(chatId: number, action: string) {
  return call("sendChatAction", { chat_id: chatId, action }).catch(() => undefined);
}

export async function downloadFile(fileId: string): Promise<ArrayBuffer> {
  const file = await call<{ file_path: string }>("getFile", { file_id: fileId });
  const response = await fetch(`${API}/file/bot${token()}/${file.file_path}`);
  if (!response.ok) throw new Error(`Telegram file download failed [${response.status}]`);
  return response.arrayBuffer();
}

export async function sendDocument(
  chatId: number,
  bytes: Uint8Array,
  filename: string,
  caption: string,
  keyboard?: InlineKeyboard,
) {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("caption", caption);
  form.append("parse_mode", "HTML");
  if (keyboard) form.append("reply_markup", JSON.stringify({ inline_keyboard: keyboard }));
  form.append(
    "document",
    new Blob([bytes as unknown as BlobPart], { type: "image/png" }),
    filename,
  );
  const response = await fetch(`${API}/bot${token()}/sendDocument`, {
    method: "POST",
    body: form,
  });
  const json = (await response.json()) as { ok: boolean; description?: string };
  if (!response.ok || !json.ok) {
    throw new Error(`Telegram sendDocument failed: ${json.description ?? response.status}`);
  }
}

export async function sendPhoto(
  chatId: number,
  bytes: Uint8Array,
  filename: string,
  caption: string,
  keyboard?: InlineKeyboard,
) {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("caption", caption);
  form.append("parse_mode", "HTML");
  if (keyboard) form.append("reply_markup", JSON.stringify({ inline_keyboard: keyboard }));
  form.append(
    "photo",
    new Blob([bytes as unknown as BlobPart], { type: "image/png" }),
    filename,
  );
  const response = await fetch(`${API}/bot${token()}/sendPhoto`, { method: "POST", body: form });
  const json = (await response.json()) as { ok: boolean; description?: string };
  if (!response.ok || !json.ok) {
    throw new Error(`Telegram sendPhoto failed: ${json.description ?? response.status}`);
  }
}