import type {
  AIProvider,
  AiEventEmitter,
  CodexPromptOptions,
  FileAttachment,
  ModelSelector,
  MessageInfo,
  ProviderInfo,
  SessionInfo,
  ShareInfo,
} from "./interface.js";

const BRIDGE_URL = "http://127.0.0.1:5842";

export class AntigravityProvider implements AIProvider {
  async init(): Promise<void> {
    // Proactively verify bridge connection
    try {
      const resp = await fetch(`${BRIDGE_URL}/sessions`);
      if (resp.ok) {
        console.log("[ai] Antigravity IDE Extension Bridge connected successfully.");
      }
    } catch {
      console.warn("[ai] Antigravity IDE Extension Bridge is not currently reachable. Ensure Antigravity IDE is running with the extension active.");
    }
  }

  async destroy(): Promise<void> {}

  subscribe(emitter: AiEventEmitter): () => void {
    let active = true;
    const runSse = async () => {
      while (active) {
        try {
          const response = await fetch(`${BRIDGE_URL}/events`);
          if (!response.ok) {
            throw new Error(`SSE status ${response.status}`);
          }
          const reader = response.body;
          if (!reader) throw new Error("No response body");
          
          let buffer = "";
          const stream = reader as unknown as AsyncIterable<Uint8Array>;
          for await (const chunk of stream) {
            if (!active) break;
            buffer += Buffer.from(chunk).toString("utf8");
            let lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = JSON.parse(line.substring(6));
                if (data.type === 'step') {
                  emitter({
                    type: "message.part.updated",
                    properties: {
                      sessionId: data.event.sessionId,
                      part: {
                        type: "step-finish",
                        title: `Step finished (${data.event.newCount} steps)`
                      }
                    }
                  });
                } else if (data.type === 'activeSession') {
                  emitter({
                    type: "session_focus",
                    properties: {
                      sessionId: data.event.sessionId
                    }
                  });
                }
              }
            }
          }
        } catch (err) {
          if (!active) break;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    };
    runSse();
    return () => {
      active = false;
    };
  }

  async createSession(title?: string, model?: ModelSelector, agent?: string): Promise<{ session: SessionInfo }> {
    const res = await fetch(`${BRIDGE_URL}/session/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, model: model?.modelID, agent }),
    });
    if (!res.ok) throw new Error("Failed to create session in Antigravity");
    const data = await res.json() as { session: any };
    return {
      session: {
        id: data.session.id,
        title: data.session.title,
        time: { created: Date.now(), updated: Date.now() },
        backend: "antigravity"
      }
    };
  }

  async listSessions(): Promise<{ sessions: unknown }> {
    const res = await fetch(`${BRIDGE_URL}/sessions`);
    if (!res.ok) throw new Error("Failed to list sessions from Antigravity");
    const data = await res.json() as { sessions: any[] };
    // Map to the session structure expected by Lunel
    const sessions = data.sessions.map(s => {
      const lastActive = typeof s.lastActiveAt === "number"
        ? s.lastActiveAt
        : typeof s.lastActiveAt === "string"
          ? Date.parse(s.lastActiveAt)
          : Date.now();
      return {
        id: s.id,
        title: s.title || "Cascade Session",
        time: { created: lastActive, updated: lastActive },
        backend: "antigravity"
      };
    });
    return { sessions };
  }

  async getSession(id: string): Promise<{ session: SessionInfo }> {
    const sessionsRes = await this.listSessions();
    const sessions = (sessionsRes.sessions as any[]) || [];
    const session = sessions.find(s => s.id === id);
    if (!session) throw new Error("Session not found");
    return { session };
  }

  async deleteSession(id: string): Promise<{ deleted: boolean }> {
    const res = await fetch(`${BRIDGE_URL}/session/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error("Failed to delete session in Antigravity");
    return res.json() as Promise<{ deleted: boolean }>;
  }

  async renameSession(id: string, title: string): Promise<{ session: SessionInfo }> {
    const res = await fetch(`${BRIDGE_URL}/session/rename`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title }),
    });
    if (!res.ok) throw new Error("Failed to rename session in Antigravity");
    const data = await res.json() as { session: any };
    return {
      session: {
        id: data.session.id,
        title: data.session.title,
        time: { created: Date.now(), updated: Date.now() },
        backend: "antigravity"
      }
    };
  }

  async getMessages(sessionId: string): Promise<{ messages: MessageInfo[] }> {
    const res = await fetch(`${BRIDGE_URL}/messages?id=${encodeURIComponent(sessionId)}`);
    if (!res.ok) throw new Error("Failed to get messages from Antigravity");
    const data = await res.json() as { messages: any[] };
    
    // Map Antigravity messages to Lunel AIMessage shape:
    const messages: MessageInfo[] = data.messages.map(m => {
      const createdTime = m.createdAt ? Date.parse(m.createdAt) : Date.now();
      return {
        id: m.id || `msg-${Math.random()}`,
        role: m.role === "USER" || m.role === "user" ? "user" : "assistant",
        parts: [{ type: "text", text: m.content || "" }],
        time: { created: createdTime, updated: createdTime },
      };
    });
    return { messages };
  }

  async prompt(
    sessionId: string,
    text: string,
    model?: ModelSelector,
    agent?: string,
    files?: FileAttachment[],
    codexOptions?: CodexPromptOptions,
  ): Promise<{ ack: true }> {
    const res = await fetch(`${BRIDGE_URL}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, text, model: model?.modelID, agent }),
    });
    if (!res.ok) throw new Error("Failed to prompt Antigravity session");
    return { ack: true };
  }

  async abort(sessionId: string): Promise<Record<string, never>> {
    return {};
  }

  async agents(): Promise<{ agents: unknown }> {
    return {
      agents: [
        { id: "cascade", name: "Cascade Mode" },
        { id: "chat", name: "Chat Mode" }
      ]
    };
  }

  async providers(): Promise<ProviderInfo> {
    return {
      providers: [
        {
          id: "antigravity",
          name: "Antigravity IDE Agent",
          models: {
            "gemini-flash": { id: "gemini-flash", name: "Gemini 2.0 Flash" },
            "gemini-pro": { id: "gemini-pro", name: "Gemini Pro" },
            "gemini-pro-high": { id: "gemini-pro-high", name: "Gemini Pro Ultra" },
            "claude-sonnet": { id: "claude-sonnet", name: "Claude 3.5 Sonnet" },
            "claude-opus": { id: "claude-opus", name: "Claude 3 Opus" },
          }
        }
      ],
      default: { antigravity: "gemini-flash" },
      defaults: { antigravity: "gemini-flash" }
    };
  }

  async setAuth(providerId: string, key: string): Promise<Record<string, never>> {
    return {};
  }

  async command(sessionId: string, command: string, args: string): Promise<{ result: unknown }> {
    return { result: null };
  }

  async revert(sessionId: string, messageId: string): Promise<Record<string, never>> {
    return {};
  }

  async unrevert(sessionId: string): Promise<Record<string, never>> {
    return {};
  }

  async share(sessionId: string): Promise<{ share: ShareInfo }> {
    return { share: { url: "" } };
  }

  async permissionReply(
    sessionId: string,
    permissionId: string,
    response: "once" | "always" | "reject",
  ): Promise<Record<string, never>> {
    return {};
  }
}
