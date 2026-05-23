import * as vscode from 'vscode';
import { AntigravitySDK, IntegrationManager, Models } from 'antigravity-sdk';
import * as http from 'http';
import * as net from 'net';

class BridgeServer implements vscode.Disposable {
    private server: http.Server;
    private sockets = new Set<net.Socket>();
    private sseConnections = new Set<http.ServerResponse>();

    constructor(sdk: AntigravitySDK) {
        this.server = http.createServer(async (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            if (req.method === 'OPTIONS') {
                res.writeHead(204);
                res.end();
                return;
            }

            try {
                const url = new URL(req.url || '', `http://${req.headers.host}`);
                
                if (req.method === 'GET' && url.pathname === '/sessions') {
                    const sessions = await sdk.cascade.getSessions();
                    res.writeHead(200);
                    res.end(JSON.stringify({ sessions }));
                    return;
                }

                if (req.method === 'GET' && url.pathname === '/messages') {
                    const sessionId = url.searchParams.get('id');
                    if (!sessionId) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: 'Missing session id' }));
                        return;
                    }
                    const detail = await sdk.ls.getConversation(sessionId);
                    res.writeHead(200);
                    res.end(JSON.stringify({ messages: detail?.messages || [] }));
                    return;
                }

                if (req.method === 'POST' && url.pathname === '/prompt') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', async () => {
                        try {
                            const data = JSON.parse(body);
                            const modelMapping: Record<string, number> = {
                                "gemini-flash": Models.GEMINI_FLASH,
                                "gemini-pro": Models.GEMINI_PRO_LOW,
                                "gemini-pro-high": Models.GEMINI_PRO_HIGH,
                                "claude-sonnet": Models.CLAUDE_SONNET,
                                "claude-opus": Models.CLAUDE_OPUS,
                            };
                            const modelId = data.model ? modelMapping[data.model] : undefined;
                            await sdk.ls.sendMessage({
                                cascadeId: data.sessionId,
                                text: data.text,
                                model: modelId
                            });
                            res.writeHead(200);
                            res.end(JSON.stringify({ ack: true }));
                        } catch (err: any) {
                            res.writeHead(500);
                            res.end(JSON.stringify({ error: err.message }));
                        }
                    });
                    return;
                }

                if (req.method === 'POST' && url.pathname === '/session/create') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', async () => {
                        try {
                            const data = JSON.parse(body);
                            const modelMapping: Record<string, number> = {
                                "gemini-flash": Models.GEMINI_FLASH,
                                "gemini-pro": Models.GEMINI_PRO_LOW,
                                "gemini-pro-high": Models.GEMINI_PRO_HIGH,
                                "claude-sonnet": Models.CLAUDE_SONNET,
                                "claude-opus": Models.CLAUDE_OPUS,
                            };
                            const modelId = data.model ? modelMapping[data.model] : undefined;
                            const plannerType = data.agent === 'chat' ? 'conversational' : 'normal';
                            const cascadeId = await sdk.ls.createCascade({
                                text: data.title || 'New Conversation',
                                model: modelId,
                                plannerType: plannerType
                            });
                            res.writeHead(200);
                            res.end(JSON.stringify({ session: { id: cascadeId, title: data.title || 'New Conversation' } }));
                        } catch (err: any) {
                            res.writeHead(500);
                            res.end(JSON.stringify({ error: err.message }));
                        }
                    });
                    return;
                }

                if (req.method === 'POST' && url.pathname === '/session/delete') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', async () => {
                        try {
                            const data = JSON.parse(body);
                            await sdk.ls.cancelCascade(data.id);
                            res.writeHead(200);
                            res.end(JSON.stringify({ deleted: true }));
                        } catch (err: any) {
                            res.writeHead(500);
                            res.end(JSON.stringify({ error: err.message }));
                        }
                    });
                    return;
                }

                if (req.method === 'POST' && url.pathname === '/session/rename') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', async () => {
                        try {
                            const data = JSON.parse(body);
                            await sdk.ls.setTitle(data.id, data.title);
                            res.writeHead(200);
                            res.end(JSON.stringify({ session: { id: data.id, title: data.title } }));
                        } catch (err: any) {
                            res.writeHead(500);
                            res.end(JSON.stringify({ error: err.message }));
                        }
                    });
                    return;
                }

                if (req.method === 'GET' && url.pathname === '/events') {
                    res.writeHead(200, {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                    });
                    
                    this.sseConnections.add(res);

                    const onStepChange = sdk.monitor.onStepCountChanged(event => {
                        res.write(`data: ${JSON.stringify({ type: 'step', event })}\n\n`);
                    });

                    const onActiveChange = sdk.monitor.onActiveSessionChanged(event => {
                        res.write(`data: ${JSON.stringify({ type: 'activeSession', event })}\n\n`);
                    });

                    req.on('close', () => {
                        onStepChange.dispose();
                        onActiveChange.dispose();
                        this.sseConnections.delete(res);
                    });
                    return;
                }

                res.writeHead(404);
                res.end(JSON.stringify({ error: 'Not Found' }));
            } catch (err: any) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
            }
        });

        this.server.on('connection', (socket) => {
            this.sockets.add(socket);
            socket.on('close', () => this.sockets.delete(socket));
        });

        this.server.listen(5842, '127.0.0.1', () => {
            console.log('Antigravity Extension Bridge Server running on http://127.0.0.1:5842');
        });
    }

    dispose() {
        console.log('Stopping Antigravity Extension Bridge Server...');
        for (const res of this.sseConnections) {
            try { res.end(); } catch {}
        }
        this.sseConnections.clear();
        for (const socket of this.sockets) {
            try { socket.destroy(); } catch {}
        }
        this.sockets.clear();
        try {
            this.server.close();
        } catch {}
    }
}

