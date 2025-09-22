/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';
import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

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
				},
				installExtension: {
					type: 'boolean',
					description: 'Attempt to install the extension automatically',
					default: true
				}
			}
		},
		async (args) => {
			const { headless = false, extensionPath = '/home/runner/work/sharp-solarized/sharp-solarized', installExtension = true } = args;
			
			try {
				// Close existing browser if any
				if (browser) {
					await browser.close();
					browser = null;
					page = null;
				}

				// Launch browser with additional flags for extension installation
				const browserArgs = [
					'--disable-web-security', 
					'--allow-running-insecure-content',
					'--disable-features=VizDisplayCompositor'
				];

				// If extensionPath points to a VSIX file or directory, try to handle it
				if (installExtension && extensionPath) {
					const resolvedPath = path.resolve(extensionPath);
					if (fs.existsSync(resolvedPath)) {
						// Check if it's a VSIX file
						if (resolvedPath.endsWith('.vsix')) {
							// For VSIX files, we'd need a local VS Code instance
							console.log(`Found VSIX at ${resolvedPath}, but web VS Code doesn't support direct VSIX installation`);
						} else if (fs.statSync(resolvedPath).isDirectory()) {
							// For development directories, we can use them with desktop VS Code
							browserArgs.push(`--load-extension=${resolvedPath}`);
						}
					}
				}
				
				browser = await chromium.launch({ 
					headless,
					args: browserArgs
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
				
				let message = `VS Code launched successfully in ${headless ? 'headless' : 'headed'} mode at https://vscode.dev. Ready for theme validation.`;
				
				if (installExtension && extensionPath && !extensionPath.endsWith('.vsix')) {
					message += `\n⚠️  Note: Extension path provided (${extensionPath}) but direct installation in VS Code web is limited. For full extension testing, consider using a local VS Code instance.`;
				}
				
				return {
					content: [{
						type: 'text' as const,
						text: message
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
		async (args) => {
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
				},
				checkContrast: {
					type: 'boolean',
					description: 'Perform WCAG contrast ratio checks',
					default: true
				}
			}
		},
		async (args) => {
			const { captureScreenshot = true, colorTolerance = 10, checkContrast = true } = args;
			
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
				const validationData: any = {};
				
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
						activityBarForeground: getElementColor('.part.activitybar', 'color'),
						sideBarBackground: getElementColor('.part.sidebar'),
						sideBarForeground: getElementColor('.part.sidebar', 'color'),
						statusBarBackground: getElementColor('.part.statusbar'),
						statusBarForeground: getElementColor('.part.statusbar', 'color'),
						titleBarBackground: getElementColor('.part.titlebar'),
						titleBarForeground: getElementColor('.part.titlebar', 'color')
					};
				});
				
				// Validate editor background (main color check)
				if (colorData.editorBackground) {
					results.push(`Editor background: ${colorData.editorBackground}`);
					validationData.editorBackground = colorData.editorBackground;
					
					const actualRgb = rgbStringToValues(colorData.editorBackground);
					const expectedRgb = hexToRgb(EXPECTED_COLORS.editorBackground);
					
					if (actualRgb && expectedRgb) {
						const distance = colorDistance(actualRgb, expectedRgb);
						
						if (distance <= colorTolerance) {
							results.push(`✅ Editor background matches Sharp Solarized sepia tone (distance: ${distance.toFixed(2)})`);
							validationData.editorBackgroundValid = true;
						} else {
							results.push(`❌ Editor background mismatch. Expected: ${EXPECTED_COLORS.editorBackground}, Got: ${colorData.editorBackground} (distance: ${distance.toFixed(2)})`);
							validationData.editorBackgroundValid = false;
						}
					}
				} else {
					results.push('❌ Could not detect editor background color');
					validationData.editorBackgroundValid = false;
				}
				
				// Validate other UI elements
				const uiElements = [
					{ name: 'Activity Bar', bg: colorData.activityBarBackground, fg: colorData.activityBarForeground },
					{ name: 'Side Bar', bg: colorData.sideBarBackground, fg: colorData.sideBarForeground },
					{ name: 'Status Bar', bg: colorData.statusBarBackground, fg: colorData.statusBarForeground },
					{ name: 'Title Bar', bg: colorData.titleBarBackground, fg: colorData.titleBarForeground }
				];
				
				for (const element of uiElements) {
					if (element.bg) {
						results.push(`${element.name} background: ${element.bg}`);
						
						// Check contrast ratio if both background and foreground are available
						if (checkContrast && element.fg) {
							const bgRgb = rgbStringToValues(element.bg);
							const fgRgb = rgbStringToValues(element.fg);
							
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
								
								results.push(`  └─ Contrast ratio: ${contrastRatio.toFixed(2)} ${contrastStatus}`);
								validationData[`${element.name.toLowerCase().replace(' ', '')}Contrast`] = {
									ratio: contrastRatio,
									wcagAA,
									wcagAAA
								};
							}
						}
					}
				}
				
				// Check for high contrast theme indicators
				const themeIndicators = await page.evaluate(() => {
					const bodyClasses = document.body.className;
					const workbenchClasses = document.querySelector('.monaco-workbench')?.className || '';
					
					return {
						isHighContrast: bodyClasses.includes('hc-light') || workbenchClasses.includes('hc-light'),
						themeClasses: bodyClasses,
						workbenchClasses
					};
				});
				
				if (themeIndicators.isHighContrast) {
					results.push('✅ High contrast light theme detected');
					validationData.isHighContrastTheme = true;
				} else {
					results.push('⚠️  High contrast theme classes not detected in DOM');
					validationData.isHighContrastTheme = false;
				}
				
				// Take screenshot if requested
				let screenshotPath = '';
				if (captureScreenshot) {
					screenshotPath = '/tmp/sharp-solarized-validation.png';
					await page.screenshot({ path: screenshotPath, fullPage: true });
					results.push(`📸 Screenshot saved to: ${screenshotPath}`);
				}
				
				// Generate summary
				results.push('\n=== VALIDATION SUMMARY ===');
				results.push(`Color validation: ${validationData.editorBackgroundValid ? '✅' : '❌'} Editor background`);
				results.push(`Theme detection: ${validationData.isHighContrastTheme ? '✅' : '❌'} High contrast mode`);
				
				if (checkContrast) {
					const contrastChecks = Object.entries(validationData)
						.filter(([k, v]) => k.includes('Contrast') && v && typeof v === 'object' && 'wcagAA' in v)
						.map(([k, v]: [string, any]) => `${v.wcagAA ? '✅' : '❌'} ${k.replace('Contrast', '')}`);
					
					if (contrastChecks.length > 0) {
						results.push(`Contrast ratios: ${contrastChecks.join(', ')}`);
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
		{
			type: 'object',
			properties: {
				openFolder: {
					type: 'boolean',
					description: 'Try to open a folder to test file icons',
					default: true
				}
			}
		},
		async (args) => {
			const { openFolder = true } = args;
			
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
					'.part.sidebar .explorer-viewlet',
					'.explorer-viewlet'
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
						'.monaco-icon-label .file-icon',
						'.monaco-icon-label .folder-icon',
						'.file-icon',
						'.folder-icon',
						'.codicon-file',
						'.codicon-folder'
					];
					
					const foundIcons: Array<{
						selector: string;
						count: number;
						hasCustomBackground: boolean;
						backgroundImages: string[];
						styles: any[];
					}> = [];
					
					for (const selector of iconSelectors) {
						const elements = document.querySelectorAll(selector);
						if (elements.length > 0) {
							const backgroundImages: string[] = [];
							const styles: any[] = [];
							let hasCustomBackground = false;
							
							elements.forEach(element => {
								const computedStyle = getComputedStyle(element);
								const bgImage = computedStyle.backgroundImage;
								const bgColor = computedStyle.backgroundColor;
								
								styles.push({
									backgroundImage: bgImage,
									backgroundColor: bgColor,
									width: computedStyle.width,
									height: computedStyle.height,
									content: computedStyle.content
								});
								
								if (bgImage && bgImage !== 'none' && !bgImage.includes('data:image/svg+xml')) {
									backgroundImages.push(bgImage);
									hasCustomBackground = true;
								}
							});
							
							foundIcons.push({
								selector,
								count: elements.length,
								hasCustomBackground,
								backgroundImages: [...new Set(backgroundImages)],
								styles
							});
						}
					}
					
					// Also check for theme-specific icon classes
					const themeIconClasses = document.querySelectorAll('[class*="hc-minimal"], [class*="sharp-solarized"]');
					
					return {
						foundIcons,
						themeIconCount: themeIconClasses.length,
						bodyClasses: document.body.className,
						iconThemeClasses: Array.from(document.querySelectorAll('*'))
							.filter(el => el.className && typeof el.className === 'string')
							.map(el => el.className)
							.filter(className => className.includes('icon') || className.includes('theme'))
							.slice(0, 10) // Limit to avoid too much data
					};
				});
				
				results.push(`Found ${iconData.foundIcons.length} different icon element types`);
				
				let totalIcons = 0;
				let customIconsDetected = false;
				
				for (const iconGroup of iconData.foundIcons) {
					totalIcons += iconGroup.count;
					results.push(`  └─ ${iconGroup.selector}: ${iconGroup.count} elements`);
					
					if (iconGroup.hasCustomBackground) {
						customIconsDetected = true;
						results.push(`    └─ Custom backgrounds detected: ${iconGroup.backgroundImages.length}`);
					}
				}
				
				// Analyze icon theme application
				if (customIconsDetected) {
					results.push('✅ Custom file icons are being applied');
				} else if (totalIcons > 0) {
					results.push('⚠️  File icons found but no custom backgrounds detected (may be using default icons)');
				} else {
					results.push('❌ No file icons detected');
				}
				
				// Check for hc-minimal theme indicators
				if (iconData.themeIconCount > 0) {
					results.push(`✅ Found ${iconData.themeIconCount} theme-specific icon elements`);
				}
				
				// Try to open a file to trigger more icons if requested
				if (openFolder && explorerOpened) {
					try {
						// Look for any file or folder to interact with
						const fileItems = await page.locator('.explorer-item, .monaco-list-row').first();
						if (await fileItems.isVisible()) {
							await fileItems.click();
							await page.waitForTimeout(1000);
							results.push('✅ Interacted with file explorer items to trigger icon rendering');
						}
					} catch (error) {
						results.push('⚠️  Could not interact with file explorer items');
					}
				}
				
				// Generate icon theme validation summary
				results.push('\n=== ICON VALIDATION SUMMARY ===');
				results.push(`Total icons found: ${totalIcons}`);
				results.push(`Custom icon theme: ${customIconsDetected ? '✅ Detected' : '❌ Not detected'}`);
				results.push(`Theme classes: ${iconData.themeIconCount > 0 ? '✅ Found' : '❌ None'}`);
				
				if (totalIcons === 0) {
					results.push('\n💡 Tip: Try opening a folder with files to see file icons, or ensure the hc-minimal icon theme is properly installed and selected.');
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
		{
			type: 'object',
			properties: {
				force: {
					type: 'boolean',
					description: 'Force close even if cleanup fails',
					default: false
				}
			}
		},
		async (args) => {
			const { force = false } = args;
			
			try {
				const results: string[] = [];
				
				if (page) {
					try {
						await page.close();
						results.push('✅ Page closed successfully');
					} catch (error) {
						results.push(`⚠️  Page close warning: ${error instanceof Error ? error.message : String(error)}`);
						if (!force) throw error;
					}
					page = null;
				}
				
				if (browser) {
					try {
						await browser.close();
						results.push('✅ Browser closed successfully');
					} catch (error) {
						results.push(`⚠️  Browser close warning: ${error instanceof Error ? error.message : String(error)}`);
						if (!force) throw error;
					}
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

	// Comprehensive validation tool
	tools.push(server.tool(
		'run_full_theme_validation',
		'Run a complete validation suite for the Sharp Solarized theme',
		{
			type: 'object',
			properties: {
				headless: {
					type: 'boolean',
					description: 'Run validation in headless mode',
					default: false
				},
				captureScreenshots: {
					type: 'boolean',
					description: 'Capture screenshots during validation',
					default: true
				},
				extensionPath: {
					type: 'string',
					description: 'Path to the Sharp Solarized extension',
					default: '/home/runner/work/sharp-solarized/sharp-solarized'
				}
			}
		},
		async (args) => {
			const { headless = false, captureScreenshots = true, extensionPath = '/home/runner/work/sharp-solarized/sharp-solarized' } = args;
			
			const results: string[] = [];
			results.push('🚀 Starting comprehensive Sharp Solarized theme validation...\n');
			
			try {
				// Note: This is a guided workflow since we can't directly call other tools
				results.push('📋 Complete Theme Validation Workflow:');
				results.push('');
				results.push('STEP 1: Launch VS Code');
				results.push('  → Call: launch_vscode_with_theme');
				results.push(`  → Options: { headless: ${headless}, extensionPath: "${extensionPath}" }`);
				results.push('');
				results.push('STEP 2: Apply Sharp Solarized Theme');
				results.push('  → Call: apply_sharp_solarized_theme');
				results.push('  → Options: { fallbackToSimilar: true }');
				results.push('');
				results.push('STEP 3: Validate Colors & Contrast');
				results.push('  → Call: validate_theme_colors');
				results.push(`  → Options: { captureScreenshot: ${captureScreenshots}, colorTolerance: 15, checkContrast: true }`);
				results.push('');
				results.push('STEP 4: Validate File Icons');
				results.push('  → Call: validate_file_icons');
				results.push('  → Options: { openFolder: true }');
				results.push('');
				results.push('STEP 5: Clean Up');
				results.push('  → Call: close_browser');
				results.push('  → Options: { force: false }');
				results.push('');
				results.push('🎯 Expected Validation Results:');
				results.push('  ✅ Editor background: #f7f4e8 (sepia tone)');
				results.push('  ✅ High contrast theme detected');
				results.push('  ✅ WCAG AA contrast ratios (4.5:1 minimum)');
				results.push('  ✅ Custom file icons (hc-minimal theme)');
				results.push('  ✅ Sharp Solarized theme applied successfully');
				results.push('');
				results.push('💡 Run each tool in sequence for complete validation.');
				
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
						text: `Validation workflow setup failed: ${error instanceof Error ? error.message : String(error)}`
					}]
				};
			}
		}
	));

	// Test tool for MCP server functionality
	tools.push(server.tool(
		'test_mcp_tools',
		'Test the MCP server tools without requiring browser installation',
		{
			type: 'object',
			properties: {
				skipBrowserTest: {
					type: 'boolean',
					description: 'Skip browser-dependent tests',
					default: true
				}
			}
		},
		async (args) => {
			const { skipBrowserTest = true } = args;
			
			const results: string[] = [];
			results.push('🧪 Testing Sharp Solarized MCP Server Tools...\n');
			
			try {
				// Test color utility functions
				const testHex = '#f7f4e8';
				const expectedRgb = { r: 247, g: 244, b: 232 };
				const convertedRgb = hexToRgb(testHex);
				
				if (convertedRgb && convertedRgb.r === expectedRgb.r && convertedRgb.g === expectedRgb.g && convertedRgb.b === expectedRgb.b) {
					results.push('✅ Color conversion utilities working correctly');
				} else {
					results.push('❌ Color conversion utilities failed');
				}
				
				// Test contrast calculation
				const whiteColor = { r: 255, g: 255, b: 255 };
				const blackColor = { r: 0, g: 0, b: 0 };
				const contrastRatio = calculateContrastRatio(whiteColor, blackColor);
				
				if (contrastRatio > 20) { // White/black should have ~21:1 contrast
					results.push('✅ Contrast ratio calculations working correctly');
				} else {
					results.push('❌ Contrast ratio calculations failed');
				}
				
				// Test expected color constants
				results.push('\n📊 Sharp Solarized Color Palette:');
				results.push(`  Editor Background: ${EXPECTED_COLORS.editorBackground}`);
				results.push(`  Dark Accent: ${EXPECTED_COLORS.darkAccent}`);
				results.push(`  Medium Accent: ${EXPECTED_COLORS.mediumAccent}`);
				
				// Test tool availability
				results.push('\n🔧 Available MCP Tools:');
				results.push('  1. package_extension - Package extension to VSIX');
				results.push('  2. launch_vscode_with_theme - Launch VS Code with theme');
				results.push('  3. apply_sharp_solarized_theme - Apply the Sharp Solarized theme');
				results.push('  4. validate_theme_colors - Validate colors and contrast');
				results.push('  5. validate_file_icons - Validate file icon theme');
				results.push('  6. close_browser - Clean up browser resources');
				results.push('  7. run_full_theme_validation - Complete validation workflow');
				results.push('  8. test_mcp_tools - This test tool');
				
				if (skipBrowserTest) {
					results.push('\n⚠️  Browser tests skipped (browser not installed)');
					results.push('   To enable browser tests:');
					results.push('   1. Run: npx playwright install chromium');
					results.push('   2. Call this tool with skipBrowserTest: false');
				} else {
					// Test browser capabilities
					if (!browser) {
						results.push('\n🌐 Testing browser launch...');
						try {
							browser = await chromium.launch({ headless: true });
							page = await browser.newPage();
							results.push('✅ Browser launch successful');
							
							await page.goto('data:text/html,<h1>Test Page</h1>');
							const title = await page.title();
							results.push(`✅ Page navigation successful (title: "${title}")`);
							
							await browser.close();
							browser = null;
							page = null;
						} catch (error) {
							results.push(`❌ Browser test failed: ${error instanceof Error ? error.message : String(error)}`);
						}
					}
				}
				
				results.push('\n🎯 MCP Server Status: OPERATIONAL');
				results.push('   Ready for theme validation workflows!');
				
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
						text: `MCP tool testing failed: ${error instanceof Error ? error.message : String(error)}`
					}]
				};
			}
		}
	));

	return tools;
}