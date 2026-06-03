import { bunnyEmbedUrl } from "../lib/bunny";

export function BunnyPlayer({ videoId, title }: { videoId: string | null | undefined; title?: string }) {
  const src = bunnyEmbedUrl(videoId);
  if (!src) {
    return (
      <div className="aspect-video bg-ink-50 rounded-xl flex items-center justify-center text-sm muted border border-ink-100">
        Geen video beschikbaar
      </div>
    );
  }
  return (
    <div className="aspect-video rounded-xl overflow-hidden bg-black">
      <iframe
        src={src}
        title={title ?? "Oefening"}
        loading="lazy"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        className="w-full h-full border-0"
      />
    </div>
  );
}
