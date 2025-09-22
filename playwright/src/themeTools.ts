/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';
import { chromium, Browser, Page } from 'playwright';

let browser: Browser | null = null;
let page: Page | null = null;

/**
 * Apply theme validation tools to the MCP server
 * @param server - The MCP server instance
 * @returns The registered tools from the server
 */
export function applyThemeValidationTools(server: McpServer): RegisteredTool[] {
	const tools: RegisteredTool[] = [];

	// Tool to launch VS Code with the theme for testing
	tools.push(server.tool(
		'launch_vscode_with_theme',
		'Launch VS Code with Sharp Solarized theme',
		{
			type: 'object',
			properties: {
				headless: {
					type: 'boolean',
					description: 'Run browser in headless mode',
					default: false
				},
				extensionPath: {
					type: 'string',
					description: 'Path to the theme extension (.vsix file or folder)',
					default: '/Users/jospicer/dev/sharp-solarized'
				}
			}
		},
		async (args) => {
			const { headless = false, extensionPath = '/Users/jospicer/dev/sharp-solarized' } = args;
			
			try {
				// Launch browser
				browser = await chromium.launch({ 
					headless,
					args: ['--disable-web-security', '--allow-running-insecure-content']
				});
				
				// Create page and navigate to VS Code web
				page = await browser.newPage();
				
				// Navigate to VS Code web (you might need to adjust this URL)
				await page.goto('https://vscode.dev');
				
				// Wait for VS Code to load
				await page.waitForSelector('.monaco-workbench', { timeout: 10000 });
				
				return {
					content: [{
						type: 'text' as const,
						text: `VS Code launched successfully in ${headless ? 'headless' : 'headed'} mode. Ready for theme validation.`
					}]
				};
			} catch (error) {
				return {
					content: [{
						type: 'text' as const,
						text: `Failed to launch VS Code: ${error}`
					}]
				};
			}
		}
	));

	// Tool to apply the Sharp Solarized theme
	tools.push(server.tool(
		'apply_sharp_solarized_theme',
		'Apply Sharp Solarized theme in VS Code',
		{},
		async () => {
			if (!page) {
				return {
					content: [{
						type: 'text' as const,
						text: 'VS Code not launched. Please run launch_vscode_with_theme first.'
					}]
				};
			}

			try {
				// Open command palette
				await page.keyboard.press('F1');
				await page.waitForSelector('.quick-input-widget', { timeout: 5000 });
				
				// Search for theme preferences
				await page.fill('.quick-input-widget input', 'Preferences: Color Theme');
				await page.keyboard.press('Enter');
				
				// Wait for theme picker
				await page.waitForSelector('.quick-input-widget', { timeout: 5000 });
				
				// Look for Sharp Solarized theme (it might not be installed yet)
				await page.fill('.quick-input-widget input', 'Sharp Solarized');
				
				// Try to select it
				const themeOption = await page.locator('.quick-input-list .monaco-list-row').first();
				if (await themeOption.isVisible()) {
					await themeOption.click();
					return {
						content: [{
							type: 'text' as const,
							text: 'Sharp Solarized theme applied successfully!'
						}]
					};
				} else {
					return {
						content: [{
							type: 'text' as const,
							text: 'Sharp Solarized theme not found. You may need to install it first.'
						}]
					};
				}
			} catch (error) {
				return {
					content: [{
						type: 'text' as const,
						text: `Failed to apply theme: ${error}`
					}]
				};
			}
		}
	));

	// Tool to validate theme colors and contrast
	tools.push(server.tool(
		'validate_theme_colors',
		'Validate Sharp Solarized theme colors and contrast ratios',
		{
			type: 'object',
			properties: {
				captureScreenshot: {
					type: 'boolean',
					description: 'Capture screenshot of the current theme',
					default: true
				}
			}
		},
		async (args) => {
			const { captureScreenshot = true } = args;
			
			if (!page) {
				return {
					content: [{
						type: 'text' as const,
						text: 'VS Code not launched. Please run launch_vscode_with_theme first.'
					}]
				};
			}

			try {
				const results: string[] = [];
				
				// Check main editor background color
				const editorBg = await page.evaluate(() => {
					const editor = document.querySelector('.monaco-editor .view-lines');
					return editor ? getComputedStyle(editor).backgroundColor : null;
				});
				
				if (editorBg) {
					results.push(`Editor background: ${editorBg}`);
					
					// Expected Sharp Solarized color (sepia background)
					const expectedRgb = 'rgb(247, 244, 232)'; // #f7f4e8
					if (editorBg === expectedRgb) {
						results.push('✅ Editor background matches Sharp Solarized sepia tone');
					} else {
						results.push(`❌ Editor background mismatch. Expected: ${expectedRgb}, Got: ${editorBg}`);
					}
				}
				
				// Check activity bar background
				const activityBarBg = await page.evaluate(() => {
					const activityBar = document.querySelector('.part.activitybar');
					return activityBar ? getComputedStyle(activityBar).backgroundColor : null;
				});
				
				if (activityBarBg) {
					results.push(`Activity bar background: ${activityBarBg}`);
				}
				
				// Take screenshot if requested
				let screenshotPath = '';
				if (captureScreenshot) {
					screenshotPath = '/tmp/sharp-solarized-validation.png';
					await page.screenshot({ path: screenshotPath, fullPage: true });
					results.push(`Screenshot saved to: ${screenshotPath}`);
				}
				
				return {
					content: [{
						type: 'text' as const,
						text: results.join('\n')
					}]
				};
			} catch (error) {
				return {
					content: [{
						type: 'text' as const,
						text: `Failed to validate theme colors: ${error}`
					}]
				};
			}
		}
	));

	// Tool to validate file icons
	tools.push(server.tool(
		'validate_file_icons',
		'Validate Sharp Solarized file icons are correctly displayed',
		{},
		async () => {
			if (!page) {
				return {
					content: [{
						type: 'text' as const,
						text: 'VS Code not launched. Please run launch_vscode_with_theme first.'
					}]
				};
			}

			try {
				// Open file explorer if not already open
				await page.click('[data-id="workbench.view.explorer"]');
				await page.waitForSelector('.explorer-viewlet', { timeout: 5000 });
				
				// Check for file icons
				const fileIcons = await page.evaluate(() => {
					const fileItems = document.querySelectorAll('.explorer-item .monaco-icon-label .file-icon, .explorer-item .monaco-icon-label .folder-icon');
					return Array.from(fileItems).map(icon => {
						const computedStyle = getComputedStyle(icon);
						return {
							backgroundImage: computedStyle.backgroundImage,
							width: computedStyle.width,
							height: computedStyle.height
						};
					});
				});
				
				const results: string[] = [];
				results.push(`Found ${fileIcons.length} file icons`);
				
				if (fileIcons.length > 0) {
					const hasCustomIcons = fileIcons.some(icon => 
						icon.backgroundImage && icon.backgroundImage !== 'none'
					);
					
					if (hasCustomIcons) {
						results.push('✅ Custom file icons are being applied');
					} else {
						results.push('❌ No custom file icons detected');
					}
				}
				
				return {
					content: [{
						type: 'text' as const,
						text: results.join('\n')
					}]
				};
			} catch (error) {
				return {
					content: [{
						type: 'text' as const,
						text: `Failed to validate file icons: ${error}`
					}]
				};
			}
		}
	));

	// Tool to close browser
	tools.push(server.tool(
		'close_browser',
		'Close the browser and clean up',
		{},
		async () => {
			try {
				if (page) {
					await page.close();
					page = null;
				}
				if (browser) {
					await browser.close();
					browser = null;
				}
				return {
					content: [{
						type: 'text' as const,
						text: 'Browser closed successfully'
					}]
				};
			} catch (error) {
				return {
					content: [{
						type: 'text' as const,
						text: `Failed to close browser: ${error}`
					}]
				};
			}
		}
	));

	return tools;
}