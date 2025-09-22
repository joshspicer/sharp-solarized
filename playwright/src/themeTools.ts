/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';
import { chromium, Browser, Page } from 'playwright';

let browser: Browser | null = null;
let page: Page | null = null;

// Expected Sharp Solarized color values
const EXPECTED_COLORS = {
	editorBackground: '#f7f4e8',		// rgb(247, 244, 232) - Sepia tone
	darkAccent: '#423E31',				// Dark accent for borders
	mediumAccent: '#D2CCB8'				// Medium accent for secondary elements
};

// Color utility functions
function hexToRgb(hex: string): { r: number, g: number, b: number } | null {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? {
		r: parseInt(result[1], 16),
		g: parseInt(result[2], 16),
		b: parseInt(result[3], 16)
	} : null;
}

function rgbStringToValues(rgbString: string): { r: number, g: number, b: number } | null {
	const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
	return match ? {
		r: parseInt(match[1], 10),
		g: parseInt(match[2], 10),
		b: parseInt(match[3], 10)
	} : null;
}

function colorDistance(color1: { r: number, g: number, b: number }, color2: { r: number, g: number, b: number }): number {
	const rDiff = color1.r - color2.r;
	const gDiff = color1.g - color2.g;
	const bDiff = color1.b - color2.b;
	return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
}

function calculateContrastRatio(color1: { r: number, g: number, b: number }, color2: { r: number, g: number, b: number }): number {
	const luminance = (color: { r: number, g: number, b: number }) => {
		const sRGB = [color.r, color.g, color.b].map(c => {
			c = c / 255;
			return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
		});
		return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
	};

	const lum1 = luminance(color1);
	const lum2 = luminance(color2);
	const brightest = Math.max(lum1, lum2);
	const darkest = Math.min(lum1, lum2);
	
	return (brightest + 0.05) / (darkest + 0.05);
}

