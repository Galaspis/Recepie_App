import { isStoredVideo } from "@/lib/video";

/** Web: our stored copy plays in a native <video>; otherwise the platform's embed in an iframe. */
export function VideoEmbed({ url }: { url: string }) {
  if (isStoredVideo(url)) {
    return (
      <video
        src={url}
        controls
        autoPlay
        playsInline
        style={{
          width: "100%",
          maxHeight: "70vh",
          backgroundColor: "black",
          borderRadius: 16,
        }}
      />
    );
  }
  return (
    <iframe
      src={url}
      title="video"
      style={{
        flex: 1,
        width: "100%",
        border: 0,
        backgroundColor: "black",
        minHeight: 420,
      }}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
    />
  );
}
