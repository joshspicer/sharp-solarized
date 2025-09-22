/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { applyThemeValidationTools } from './themeTools.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

export async function getServer(): Promise<Server> {
	const server = new McpServer({
		name: 'Sharp Solarized Theme Validation Server',
		version: '1.0.0',
		title: 'An MCP Server that can validate Sharp Solarized theme colors, contrast, and icons using Playwright automation.'
	}, { capabilities: { logging: {} } });

	// Apply theme validation tools
	const registeredTools = applyThemeValidationTools(server);

	return server.server;
}