// Robust selector utility with retries
async function waitForSelectorWithRetry(page: Page, selector: string, options: { timeout?: number, retries?: number } = {}): Promise<boolean> {
	const { timeout = 5000, retries = 3 } = options;
	
	for (let i = 0; i < retries; i++) {
		try {
			await page.waitForSelector(selector, { timeout });
			return true;
		} catch (error) {
			if (i === retries - 1) {
				console.warn(`Failed to find selector ${selector} after ${retries} retries`);
				return false;
			}
			await page.waitForTimeout(1000); // Wait 1 second before retry
		}
	}
	return false;
}

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
					default: '/home/runner/work/sharp-solarized/sharp-solarized'
				}
			}
		},
		async (args: { headless?: boolean; extensionPath?: string }) => {
			const { headless = false, extensionPath = '/home/runner/work/sharp-solarized/sharp-solarized' } = args;
			
			try {
				// Close existing browser if any
				if (browser) {
					await browser.close();
					browser = null;
					page = null;
				}

				// Launch browser with stability flags
				browser = await chromium.launch({ 
					headless,
					args: ['--disable-web-security', '--allow-running-insecure-content', '--disable-features=VizDisplayCompositor']
				});
				
				// Create page and navigate to VS Code web
				page = await browser.newPage();
				
				// Set viewport for consistent testing
				await page.setViewportSize({ width: 1920, height: 1080 });
				
				// Navigate to VS Code web
				await page.goto('https://vscode.dev', { waitUntil: 'networkidle' });
				
				// Wait for VS Code to load with retry logic
				const workbenchLoaded = await waitForSelectorWithRetry(page, '.monaco-workbench', { timeout: 15000, retries: 3 });
				
				if (!workbenchLoaded) {
					throw new Error('VS Code workbench failed to load');
				}

				// Wait a bit more for the UI to stabilize
				await page.waitForTimeout(2000);
				
				return {
					content: [{
						type: 'text' as const,
						text: `VS Code launched successfully in ${headless ? 'headless' : 'headed'} mode at https://vscode.dev. Ready for theme validation.`
					}]
				};
			} catch (error) {
				// Clean up on error
				if (browser) {
					await browser.close();
					browser = null;
					page = null;
				}
				
				return {
					content: [{
						type: 'text' as const,
						text: `Failed to launch VS Code: ${error instanceof Error ? error.message : String(error)}`
					}]
				};
			}
		}
	));

	// Tool to apply the Sharp Solarized theme
	tools.push(server.tool(
		'apply_sharp_solarized_theme',
		'Apply Sharp Solarized theme in VS Code',
		{
			type: 'object',
			properties: {
				fallbackToSimilar: {
					type: 'boolean',
					description: 'If Sharp Solarized is not found, try to apply a similar light high contrast theme',
					default: true
				}
			}
		},
		async (args: { fallbackToSimilar?: boolean }) => {
			const { fallbackToSimilar = true } = args;
			
			if (!page) {
				return {
					content: [{
						type: 'text' as const,
						text: 'VS Code not launched. Please run launch_vscode_with_theme first.'
					}]
				};
			}

			try {
				// Open command palette with retry logic
				await page.keyboard.press('F1');
				
				const paletteVisible = await waitForSelectorWithRetry(page, '.quick-input-widget', { timeout: 5000, retries: 3 });
				if (!paletteVisible) {
					// Try alternative command palette shortcut
					await page.keyboard.press('Control+Shift+P');
					await waitForSelectorWithRetry(page, '.quick-input-widget', { timeout: 3000 });
				}
				
				// Search for theme preferences with improved selector handling
				const inputSelector = '.quick-input-widget input, .quick-input-filter input';
				await page.fill(inputSelector, 'Preferences: Color Theme');
				await page.keyboard.press('Enter');
				
				// Wait for theme picker with multiple potential selectors
				const themePickerSelectors = [
					'.quick-input-widget',
					'.quick-input-list',
					'.monaco-list'
				];
				
				let themePickerFound = false;
				for (const selector of themePickerSelectors) {
					if (await waitForSelectorWithRetry(page, selector, { timeout: 3000 })) {
						themePickerFound = true;
						break;
					}
				}
				
				if (!themePickerFound) {
					throw new Error('Theme picker did not appear');
				}
				
				// Wait a moment for the list to populate
				await page.waitForTimeout(1000);
				
				// Look for Sharp Solarized theme
				await page.fill(inputSelector, 'Sharp Solarized');
				await page.waitForTimeout(500); // Allow filter to process
				
				// Try multiple selectors for theme list items
				const listItemSelectors = [
					'.quick-input-list .monaco-list-row',
					'.monaco-list-row',
					'.quick-input-widget .monaco-list-row',
					'[role="option"]'
				];
				
				let themeApplied = false;
				
				for (const selector of listItemSelectors) {
					try {
						const themeOptions = await page.locator(selector);
						const count = await themeOptions.count();
						
						if (count > 0) {
							const firstOption = themeOptions.first();
							const optionText = await firstOption.textContent();
							
							if (optionText && optionText.toLowerCase().includes('sharp solarized')) {
								await firstOption.click();
								themeApplied = true;
								
								return {
									content: [{
										type: 'text' as const,
										text: `✅ Sharp Solarized theme applied successfully! Found option: "${optionText}"`
									}]
								};
							}
						}
					} catch (error) {
						console.warn(`Selector ${selector} failed:`, error);
						continue;
					}
				}
				
				// If Sharp Solarized not found, try fallback options
				if (!themeApplied && fallbackToSimilar) {
					// Look for high contrast light themes as fallback
					const fallbackTerms = ['high contrast light', 'light high contrast', 'hc-light'];
					
					for (const term of fallbackTerms) {
						await page.fill(inputSelector, term);
						await page.waitForTimeout(500);
						
						for (const selector of listItemSelectors) {
							try {
								const options = await page.locator(selector);
								const count = await options.count();
								
								if (count > 0) {
									const firstOption = options.first();
									const optionText = await firstOption.textContent();
									
									if (optionText) {
										await firstOption.click();
										
										return {
											content: [{
												type: 'text' as const,
												text: `⚠️  Sharp Solarized theme not found. Applied fallback theme: "${optionText}". To get the full Sharp Solarized experience, please install the extension first.`
											}]
										};
									}
								}
							} catch (error) {
								continue;
							}
						}
					}
				}
				
				// If we get here, no theme was applied
				return {
					content: [{
						type: 'text' as const,
						text: '❌ Sharp Solarized theme not found and no suitable fallback located. Please ensure the Sharp Solarized extension is installed in VS Code first.'
					}]
				};
				
			} catch (error) {
				return {
					content: [{
						type: 'text' as const,
						text: `Failed to apply theme: ${error instanceof Error ? error.message : String(error)}`
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
				},
				colorTolerance: {
					type: 'number',
					description: 'Color difference tolerance (0-255, default: 10)',
					default: 10
				}
			}
		},
		async (args: { captureScreenshot?: boolean; colorTolerance?: number }) => {
			const { captureScreenshot = true, colorTolerance = 10 } = args;
			
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
				
				// Wait for editor to be ready
				await waitForSelectorWithRetry(page, '.monaco-editor', { timeout: 10000 });
				
				// Get computed colors from various UI elements
				const colorData = await page.evaluate(() => {
					const getElementColor = (selector: string, property: string = 'backgroundColor') => {
						const element = document.querySelector(selector);
						return element ? getComputedStyle(element)[property as any] : null;
					};
					
					return {
						editorBackground: getElementColor('.monaco-editor .view-lines'),
						editorForeground: getElementColor('.monaco-editor .view-lines', 'color'),
						activityBarBackground: getElementColor('.part.activitybar'),
						sideBarBackground: getElementColor('.part.sidebar')
					};
				});
				
				// Validate editor background (main color check)
				if (colorData.editorBackground) {
					results.push(`Editor background: ${colorData.editorBackground}`);
					
					const actualRgb = rgbStringToValues(colorData.editorBackground);
					const expectedRgb = hexToRgb(EXPECTED_COLORS.editorBackground);
					
					if (actualRgb && expectedRgb) {
						const distance = colorDistance(actualRgb, expectedRgb);
						
						if (distance <= colorTolerance) {
							results.push(`✅ Editor background matches Sharp Solarized sepia tone (distance: ${distance.toFixed(2)})`);
						} else {
							results.push(`❌ Editor background mismatch. Expected: ${EXPECTED_COLORS.editorBackground}, Got: ${colorData.editorBackground} (distance: ${distance.toFixed(2)})`);
						}
					}
				} else {
					results.push('❌ Could not detect editor background color');
				}
				
				// Check contrast if we have both background and foreground
				if (colorData.editorBackground && colorData.editorForeground) {
					const bgRgb = rgbStringToValues(colorData.editorBackground);
					const fgRgb = rgbStringToValues(colorData.editorForeground);
					
					if (bgRgb && fgRgb) {
						const contrastRatio = calculateContrastRatio(bgRgb, fgRgb);
						const wcagAA = contrastRatio >= 4.5;
						const wcagAAA = contrastRatio >= 7.0;
						
						let contrastStatus = '❌';
						if (wcagAAA) {
							contrastStatus = '✅ AAA';
						} else if (wcagAA) {
							contrastStatus = '✅ AA';
						}
						
						results.push(`Contrast ratio: ${contrastRatio.toFixed(2)} ${contrastStatus}`);
					}
				}
				
				// Validate other UI elements
				if (colorData.activityBarBackground) {
					results.push(`Activity bar background: ${colorData.activityBarBackground}`);
				}
				if (colorData.sideBarBackground) {
					results.push(`Sidebar background: ${colorData.sideBarBackground}`);
				}
				
				// Take screenshot if requested
				if (captureScreenshot) {
					const screenshotPath = '/tmp/sharp-solarized-validation.png';
					await page.screenshot({ path: screenshotPath, fullPage: true });
					results.push(`📸 Screenshot saved to: ${screenshotPath}`);
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
						text: `Failed to validate theme colors: ${error instanceof Error ? error.message : String(error)}`
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
				const results: string[] = [];
				
				// Try to open file explorer if not already open
				const explorerSelectors = [
					'[data-id="workbench.view.explorer"]',
					'.part.sidebar .explorer-viewlet'
				];
				
				let explorerOpened = false;
				for (const selector of explorerSelectors) {
					try {
						if (await page.locator(selector).isVisible()) {
							explorerOpened = true;
							break;
						}
						await page.click(selector, { timeout: 2000 });
						if (await waitForSelectorWithRetry(page, '.explorer-viewlet', { timeout: 3000 })) {
							explorerOpened = true;
							break;
						}
					} catch (error) {
						continue;
					}
				}
				
				if (!explorerOpened) {
					results.push('⚠️  Could not open file explorer, trying to continue with icon detection...');
				} else {
					results.push('✅ File explorer opened successfully');
				}
				
				// Wait for explorer content to load
				await page.waitForTimeout(2000);
				
				// Check for file icons with improved selectors
				const iconData = await page.evaluate(() => {
					const iconSelectors = [
						'.explorer-item .monaco-icon-label .file-icon',
						'.explorer-item .monaco-icon-label .folder-icon',
						'.file-icon',
						'.folder-icon'
					];
					
					const foundIcons: Array<{
						selector: string;
						count: number;
						hasCustomBackground: boolean;
					}> = [];
					
					for (const selector of iconSelectors) {
						const elements = document.querySelectorAll(selector);
						if (elements.length > 0) {
							let hasCustomBackground = false;
							
							elements.forEach(element => {
								const computedStyle = getComputedStyle(element);
								const bgImage = computedStyle.backgroundImage;
								
								if (bgImage && bgImage !== 'none' && !bgImage.includes('data:image/svg+xml')) {
									hasCustomBackground = true;
								}
							});
							
							foundIcons.push({
								selector,
								count: elements.length,
								hasCustomBackground
							});
						}
					}
					
					return { foundIcons };
				});
				
				let totalIcons = 0;
				let customIconsDetected = false;
				
				for (const iconGroup of iconData.foundIcons) {
					totalIcons += iconGroup.count;
					results.push(`  └─ ${iconGroup.selector}: ${iconGroup.count} elements`);
					
					if (iconGroup.hasCustomBackground) {
						customIconsDetected = true;
					}
				}
				
				results.push(`Found ${totalIcons} total file icon elements`);
				
				// Analyze icon theme application
				if (customIconsDetected) {
					results.push('✅ Custom file icons are being applied');
				} else if (totalIcons > 0) {
					results.push('⚠️  File icons found but no custom backgrounds detected (may be using default icons)');
				} else {
					results.push('❌ No file icons detected');
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
						text: `Failed to validate file icons: ${error instanceof Error ? error.message : String(error)}`
					}]
				};
			}
		}
	));

	// Tool to close browser
	tools.push(server.tool(
		'close_browser',
		'Close the browser and clean up resources',
		{},
		async () => {
			try {
				const results: string[] = [];
				
				if (page) {
					await page.close();
					results.push('✅ Page closed successfully');
					page = null;
				}
				
				if (browser) {
					await browser.close();
					results.push('✅ Browser closed successfully');
					browser = null;
				}
				
				if (results.length === 0) {
					results.push('ℹ️  No browser or page instances to close');
				}
				
				return {
					content: [{
						type: 'text' as const,
						text: results.join('\n')
					}]
				};
			} catch (error) {
				// Force cleanup even on error
				page = null;
				browser = null;
				
				return {
					content: [{
						type: 'text' as const,
						text: `Failed to cleanly close browser: ${error instanceof Error ? error.message : String(error)}. Resources have been forcibly released.`
					}]
				};
			}
		}
	));

	return tools;
}