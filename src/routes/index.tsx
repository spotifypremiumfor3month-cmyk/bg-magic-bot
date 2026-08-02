import { createFileRoute } from "@tanstack/react-router";
import { ImageOff, Send, Sparkles, Zap } from "lucide-react";

import heroImage from "@/assets/hero-cutout.jpg";

const BOT_URL = "https://t.me/Aiimaageremoverbot";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Free Telegram Background Remover Bot" },
      {
        name: "description",
        content:
          "Send any photo to our Telegram bot and get a studio-quality transparent PNG back in seconds. Unlimited, free, no signup.",
      },
      { property: "og:title", content: "Free Telegram Background Remover Bot" },
      {
        property: "og:description",
        content:
          "Send any photo to our Telegram bot and get a studio-quality transparent PNG back in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const steps = [
  {
    icon: Send,
    title: "Open the bot",
    body: "Tap the button and start a chat on Telegram — no account, no signup.",
  },
  {
    icon: ImageOff,
    title: "Send a photo",
    body: "Any picture works. Send it as a file to keep the full resolution.",
  },
  {
    icon: Sparkles,
    title: "Get a clean cutout",
    body: "You get a transparent PNG back with sharp, hair-level edges.",
  },
];

function Index() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium tracking-wide text-secondary-foreground uppercase">
            <Zap className="size-3.5" /> Free forever
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Professional background removal, right inside Telegram.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Send a photo to the bot and get it back as a studio-quality transparent PNG in
            seconds. Unlimited use, zero cost, no watermarks.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href={BOT_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Send className="size-4" />
              Open @Aiimaageremoverbot
            </a>
            <span className="text-sm text-muted-foreground">No signup · No watermark</span>
          </div>
        </div>

        <img
          src={heroImage}
          alt="A portrait before and after its background was removed"
          width={1400}
          height={900}
          className="w-full rounded-3xl border border-border object-cover shadow-2xl"
        />
      </section>

      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6">
              <Icon className="size-6 text-muted-foreground" />
              <h2 className="mt-4 text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-muted-foreground">
        Built with Telegram + AI cutout. Images are processed on the fly and never stored.
      </footer>
    </main>
  );
}
