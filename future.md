# Lunel Gravity: Architectural Review & Mobile IDE Roadmap (future.md)

---

## 1. Architectural Code Review & Current State Analysis

Lunel Gravity bridges the developer desktop IDE and the mobile form factor, enabling engineers to inspect code, trigger builds, and direct AI agent cascades from iOS, Android, or mobile browsers. It synchronizes the **Antigravity IDE** environment through a Node.js CLI daemon, a custom Rust PTY binary (leveraging WezTerm internal libraries for cell-grid diffing at 24fps), and a Bun-based WebSocket relay.

### Architectural Strengths
- **Low-Overhead Differential PTY:** Uses a Rust PTY engine that emits cell grid diffs only when terminal character content changes, drastically preserving mobile battery and bandwidth.
- **Bi-Directional Antigravity Cascade Sync:** Directly mirrors active agent trajectories, planner phases, model selections, and file diffs between the local machine and mobile phone.
- **Polyglot Mobile App:** Built on Expo / React Native with support for 22 spoken languages and zero-touch QR-code pairing.

### Identified Bottlenecks & Code Smells
1. **Central Relay Dependency:** Relies on a centralized Bun WebSocket relay (`gateway.lunel.dev`), adding 80–200ms latency on mobile data networks and presenting a single point of failure if disconnected.
2. **Memory Leaks in Terminal Screen Buffers:** Heavy scrollback buffers in React Native can degrade UI thread responsiveness after running long build processes (e.g. compiling large C++/Rust packages).
3. **Absence of On-Device AST Syntax Highlighting:** Syntax coloring currently relies on pre-processed tokens from the host rather than dynamic client-side Tree-Sitter parsing.

---

## 2. Strategic Engineering Roadmap

```mermaid
flowchart TD
    subgraph Phase 1: WebRTC Direct P2P & Mosh Shell
        P1A[WebRTC ICE / STUN P2P DataChannels] --> P1B[Sub-15ms Terminal Frame Rate]
        P1B --> P1C[Mosh-Style Predictive Local Echo]
    end

    subgraph Phase 2: Mobile Agent Orchestration & Voice-to-Code
        P2A[Whisper Voice-to-Code Streaming] --> P2B[Antigravity Cascade Mobile Prompts]
        P2B --> P2C[One-Click Git PR Approval & Deployments]
    end

    subgraph Phase 3: Client-Side Tree-Sitter & Virtual Canvas
        P3A[Wasm Tree-Sitter Syntax Engine] --> P3B[Virtualized Skia Canvas Terminal]
        P3B --> P3C[Zero-Lag 120Hz ProMotion Scrolling]
    end

    subgraph Phase 4: Self-Hosted Cloud Sandboxes
        P4A[Firecracker MicroVM Cloud Clusters] --> P4B[Instant Zero-Install Dev Environments]
        P4C[Multi-Device Team Pair Programming Hub] --> P4B
    end

    Phase 1 --> Phase 2
    Phase 2 --> Phase 3
    Phase 3 --> Phase 4
```

---

## 3. Detailed Milestone Execution Plan

### Milestone 1: WebRTC Direct P2P Tunneling & Network Resilience
- [ ] **Direct WebRTC DataChannel:** Bypass relay servers for local Wi-Fi or STUN-negotiated direct connections, reducing terminal round-trip latency to $<15\text{ms}$.
- [ ] **Predictive Typing Echo:** Implement Mosh-inspired optimistic local character echoing on mobile keyboards so latency spikes never freeze typing.
- [ ] **Automatic Network Roaming:** Seamless reconnection when switching between Wi-Fi and 5G cellular without dropping active SSH or PTY sessions.

### Milestone 2: Native Voice-to-Code & Antigravity Agent Directives
- [ ] **On-Device Whisper Transcription:** Allow hands-free programming via voice notes converted to structured Antigravity prompt instructions.
- [ ] **Interactive Cascade Approvals:** Provide native iOS/Android interactive notifications allowing one-tap approvals for agent tool calls (bash runs, file writes).
- [ ] **Biometric Session Encryption:** Guard sensitive terminal access behind FaceID / Fingerprint biometric authentication.

### Milestone 3: React Native Skia Virtualized Terminal
- [ ] **Shopify React Native Skia Engine:** Replace DOM/View cell-grid components with hardware-accelerated Skia 2D rendering, unlocking 120Hz scrolling across 100,000 terminal lines.
- [ ] **Client-Side Tree-Sitter Wasm:** Highlight code in real-time on device without server bandwidth consumption.

### Milestone 4: MicroVM Cloud Sandboxes (Lunel Cloud)
- [ ] **Firecracker MicroVM Spawner:** Boot ephemeral Linux microVMs in $<250\text{ms}$ with pre-installed toolchains for Rust, Python, Go, and Node.js.
- [ ] **Collaborative Multi-Peer Sessions:** Share live terminal and code buffers with teammates via CRDTs (Yjs) directly on mobile.
