/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Color utilities for theme validation
 */

export interface RGB {
	r: number;
	g: number;
	b: number;
}

export interface ContrastResult {
	ratio: number;
	level: 'AAA' | 'AA' | 'FAIL';
	passes: {
		AA: boolean;
		AAA: boolean;
	};
}

/**
 * Parse CSS color string to RGB values
 */
export function parseColor(colorString: string): RGB | null {
	// Handle rgb() format
	const rgbMatch = colorString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
	if (rgbMatch) {
		return {
			r: parseInt(rgbMatch[1], 10),
			g: parseInt(rgbMatch[2], 10),
			b: parseInt(rgbMatch[3], 10)
		};
	}

	// Handle hex format
	const hexMatch = colorString.match(/^#([a-fA-F0-9]{6})$/);
	if (hexMatch) {
		const hex = hexMatch[1];
		return {
			r: parseInt(hex.substr(0, 2), 16),
			g: parseInt(hex.substr(2, 2), 16),
			b: parseInt(hex.substr(4, 2), 16)
		};
	}

	// Handle rgba() format (ignore alpha for now)
	const rgbaMatch = colorString.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
	if (rgbaMatch) {
		return {
			r: parseInt(rgbaMatch[1], 10),
			g: parseInt(rgbaMatch[2], 10),
			b: parseInt(rgbaMatch[3], 10)
		};
	}

	return null;
}

/**
 * Convert RGB to hex string
 */
export function rgbToHex(rgb: RGB): string {
	const toHex = (c: number) => {
		const hex = Math.round(Math.max(0, Math.min(255, c))).toString(16);
		return hex.length === 1 ? '0' + hex : hex;
	};
	return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Calculate color distance using Delta E CIE76 formula
 */
export function colorDistance(color1: RGB, color2: RGB): number {
	// Simple Euclidean distance in RGB space
	// For more accurate color comparison, we'd use LAB color space
	const dr = color1.r - color2.r;
	const dg = color1.g - color2.g;
	const db = color1.b - color2.b;
	
	return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Check if two colors are similar within a tolerance
 */
export function colorsMatch(color1: RGB, color2: RGB, tolerance: number = 5): boolean {
	return colorDistance(color1, color2) <= tolerance;
}

/**
 * Calculate relative luminance for WCAG contrast calculations
 */
function relativeLuminance(rgb: RGB): number {
	const rsRGB = rgb.r / 255;
	const gsRGB = rgb.g / 255;
	const bsRGB = rgb.b / 255;

	const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
	const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
	const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate WCAG contrast ratio between two colors
 */
export function contrastRatio(foreground: RGB, background: RGB): number {
	const l1 = relativeLuminance(foreground);
	const l2 = relativeLuminance(background);
	
	const lighter = Math.max(l1, l2);
	const darker = Math.min(l1, l2);
	
	return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check WCAG contrast compliance
 */
export function checkContrast(foreground: RGB, background: RGB): ContrastResult {
	const ratio = contrastRatio(foreground, background);
	
	// WCAG 2.1 guidelines
	const passesAA = ratio >= 4.5;
	const passesAAA = ratio >= 7;
	
	let level: 'AAA' | 'AA' | 'FAIL';
	if (passesAAA) {
		level = 'AAA';
	} else if (passesAA) {
		level = 'AA';
	} else {
		level = 'FAIL';
	}
	
	return {
		ratio,
		level,
		passes: {
			AA: passesAA,
			AAA: passesAAA
		}
	};
}

/**
 * Sharp Solarized theme expected colors
 */
export const SHARP_SOLARIZED_COLORS = {
	// Primary sepia background - the signature color
	editorBackground: { r: 247, g: 244, b: 232 }, // #f7f4e8
	
	// Dark accent for borders and high contrast
	darkAccent: { r: 66, g: 62, b: 49 }, // #423E31
	
	// Medium accent for secondary elements
	mediumAccent: { r: 210, g: 204, b: 184 }, // #D2CCB8
	
	// Text colors that should have good contrast
	primaryText: { r: 42, g: 37, b: 33 }, // Dark text on light background
	secondaryText: { r: 102, g: 92, b: 84 } // Lighter text
};