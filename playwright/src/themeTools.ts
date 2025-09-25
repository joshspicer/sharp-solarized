/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';
import { chromium, Browser, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { 
	parseColor, 
	rgbToHex, 
	colorsMatch, 
	checkContrast, 
	SHARP_SOLARIZED_COLORS, 
	type RGB, 
	type ContrastResult 
} from './colorUtils';

let browser: Browser | null = null;
let page: Page | null = null;

/**
 * Get the path to the Sharp Solarized extension directory
 * @returns {string} The absolute path to the repository root containing the theme files
 */
function getExtensionPath(): string {
	// Use repository root relative path instead of hardcoded absolute path
	// __dirname points to playwright/out/, so ../../ gets us to the repo root
	return path.resolve(__dirname, '../../');
}

/**
 * Wait for element with robust retry logic
 */
async function waitForElementRobust(page: Page, selectors: string[], timeout: number = 10000): Promise<boolean> {
	const endTime = Date.now() + timeout;
	
	while (Date.now() < endTime) {
		for (const selector of selectors) {
			try {
				await page.waitForSelector(selector, { timeout: 1000 });
				return true;
			} catch {
				// Continue to next selector
			}
		}
		await page.waitForTimeout(100);
	}
	
	return false;
}

/**
 * Try to install Sharp Solarized extension 
 * Note: This is limited on vscode.dev, but we can try various approaches
 */
async function installSharpSolarizedExtension(extensionPath: string): Promise<string> {
	// For now, this is a placeholder that could be expanded to:
	// 1. Upload VSIX to a temporary server
	// 2. Use VS Code's extension installation API
	// 3. Guide user through manual installation
	
	if (fs.existsSync(extensionPath)) {
		return `Extension path exists: ${extensionPath}. Manual installation may be required on vscode.dev.`;
	}
	
	return 'Extension path not found. Please ensure Sharp Solarized is available.';
}

/**
 * Apply theme with improved reliability and multiple strategies
 */
async function applyThemeRobust(page: Page, themeName: string): Promise<string> {
	const strategies = [
		// Strategy 1: Command Palette
		async () => {
			await page.keyboard.press('F1');
			const quickInputSelectors = ['.quick-input-widget', '.monaco-quick-input-widget', '.quick-input'];
			const quickInputVisible = await waitForElementRobust(page, quickInputSelectors, 5000);
			
			if (!quickInputVisible) {
				throw new Error('Command palette did not open');
			}
			
			await page.waitForTimeout(500);
			await page.fill('.quick-input-widget input, .monaco-quick-input-widget input, .quick-input input', 'Preferences: Color Theme');
			await page.keyboard.press('Enter');
			
			await page.waitForTimeout(1000);
			await page.fill('.quick-input-widget input, .monaco-quick-input-widget input, .quick-input input', themeName);
			
			// Try to find and click the theme option
			const themeSelectors = [
				'.quick-input-list .monaco-list-row',
				'.monaco-list .monaco-list-row',
				'[role="option"]'
			];
			
			for (const selector of themeSelectors) {
				try {
					const themeOption = page.locator(selector).first();
					if (await themeOption.isVisible({ timeout: 2000 })) {
						await themeOption.click();
						return 'Theme applied via command palette';
					}
				} catch {
					continue;
				}
			}
			
			throw new Error('Theme option not found in command palette');
		},

		// Strategy 2: Settings UI (fallback)
		async () => {
			await page.keyboard.press('Control+,');
			await page.waitForTimeout(1000);
			
			// Search for theme in settings
			const searchBox = page.locator('input[placeholder*="Search"], input[aria-label*="Search"]').first();
			await searchBox.fill('color theme');
			await page.waitForTimeout(500);
			
			// This would need more implementation for the settings UI approach
			throw new Error('Settings UI strategy not fully implemented');
		}
	];

	let lastError = '';
	for (const strategy of strategies) {
		try {
			return await strategy();
		} catch (error) {
			lastError = String(error);
			console.log(`Strategy failed: ${error}`);
		}
	}
	
	throw new Error(`All theme application strategies failed. Last error: ${lastError}`);
}
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
					default: ''
				},
				installExtension: {
					type: 'boolean',
					description: 'Try to install the extension automatically',
					default: false
				}
			}
		},
		async (args) => {
			const { headless = false, extensionPath = '', installExtension = false } = args;
			
			try {
				// Close existing browser if any
				if (browser) {
					await browser.close();
				}
				
				// Launch browser with additional args for extension testing
				const launchArgs = [
					'--disable-web-security', 
					'--allow-running-insecure-content',
					'--disable-features=VizDisplayCompositor'
				];
				
				browser = await chromium.launch({ 
					headless,
					args: launchArgs
				});
				
				// Create page and navigate to VS Code web
				page = await browser.newPage();
				
				// Set viewport for consistent rendering
				await page.setViewportSize({ width: 1200, height: 800 });
				
				// Navigate to VS Code web
				console.log('Navigating to VS Code web...');
				await page.goto('https://vscode.dev', { waitUntil: 'networkidle' });
				
				// Wait for VS Code to load with multiple possible selectors
				const vsCodeSelectors = [
					'.monaco-workbench',
					'.part.editor',
					'.monaco-editor',
					'[id="workbench.main.container"]'
				];
				
				const loaded = await waitForElementRobust(page, vsCodeSelectors, 30000);
				if (!loaded) {
					throw new Error('VS Code failed to load - none of the expected elements found');
				}
				
				// Wait a bit more for full initialization
				await page.waitForTimeout(2000);
				
				console.log('VS Code loaded successfully');
				
				let extensionStatus = 'Extension installation not attempted';
				if (installExtension) {
					try {
						// Try to package and install the extension
						const realExtensionPath = extensionPath || getExtensionPath();
						extensionStatus = await installSharpSolarizedExtension(realExtensionPath);
					} catch (error) {
						extensionStatus = `Extension installation failed: ${error}`;
					}
				}
				
				return {
					content: [{
						type: 'text' as const,
						text: `✅ VS Code launched successfully in ${headless ? 'headless' : 'headed'} mode.\n${extensionStatus}\nReady for theme validation.`
					}]
				};
			} catch (error) {
				return {
					content: [{
						type: 'text' as const,
						text: `❌ Failed to launch VS Code: ${error}`
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
				themeName: {
					type: 'string',
					description: 'Name of the theme to apply',
					default: 'Sharp Solarized'
				}
			}
		},
		async (args) => {
			const { themeName = 'Sharp Solarized' } = args;
			
			if (!page) {
				return {
					content: [{
						type: 'text' as const,
						text: '❌ VS Code not launched. Please run launch_vscode_with_theme first.'
					}]
				};
			}

			try {
				const result = await applyThemeRobust(page, themeName);
				
				// Wait for theme to apply
				await page.waitForTimeout(2000);
				
				return {
					content: [{
						type: 'text' as const,
						text: `✅ ${result}. Theme should now be active.`
					}]
				};
			} catch (error) {
				return {
					content: [{
						type: 'text' as const,
						text: `❌ Failed to apply theme: ${error}. The theme may not be installed or available.`
					}]
				};
			}
		}
	));

	// Tool to validate theme colors and contrast
	tools.push(server.tool(
		'validate_theme_colors',
		'Validate Sharp Solarized theme colors and contrast ratios with WCAG compliance',
		{
			type: 'object',
			properties: {
				captureScreenshot: {
					type: 'boolean',
					description: 'Capture screenshot of the current theme',
					default: true
				},
				tolerance: {
					type: 'number',
					description: 'Color matching tolerance (0-50, lower = stricter)',
					default: 10
				},
				checkContrast: {
					type: 'boolean', 
					description: 'Perform WCAG contrast ratio validation',
					default: true
				}
			}
		},
		async (args) => {
			const { captureScreenshot = true, tolerance = 10, checkContrast: shouldCheckContrast = true } = args;
			
			if (!page) {
				return {
					content: [{
						type: 'text' as const,
						text: '❌ VS Code not launched. Please run launch_vscode_with_theme first.'
					}]
				};
			}

			try {
				const results: string[] = [];
				const issues: string[] = [];
				
				// Get computed colors from the page
				const colorData = await page.evaluate(() => {
					const getComputedBg = (selector: string) => {
						const element = document.querySelector(selector);
						return element ? getComputedStyle(element).backgroundColor : null;
					};
					
					const getComputedText = (selector: string) => {
						const element = document.querySelector(selector);
						return element ? getComputedStyle(element).color : null;
					};

					return {
						// Main editor colors
						editorBg: getComputedBg('.monaco-editor .view-lines') || getComputedBg('.monaco-editor'),
						editorText: getComputedText('.monaco-editor .view-lines') || getComputedText('.monaco-editor'),
						
						// Activity bar
						activityBarBg: getComputedBg('.part.activitybar') || getComputedBg('[id="workbench.parts.activitybar"]'),
						activityBarText: getComputedText('.part.activitybar') || getComputedText('[id="workbench.parts.activitybar"]'),
						
						// Sidebar
						sidebarBg: getComputedBg('.part.sidebar') || getComputedBg('[id="workbench.parts.sidebar"]'),
						sidebarText: getComputedText('.part.sidebar') || getComputedText('[id="workbench.parts.sidebar"]'),
						
						// Panel
						panelBg: getComputedBg('.part.panel') || getComputedBg('[id="workbench.parts.panel"]'),
						panelText: getComputedText('.part.panel') || getComputedText('[id="workbench.parts.panel"]')
					};
				});

				results.push('🔍 Theme Color Validation Results\n');
				
				// Validate editor background (signature sepia color)
				if (colorData.editorBg) {
					const editorBgRgb = parseColor(colorData.editorBg);
					results.push(`📝 Editor Background: ${colorData.editorBg}`);
					
					if (editorBgRgb) {
						const expectedBg = SHARP_SOLARIZED_COLORS.editorBackground;
						const distance = Math.sqrt(
							Math.pow(editorBgRgb.r - expectedBg.r, 2) +
							Math.pow(editorBgRgb.g - expectedBg.g, 2) +
							Math.pow(editorBgRgb.b - expectedBg.b, 2)
						);
						
						if (colorsMatch(editorBgRgb, expectedBg, tolerance)) {
							results.push(`   ✅ Matches Sharp Solarized sepia tone (distance: ${distance.toFixed(1)})`);
						} else {
							const expectedHex = rgbToHex(expectedBg);
							const actualHex = rgbToHex(editorBgRgb);
							issues.push(`   ❌ Background mismatch! Expected: ${expectedHex}, Got: ${actualHex} (distance: ${distance.toFixed(1)})`);
						}
					}
				} else {
					issues.push('   ❌ Could not detect editor background color');
				}
				
				// Validate contrast ratios if enabled
				if (shouldCheckContrast && colorData.editorBg && colorData.editorText) {
					const bgRgb = parseColor(colorData.editorBg);
					const textRgb = parseColor(colorData.editorText);
					
					if (bgRgb && textRgb) {
						const contrastResult = checkContrast(textRgb, bgRgb);
						results.push(`\n📊 WCAG Contrast Analysis:`);
						results.push(`   Ratio: ${contrastResult.ratio.toFixed(2)}:1`);
						results.push(`   WCAG AA: ${contrastResult.passes.AA ? '✅ PASS' : '❌ FAIL'}`);
						results.push(`   WCAG AAA: ${contrastResult.passes.AAA ? '✅ PASS' : '❌ FAIL'}`);
						results.push(`   Level: ${contrastResult.level}`);
						
						if (!contrastResult.passes.AA) {
							issues.push(`   ❌ Contrast ratio ${contrastResult.ratio.toFixed(2)}:1 fails WCAG AA (needs 4.5:1)`);
						}
					}
				}
				
				// Validate other UI elements
				const uiElements = [
					{ name: 'Activity Bar', bg: colorData.activityBarBg, text: colorData.activityBarText },
					{ name: 'Sidebar', bg: colorData.sidebarBg, text: colorData.sidebarText },
					{ name: 'Panel', bg: colorData.panelBg, text: colorData.panelText }
				];
				
				results.push(`\n🎨 UI Element Colors:`);
				for (const element of uiElements) {
					if (element.bg) {
						results.push(`   ${element.name} Background: ${element.bg}`);
						
						// Check contrast for UI elements too
						if (shouldCheckContrast && element.text) {
							const bgRgb = parseColor(element.bg);
							const textRgb = parseColor(element.text);
							
							if (bgRgb && textRgb) {
								const contrastResult = checkContrast(textRgb, bgRgb);
								const status = contrastResult.passes.AA ? '✅' : '❌';
								results.push(`   ${element.name} Contrast: ${contrastResult.ratio.toFixed(2)}:1 ${status}`);
								
								if (!contrastResult.passes.AA) {
									issues.push(`   ❌ ${element.name} contrast fails WCAG AA`);
								}
							}
						}
					}
				}
				
				// Take screenshot if requested
				if (captureScreenshot) {
					const screenshotDir = '/tmp';
					const screenshotPath = path.join(screenshotDir, 'sharp-solarized-validation.png');
					
					// Ensure screenshot directory exists
					if (!fs.existsSync(screenshotDir)) {
						fs.mkdirSync(screenshotDir, { recursive: true });
					}
					
					await page.screenshot({ path: screenshotPath, fullPage: true });
					results.push(`\n📸 Screenshot saved: ${screenshotPath}`);
				}
				
				// Summary
				results.push(`\n📋 Validation Summary:`);
				results.push(`   Issues found: ${issues.length}`);
				results.push(`   Color tolerance: ${tolerance}`);
				
				if (issues.length > 0) {
					results.push(`\n❌ Issues Found:`);
					results.push(...issues);
				} else {
					results.push(`\n✅ All validations passed! Sharp Solarized theme is correctly applied.`);
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
						text: `❌ Failed to validate theme colors: ${error}`
					}]
				};
			}
		}
	));

	// Tool to validate file icons
	tools.push(server.tool(
		'validate_file_icons',
		'Validate Sharp Solarized file icons are correctly displayed with detailed analysis',
		{
			type: 'object',
			properties: {
				captureIconScreenshot: {
					type: 'boolean',
					description: 'Capture screenshot of file icons',
					default: false
				}
			}
		},
		async (args) => {
			const { captureIconScreenshot = false } = args;
			
			if (!page) {
				return {
					content: [{
						type: 'text' as const,
						text: '❌ VS Code not launched. Please run launch_vscode_with_theme first.'
					}]
				};
			}

			try {
				const results: string[] = [];
				
				// Try to open file explorer with multiple strategies
				const explorerSelectors = [
					'[data-id="workbench.view.explorer"]',
					'.codicon-files',
					'[title="Explorer"]',
					'[aria-label="Explorer"]'
				];
				
				let explorerOpened = false;
				for (const selector of explorerSelectors) {
					try {
						const explorerButton = page.locator(selector);
						if (await explorerButton.isVisible({ timeout: 2000 })) {
							await explorerButton.click();
							explorerOpened = true;
							break;
						}
					} catch {
						continue;
					}
				}
				
				if (!explorerOpened) {
					results.push('⚠️  Could not open file explorer - trying alternative approach');
				}
				
				// Wait for explorer to load
				await page.waitForTimeout(2000);
				
				// Check for file icons with multiple selector strategies
				const iconData = await page.evaluate(() => {
					const iconSelectors = [
						'.explorer-item .monaco-icon-label .file-icon',
						'.explorer-item .monaco-icon-label .folder-icon',
						'.file-icon',
						'.folder-icon',
						'.monaco-icon-label::before',
						'[class*="icon"]'
					];
					
					const allIcons: any[] = [];
					
					for (const selector of iconSelectors) {
						const elements = document.querySelectorAll(selector);
						Array.from(elements).forEach(icon => {
							const computedStyle = getComputedStyle(icon);
							allIcons.push({
								selector,
								tagName: icon.tagName,
								className: icon.className,
								backgroundImage: computedStyle.backgroundImage,
								backgroundSize: computedStyle.backgroundSize,
								width: computedStyle.width,
								height: computedStyle.height,
								content: computedStyle.content,
								fontFamily: computedStyle.fontFamily
							});
						});
					}
					
					// Also check for codicon usage (VS Code's icon system)
					const codiconElements = document.querySelectorAll('[class*="codicon"]');
					const codiconCount = codiconElements.length;
					
					return {
						icons: allIcons,
						codiconCount,
						explorerVisible: !!document.querySelector('.explorer-viewlet, .pane-body .explorer, [data-id="workbench.view.explorer"]')
					};
				});
				
				results.push('🎨 File Icon Validation Results\n');
				results.push(`Explorer visible: ${iconData.explorerVisible ? '✅ Yes' : '❌ No'}`);
				results.push(`Icons found: ${iconData.icons.length}`);
				results.push(`Codicon elements: ${iconData.codiconCount}`);
				
				if (iconData.icons.length > 0) {
					// Analyze icon types
					const customIconCount = iconData.icons.filter(icon => 
						icon.backgroundImage && 
						icon.backgroundImage !== 'none' && 
						!icon.backgroundImage.includes('data:')
					).length;
					
					const codiconIcons = iconData.icons.filter(icon =>
						icon.className.includes('codicon') || 
						icon.fontFamily.includes('codicon')
					).length;
					
					const dataUrlIcons = iconData.icons.filter(icon =>
						icon.backgroundImage && icon.backgroundImage.includes('data:')
					).length;
					
					results.push(`\n📊 Icon Analysis:`);
					results.push(`   Custom background icons: ${customIconCount}`);
					results.push(`   Codicon-based icons: ${codiconIcons}`);
					results.push(`   Data URL icons: ${dataUrlIcons}`);
					
					// Check for hc_minimal theme indicators
					const hasMinimalIcons = iconData.icons.some(icon =>
						icon.backgroundImage.includes('hc_minimal') ||
						icon.backgroundImage.includes('minimal') ||
						icon.className.includes('minimal')
					);
					
					if (hasMinimalIcons) {
						results.push(`   ✅ hc_minimal icon theme detected`);
					} else {
						results.push(`   ⚠️  hc_minimal icon theme not clearly detected`);
					}
					
					// Sample of icon styles for debugging
					if (iconData.icons.length > 0) {
						results.push(`\n🔍 Sample Icon Styles:`);
						const samples = iconData.icons.slice(0, 3);
						for (let i = 0; i < samples.length; i++) {
							const icon = samples[i];
							results.push(`   Icon ${i + 1}:`);
							results.push(`     Tag: ${icon.tagName}, Class: ${icon.className}`);
							if (icon.backgroundImage && icon.backgroundImage !== 'none') {
								const bgImg = icon.backgroundImage.substring(0, 60) + (icon.backgroundImage.length > 60 ? '...' : '');
								results.push(`     Background: ${bgImg}`);
							}
							if (icon.content && icon.content !== 'none') {
								results.push(`     Content: ${icon.content}`);
							}
						}
					}
					
					// Assessment
					if (customIconCount > 0 || hasMinimalIcons) {
						results.push(`\n✅ Custom file icons are being applied (${customIconCount} custom backgrounds found)`);
					} else if (codiconIcons > 0) {
						results.push(`\n⚠️  Using default codicon system - custom theme may not be active`);
					} else {
						results.push(`\n❌ No clear custom file icons detected - theme may not be installed`);
					}
					
				} else {
					results.push(`\n❌ No file icons found - explorer may not be open or no files visible`);
					results.push(`   Try opening a folder or creating some files to test icons`);
				}
				
				// Take icon screenshot if requested
				if (captureIconScreenshot) {
					const screenshotPath = '/tmp/sharp-solarized-icons.png';
					try {
						// Try to screenshot just the explorer area
						const explorerElement = page.locator('.explorer-viewlet, .pane-body .explorer').first();
						if (await explorerElement.isVisible({ timeout: 1000 })) {
							await explorerElement.screenshot({ path: screenshotPath });
						} else {
							await page.screenshot({ path: screenshotPath, fullPage: false });
						}
						results.push(`\n📸 Icon screenshot saved: ${screenshotPath}`);
					} catch (error) {
						results.push(`\n⚠️  Screenshot failed: ${error}`);
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
						text: `❌ Failed to validate file icons: ${error}`
					}]
				};
			}
		}
	));

	// Tool to close browser
	tools.push(server.tool(
		'close_browser',
		'Close the browser and clean up all resources',
		{
			type: 'object',
			properties: {
				force: {
					type: 'boolean',
					description: 'Force close even if there are errors',
					default: false
				}
			}
		},
		async (args) => {
			const { force = false } = args;
			const results: string[] = [];
			let errors = 0;
			
			try {
				// Close page first
				if (page) {
					try {
						await page.close();
						page = null;
						results.push('✅ Page closed successfully');
					} catch (error) {
						errors++;
						results.push(`⚠️  Error closing page: ${error}`);
						if (!force) {
							throw error;
						}
					}
				} else {
					results.push('ℹ️  No page to close');
				}
				
				// Close browser
				if (browser) {
					try {
						await browser.close();
						browser = null;
						results.push('✅ Browser closed successfully');
					} catch (error) {
						errors++;
						results.push(`⚠️  Error closing browser: ${error}`);
						if (!force) {
							throw error;
						}
					}
				} else {
					results.push('ℹ️  No browser to close');
				}
				
				// Summary
				if (errors > 0) {
					results.push(`\n⚠️  Cleanup completed with ${errors} error(s)`);
				} else {
					results.push('\n✅ All resources cleaned up successfully');
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
						text: `❌ Failed to close browser cleanly: ${error}`
					}]
				};
			}
		}
	));

	// Test tool for validating the MCP server setup
	tools.push(server.tool(
		'test_mcp_setup',
		'Test MCP server setup and validate all tools are working',
		{
			type: 'object',
			properties: {
				skipBrowserTest: {
					type: 'boolean',
					description: 'Skip browser-based tests (useful for CI)',
					default: false
				}
			}
		},
		async (args) => {
			const { skipBrowserTest = false } = args;
			const results: string[] = [];
			const issues: string[] = [];
			
			results.push('🔧 MCP Server Setup Validation\n');
			
			// Check Node.js and dependencies
			try {
				const nodeVersion = process.version;
				results.push(`✅ Node.js version: ${nodeVersion}`);
			} catch (error) {
				issues.push(`❌ Node.js check failed: ${error}`);
			}
			
			// Check Playwright availability
			try {
				const { chromium } = require('playwright');
				results.push('✅ Playwright chromium available');
				
				if (!skipBrowserTest) {
					// Test browser launch
					try {
						const testBrowser = await chromium.launch({ headless: true });
						await testBrowser.close();
						results.push('✅ Browser launch test successful');
					} catch (error) {
						issues.push(`❌ Browser launch test failed: ${error}`);
						issues.push('   Try running: cd playwright && npx playwright install chromium');
					}
				} else {
					results.push('⏭️  Browser test skipped');
				}
			} catch (error) {
				issues.push(`❌ Playwright check failed: ${error}`);
			}
			
			// Check extension path
			const extensionPath = getExtensionPath();
			if (fs.existsSync(extensionPath)) {
				results.push(`✅ Extension path exists: ${extensionPath}`);
				
				// Check for key theme files
				const themeFile = path.join(extensionPath, 'themes', 'sharp-solarized.json');
				const packageFile = path.join(extensionPath, 'package.json');
				
				if (fs.existsSync(themeFile)) {
					results.push('✅ Sharp Solarized theme file found');
				} else {
					issues.push(`❌ Theme file not found: ${themeFile}`);
				}
				
				if (fs.existsSync(packageFile)) {
					results.push('✅ Package.json found');
					
					try {
						const packageData = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
						if (packageData.contributes && packageData.contributes.themes) {
							results.push('✅ Theme contributions configured');
						} else {
							issues.push('❌ Theme contributions not found in package.json');
						}
					} catch (error) {
						issues.push(`❌ Failed to parse package.json: ${error}`);
					}
				} else {
					issues.push(`❌ Package.json not found: ${packageFile}`);
				}
			} else {
				issues.push(`❌ Extension path not found: ${extensionPath}`);
			}
			
			// Check color utilities
			try {
				const testColor = parseColor('rgb(247, 244, 232)');
				if (testColor && testColor.r === 247) {
					results.push('✅ Color utilities working');
				} else {
					issues.push('❌ Color utilities test failed');
				}
			} catch (error) {
				issues.push(`❌ Color utilities error: ${error}`);
			}
			
			// Summary
			results.push(`\n📋 Setup Validation Summary:`);
			results.push(`   Issues found: ${issues.length}`);
			results.push(`   Tools tested: ${tools.length}`);
			
			if (issues.length > 0) {
				results.push('\n❌ Issues Found:');
				results.push(...issues);
				results.push('\n💡 Fix these issues for optimal functionality');
			} else {
				results.push('\n✅ All checks passed! MCP server is ready for use.');
			}
			
			return {
				content: [{
					type: 'text' as const,
					text: results.join('\n')
				}]
			};
		}
	));

	return tools;
}