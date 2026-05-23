<div align="center">
  <a href="https://lunel.dev">
    <picture>
      <source srcset="https://lunel.dev/img/github/github-main-dark.png" media="(prefers-color-scheme: dark)" width="600">
      <source srcset="https://lunel.dev/img/github/github-main-light.png" media="(prefers-color-scheme: light)" width="600">
      <img src="https://lunel.dev/img/github/github-main-dark.png" alt="Lunel">
    </picture>
  </a>
</div><br />
<p align="center">AI-powered mobile IDE and cloud development platform. Code on your phone, run on your machine or in secure cloud sandboxes.</p> <br />

## Structure

| Directory | Description |
|-----------|-------------|
| `antigravity-chat-extension/` | Antigravity IDE custom agent extension |
| `app/` | Expo/React Native mobile app |
| `cli/` | CLI tool (`lunel-cli`) |
| `manager/` | Manager server |
| `proxy/` | Proxy server |
| `pty/` | Rust PTY binary uses wezterm internal libs for rendering |

<br />

## Usage

This can be used in two ways, both are for coding:

- Lunel Connect: One is when you want to remotely use pc without dealing with ssh and shit, geared towards coding
- Lunel Cloud: Coming soon

<br /> 

## App

Mobile app for iOS/Android/Web built with Expo. App is just a dumb client with most logic on cli and app just acting as a rendering client.

- File explorer and editor
- Git integration
- Terminal emulator
- Process management

### Supported Languages (22)

`en`, `zh`, `ja`, `ko`, `es`, `pt`, `de`, `fr`, `vi`, `ru`, `id`, `pl`, `tr`, `it`, `nl`, `sv`, `uk`, `fi`, `zh-TW`, `tw`, `ms`, `es-MX`

<br />

## CLI & Daemon Server

A Node.js daemon that bridges your local machine/IDE directly to the mobile app via a secure, real-time WebSocket channel. 

With the new Antigravity integration, you can bootstrap the entire stack with a single command:
```bash
npx lunel-gravity
```
*(Alternatively, you can run `npx lunel-cli` for the standard non-integrated mode).*

### Key Capabilities
- **Antigravity IDE Sync**: Real-time mirroring of active agent cascades, chat trajectories, planner modes, and model presets.
- **Filesystem Access**: Full read, write, grep, and directory traversal.
- **PTY Terminal**: High-frequency terminal spawning using a custom Rust terminal engine.
- **System Monitoring**: Real-time stats on CPU, battery, RAM, and active ports.

<br />

## Antigravity IDE Extension

To synchronize your IDE cascades and agent chat trajectories with the mobile app, you need to install the Antigravity Chat extension in your VS Code / Antigravity IDE.

### Installation Options

#### Option A: Install from VS Code Marketplace (Recommended)
1. Open your VS Code or Antigravity IDE.
2. Open the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`).
3. Search for **"Antigravity Chat"** or **"lunel-gravity"**.
4. Click **Install**.

#### Option B: Install from VSIX Package
1. Download the pre-compiled `.vsix` package from the [Releases](https://github.com/seeramsujay/lunel-gravity/releases) page.
2. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
3. Select **Developer: Install Extension from VSIX...**.
4. Choose the downloaded `.vsix` file and reload the editor.

#### Option C: Build and Sideload from Source
1. Navigate to the extension project folder:
   ```bash
   cd antigravity-chat-extension
   ```
2. Install development tools and dependencies:
   ```bash
   npm install
   ```
3. Compile and build the extension bundle:
   ```bash
   npm run build
   ```
4. Sideload it into your IDE or package it manually:
   ```bash
   npx vsce package
   ```
   Then install the packaged `.vsix` file.

<br />

<br />

## Manager and Proxy

Bun-based WebSocket relay server that connects CLI and app using session codes. Public verion deployed on gateway.lunel.dev

- Session management with 10-min TTL
- Dual-channel architecture (control + data)
- QR code pairing

<br />

## PTY

Rust binary for pseudo-terminal management, used by the CLI.

- Real PTY sessions via `wezterm` fork on github.com/sohzm/wezterm
- Screen buffer as cell grid (char + fg + bg per cell)
- 24fps render loop (only sends updates when content changes)
- JSON line protocol over stdin/stdout

<br />

## 📄 License

MIT: See [LICENSE](LICENSE) for details.

<br />

## Star History

<a href="https://www.star-history.com/#lunel-dev/lunel&Timeline">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=lunel-dev/lunel&type=Timeline&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=lunel-dev/lunel&type=Timeline" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=lunel-dev/lunel&type=Timeline" />
 </picture>
</a>
