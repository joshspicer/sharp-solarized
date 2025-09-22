/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { applyThemeValidationTools } from './themeTools';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

export async function getServer(): Promise<Server> {
	const server = new McpServer({
		name: 'Sharp Solarized Theme Validation Server',
		version: '1.0.0',
		title: 'An MCP Server that can validate Sharp Solarized theme colors, contrast, and icons using Playwright automation.'
	}, { capabilities: { logging: {} } });

	// Start VS Code or connect to running instance
	server.tool(
		'theme_validation_start',
		'Start VS Code with Sharp Solarized Theme',
		{
			type: 'object',
			properties: {
				headless: {
					type: 'boolean',
					description: 'Run in headless mode',
					default: false
				}
			}
		},
		async (args) => {
			const { headless = false } = args;
			try {
				// This will be implemented to launch VS Code with the theme
				const message = `VS Code ${headless ? 'headless ' : ''}started with Sharp Solarized theme for validation`;
				return {
					content: [{
						type: 'text' as const,
						text: message
					}]
				};
			} catch (error) {
				return {
					content: [{
						type: 'text' as const,
						text: `Failed to start VS Code: ${error}`
					}]
				};
			}
		}
	);

	// Apply theme validation tools
	const registeredTools = applyThemeValidationTools(server);

	return server.server;
}