export async function activate(context: vscode.ExtensionContext) {
    console.log('Antigravity Chat Monitor Extension is now activating...');

    // 1. Initialize the SDK
    const sdk = new AntigravitySDK(context);
    try {
        await sdk.initialize();
        console.log('Antigravity SDK successfully initialized.');
    } catch (err) {
        console.error('Failed to initialize Antigravity SDK:', err);
    }

    // Register the SDK in subscriptions for cleanup during deactivation
    context.subscriptions.push(sdk);

    // 2. Start the HTTP Bridge Server
    const bridge = new BridgeServer(sdk);
    context.subscriptions.push(bridge);

    // 3. Query and Monitor Cascades (Conversations)
    try {
        const activeSessions = await sdk.cascade.getSessions();
        console.log(`Discovered ${activeSessions.length} active agent workflows (Cascades).`);
        activeSessions.forEach((session: any) => {
            console.log(`- [${session.id}] Title: "${session.title}" (Last Active: ${session.lastActiveAt})`);
        });
    } catch (err) {
        console.error('Failed to retrieve active agent sessions:', err);
    }

    // 4. Register Event Monitor Listeners
    sdk.monitor.onStepCountChanged((event) => {
        console.log(`Agent Cascade [${event.title}] advanced by ${event.delta} steps. Current steps: ${event.newCount}`);
        vscode.window.showInformationMessage(`Agent step updated in [${event.title}]: +${event.delta} steps.`);
    });

    sdk.monitor.onActiveSessionChanged((event) => {
        console.log(`User focus shifted to Cascade thread: "${event.title}" (ID: ${event.sessionId})`);
    });

    // Start polling the state DB for events
    sdk.monitor.start();
    console.log('Antigravity Agent Event Monitor started.');

    // 5. Register VS Code command to show analytics
    const showAnalyticsDisposable = vscode.commands.registerCommand('antigravity-chat-extension.showAnalytics', async () => {
        try {
            const sessions = await sdk.cascade.getSessions();
            
            const panel = vscode.window.createWebviewPanel(
                'antigravityAnalytics',
                'Antigravity Agent Analytics',
                vscode.ViewColumn.One,
                {}
            );
            
            panel.webview.html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <title>Antigravity Agent Analytics</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: var(--vscode-editor-foreground); background-color: var(--vscode-editor-background); }
                        h1 { color: var(--vscode-textLink-foreground); }
                        ul { padding-left: 20px; }
                        li { margin-bottom: 10px; }
                    </style>
                </head>
                <body>
                    <h1>Active Agent Workflows</h1>
                    <p>Current active cascades running in the workspace:</p>
                    <ul>
                        ${sessions.map((s: any) => `<li><strong>${s.title}</strong> (ID: <code>${s.id}</code>, Last Active: ${s.lastActiveAt})</li>`).join('')}
                    </ul>
                </body>
                </html>
            `;
        } catch (err: any) {
            vscode.window.showErrorMessage(`Error displaying analytics: ${err.message}`);
        }
    });
    context.subscriptions.push(showAnalyticsDisposable);

    // 6. Setup UI Integration using IntegrationManager
    try {
        const ui = new IntegrationManager();
        
        // Add button to the top navigation bar of the active Agent View
        ui.addTopBarButton('extension-analytics-btn', '📊', 'View Agent Analytics', {
            title: 'Agent Performance & Cost Analytics',
            rows: [
                { key: 'Monitor Status', value: 'Active' },
                { key: 'Bridges Connected', value: 'Cascade, EventMonitor, Commands' }
            ]
        });

        // Add token cost telemetry slot below each turn in the chat window
        ui.addTurnMetadata('token-tracker', ['turnNumber', 'aiCharCount'], true);

        // Add setting dropdown button inside the settings menu
        ui.addDropdownItem('export-pdf', 'Export Cascade Thread as Architectural Plan', '📄');

        // Add a title bar double-click listener to bookmark/pin Cascade
        ui.addTitleInteraction('bookmark-session', 'dblclick', 'Double-click to pin this Cascade');

        // Install the integration scripts into workbench.html
        await ui.install();
        
        // Enable repair mechanisms to survive IDE updates
        ui.enableAutoRepair();
        
        console.log('UI Integration Manager successfully installed DOM hooks.');
    } catch (err) {
        console.error('Failed to configure UI Integration Manager:', err);
    }
}

export function deactivate() {
    console.log('Antigravity Chat Monitor Extension deactivated.');
}

