// Bouwt een Bunny.net iframe-embed src uit library_id (env) + video_id (per oefening).
// Yari uploadt video's al naar Bunny en zet ze nu in Huddle; wij embedden direct.

const LIBRARY_ID = import.meta.env.VITE_BUNNY_LIBRARY_ID as string | undefined;

export function bunnyEmbedUrl(videoId: string | null | undefined, opts?: { autoplay?: boolean }): string | null {
  if (!videoId || !LIBRARY_ID) return null;
  const params = new URLSearchParams({
    autoplay: opts?.autoplay ? "true" : "false",
    preload: "true",
  });
  return `https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${videoId}?${params.toString()}`;
}

export const BUNNY_CONFIGURED = Boolean(LIBRARY_ID);
