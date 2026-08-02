import { createFileRoute } from "@tanstack/react-router";

import { removeBackground } from "@/lib/bg-remove.server";
import {
  downloadFile,
  sendChatAction,
  sendDocument,
  sendMessage,
} from "@/lib/telegram.server";

const WELCOME = [
  "✨ <b>Background Remover Bot</b>",
  "",
  "Send me any photo and I'll return it with the background removed — studio quality, transparent PNG, completely free.",
  "",
  "Tips:",
  "• Send the photo as a <b>file</b> for maximum resolution.",
  "• You get the result back as a PNG document so transparency is preserved.",
].join("\n");

async function sha256Base64Url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  let binary = "";
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

type TelegramPhoto = { file_id: string; file_size?: number };
type TelegramMessage = {
  chat?: { id?: number };
  text?: string;
  photo?: TelegramPhoto[];
  document?: { file_id: string; mime_type?: string };
};

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const botToken = process.env["TELEGRAM_BOT_TOKEN"];
        if (!botToken) return new Response("Not configured", { status: 500 });

        const expected = await sha256Base64Url(`telegram-webhook:${botToken}`);
        if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const update = (await request.json()) as {
          message?: TelegramMessage;
          edited_message?: TelegramMessage;
        };
        const message = update.message ?? update.edited_message;
        const chatId = message?.chat?.id;
        if (!chatId) return Response.json({ ok: true });

        try {
          const photo = message?.photo?.[message.photo.length - 1];
          const doc = message?.document;
          const isImageDoc = !!doc?.mime_type?.startsWith("image/");

          if (!photo && !isImageDoc) {
            await sendMessage(chatId, WELCOME);
            return Response.json({ ok: true });
          }

          await sendChatAction(chatId, "upload_document");

          const fileId = photo ? photo.file_id : doc!.file_id;
          const mime = photo ? "image/jpeg" : (doc!.mime_type ?? "image/jpeg");
          const bytes = await downloadFile(fileId);
          const cutout = await removeBackground(bytes, mime);

          await sendDocument(
            chatId,
            cutout,
            "background-removed.png",
            "✅ Background removed — transparent PNG, free forever.",
          );
        } catch (error) {
          const reason = error instanceof Error ? error.message : "unknown";
          console.error("telegram webhook error", reason);
          const text =
            reason === "RATE_LIMIT"
              ? "⏳ Too many requests right now. Please try again in a minute."
              : reason === "NO_CREDITS"
                ? "⚠️ The bot is temporarily out of processing capacity. Please try again later."
                : "❌ Sorry, I couldn't process that image. Try another photo.";
          await sendMessage(chatId, text).catch(() => undefined);
        }

        return Response.json({ ok: true });
      },
    },
  },
});