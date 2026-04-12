type SessionEventType = "session-replaced" | "session-cleared";

interface SessionChannelEvent {
  type: SessionEventType;
  sessionId: string;
}

const CHANNEL_NAME = "docly:session-events";

function getChannel() {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }

  return new BroadcastChannel(CHANNEL_NAME);
}

export const sessionChannel = {
  publish(event: SessionChannelEvent) {
    const channel = getChannel();
    if (!channel) return;

    channel.postMessage(event);
    channel.close();
  },
  subscribe(handler: (event: SessionChannelEvent) => void) {
    const channel = getChannel();
    if (!channel) return () => undefined;

    const listener = (message: MessageEvent<SessionChannelEvent>) => {
      handler(message.data);
    };

    channel.addEventListener("message", listener);

    return () => {
      channel.removeEventListener("message", listener);
      channel.close();
    };
  },
};
