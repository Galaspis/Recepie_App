import { WebView } from "react-native-webview";

import { Loading } from "@/components/ui";

/** Native: the platform's embed player inside a WebView. Web version is in video-embed.web.tsx. */
export function VideoEmbed({ url }: { url: string }) {
  return (
    <WebView
      source={{ uri: url }}
      style={{ flex: 1, backgroundColor: "black" }}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      allowsFullscreenVideo
      startInLoadingState
      renderLoading={() => <Loading />}
    />
  );
}
