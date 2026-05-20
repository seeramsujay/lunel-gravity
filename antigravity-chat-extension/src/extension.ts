import * as vscode from 'vscode';
import { AntigravitySDK, IntegrationManager, Models } from 'antigravity-sdk';

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

    // 2. Query and Monitor Cascades (Conversations)
    try {
        const activeSessions = await sdk.cascade.getSessions();
        console.log(`Discovered ${activeSessions.length} active agent workflows (Cascades).`);
        activeSessions.forEach((session: any) => {
            console.log(`- [${session.id}] Title: "${session.title}" (Last Active: ${session.lastActiveAt})`);
        });
    } catch (err) {
        console.error('Failed to retrieve active agent sessions:', err);
    }

    // 3. Register Event Monitor Listeners
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

    // 4. Register VS Code command to show analytics
    const showAnalyticsDisposable = vscode.commands.registerCommand('antigravity-chat-extension.showAnalytics', async () => {
        try {
            const sessions = await sdk.cascade.getSessions();
            const sessionInfo = sessions.map((s: any) => `- **${s.title}** (ID: ${s.id})`).join('\n') || 'No active sessions.';
            
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

    // 5. Setup UI Integration using IntegrationManager
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
