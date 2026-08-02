import { createFileRoute } from "@tanstack/react-router";

import { blackBackground, removeBackground } from "@/lib/bg-remove.server";
import {
  answerCallbackQuery,
  downloadFile,
  sendChatAction,
  sendDocument,
  sendMessage,
  sendPhoto,
  type InlineKeyboard,
} from "@/lib/telegram.server";

const WELCOME = [
  "⚫️✨ <b>MAGIC BACKGROUND REMOVER</b> ✨⚫️",
  "━━━━━━━━━━━━━━━━━━",
  "",
  "📸 Drop any photo → get a <b>studio-quality cut-out</b> in seconds.",
  "",
  "🖤 <b>Black preview</b> — crisp, no white or grey haze",
  "🫧 <b>Transparent PNG</b> — ready for design work",
  "🚀 <b>Unlimited &amp; 100% free</b>, forever",
  "",
  "Tap a button below or just send a photo 👇",
].join("\n");

const HELP = [
  "💡 <b>Pro tips for perfect cut-outs</b>",
  "",
  "1️⃣ Send as a <b>file</b> for max resolution",
  "2️⃣ Good lighting = sharper edges",
  "3️⃣ Save the <b>PNG document</b> (not the preview) to keep transparency",
  "",
  "Now send me a photo 🪄",
].join("\n");

const MENU: InlineKeyboard = [
  [{ text: "🪄 Remove a background", callback_data: "start" }],
  [
    { text: "💡 Tips", callback_data: "help" },
    { text: "ℹ️ About", callback_data: "about" },
  ],
];

const RESULT_KEYS: InlineKeyboard = [
  [{ text: "🔁 Do another photo", callback_data: "start" }],
  [{ text: "💡 Tips", callback_data: "help" }],
];

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
          callback_query?: {
            id: string;
            data?: string;
            message?: { chat?: { id?: number } };
          };
        };

        const cb = update.callback_query;
        if (cb) {
          const cbChat = cb.message?.chat?.id;
          await answerCallbackQuery(cb.id);
          if (cbChat) {
            const text =
              cb.data === "help"
                ? HELP
                : cb.data === "about"
                  ? [
                      "ℹ️ <b>About this bot</b>",
                      "",
                      "AI-powered background removal with pixel-perfect edges — hair, fur and fine detail included.",
                      "",
                      "No watermarks. No limits. No cost. 🖤",
                    ].join("\n")
                  : "📸 Go ahead — send me the photo and I'll work my magic 🪄";
            await sendMessage(cbChat, text, MENU);
          }
          return Response.json({ ok: true });
        }

        const message = update.message ?? update.edited_message;
        const chatId = message?.chat?.id;
        if (!chatId) return Response.json({ ok: true });

        try {
          const photo = message?.photo?.[message.photo.length - 1];
          const doc = message?.document;
          const isImageDoc = !!doc?.mime_type?.startsWith("image/");

          if (!photo && !isImageDoc) {
            await sendMessage(chatId, message?.text === "/help" ? HELP : WELCOME, MENU);
            return Response.json({ ok: true });
          }

          await sendChatAction(chatId, "upload_photo");

          const fileId = photo ? photo.file_id : doc!.file_id;
          const mime = photo ? "image/jpeg" : (doc!.mime_type ?? "image/jpeg");
          const bytes = await downloadFile(fileId);
          const [cutout, onBlack] = await Promise.all([
            removeBackground(bytes, mime),
            blackBackground(bytes, mime).catch(() => null),
          ]);

          if (onBlack) {
            await sendChatAction(chatId, "upload_photo");
            await sendPhoto(
              chatId,
              onBlack,
              "preview-black.png",
              "🖤 <b>Preview on pure black</b> — clean edges, zero haze.",
            );
          }

          await sendChatAction(chatId, "upload_document");
          await sendDocument(
            chatId,
            cutout,
            "background-removed.png",
            "🫧 <b>Transparent PNG</b> — download this one to keep the alpha channel.\n\n✨ Free forever.",
            RESULT_KEYS,
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
          await sendMessage(chatId, text, MENU).catch(() => undefined);
        }

        return Response.json({ ok: true });
      },
    },
  },
});