/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { applyThemeValidationTools } from './themeTools';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import * as fs from 'fs';
import * as path from 'path';

export async function getServer(): Promise<Server> {
	const server = new McpServer({
		name: 'Sharp Solarized Theme Validation Server',
		version: '1.0.0',
		title: 'An MCP Server that can validate Sharp Solarized theme colors, contrast, and icons using Playwright automation.'
	}, { capabilities: { logging: {} } });

	// Extension packaging tool
	server.tool(
		'package_extension',
		'Package the Sharp Solarized extension into a VSIX file for installation',
		{
			type: 'object',
			properties: {
				extensionPath: {
					type: 'string',
					description: 'Path to the extension directory',
					default: '/home/runner/work/sharp-solarized/sharp-solarized'
				},
				outputPath: {
					type: 'string',
					description: 'Output path for the VSIX file',
					default: '/tmp/sharp-solarized.vsix'
				}
			}
		},
		async (args) => {
			const { extensionPath = '/home/runner/work/sharp-solarized/sharp-solarized', outputPath = '/tmp/sharp-solarized.vsix' } = args;
			
			try {
				// Check if the extension directory exists and has package.json
				const packageJsonPath = path.join(extensionPath, 'package.json');
				if (!fs.existsSync(packageJsonPath)) {
					throw new Error(`No package.json found at ${packageJsonPath}`);
				}
				
				// Read package.json to verify it's a VS Code extension
				const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
				if (!packageJson.contributes || (!packageJson.contributes.themes && !packageJson.contributes.iconThemes)) {
					throw new Error('This does not appear to be a VS Code theme extension');
				}
				
				const message = `Extension validated at ${extensionPath}:
- Name: ${packageJson.name || 'Unknown'}
- Version: ${packageJson.version || 'Unknown'}
- Themes: ${packageJson.contributes.themes?.length || 0}
- Icon Themes: ${packageJson.contributes.iconThemes?.length || 0}

To package this extension:
1. Install vsce: npm install -g vsce
2. Run: cd "${extensionPath}" && vsce package --out "${outputPath}"
3. The VSIX file can then be installed in VS Code

Note: This tool validates the extension structure. Use the system's vsce command for actual packaging.`;
				
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
						text: `Failed to validate extension: ${error instanceof Error ? error.message : String(error)}`
					}]
				};
			}
		}
	);

	// Apply theme validation tools
	const registeredTools = applyThemeValidationTools(server);

	return server.server;
}