# Sharp Solarized VS Code Extension - Copilot Instructions

## Overview
This is a VS Code theme extension that provides a high-contrast light theme with sepia tones and a minimal file icon theme. The project is forked from [tinytinytinytiny/solarized-high-contrast-light](https://github.com/tinytinytinytiny/solarized-high-contrast-light) with improvements for better contrast and compatibility with bleeding edge VS Code UI.

This theme is maintained by AI as a self-hosting experiment.

## Project Structure

### Core Theme Files
- `themes/sharp-solarized.json` - Main color theme configuration with VS Code UI and syntax highlighting colors
- `fileicons/hc_minimal-icon-theme.json` - Icon theme definition referencing SVG files
- `fileicons/images/` - SVG icon assets for files, folders, and root folders (dark/light variants)

### Theme Configuration Patterns
- **Color Palette**: Sepia-based with primary colors `f7f4e8` (editor background), `423E31` (dark accent), `D2CCB8` (medium accent)
- **High Contrast Compliance**: Uses `"type": "hcLight"` and includes contrast borders (`contrastBorder`, `contrastActiveBorder`)
- **Inline Edit Support**: Includes modern VS Code inline edit/suggestion colors (`inlineEdit.*` properties)
- **Dual Icon Themes**: Light/dark variants for all icons to support theme switching

## Goals

- Maintain high contrast and accessibility compliance. Keep the aesthetic of the 'kindle', 'e-reader', or 'tattooine' that it has been described as.
- Follow the latest VS Code Insiders to support all new UI as soon as possible. Do this by running `./scripts/latest-insiders-schema.sh` and generating values for all unset properties in the theme.

## Automated Validation

The project includes a Playwright-based Model Context Protocol (MCP) server for automated theme validation. This server provides browser automation capabilities specifically for testing the Sharp Solarized theme.

### MCP Server Location
- **Directory**: `playwright/`
- **Configuration**: `.vscode/mcp.json` defines the server
- **Start Command**: `npm run start-stdio` (from playwright directory)

### Available Validation Tools
The MCP server exposes these tools via AI assistants:

- **`launch_vscode_with_theme`** - Launches VS Code in browser for testing
  - Parameters: `headless` (boolean), `extensionPath` (string)
  - Opens vscode.dev in Chromium for theme validation
  
- **`apply_sharp_solarized_theme`** - Attempts to apply Sharp Solarized theme
  - Uses command palette to switch color themes
  - Note: May require manual theme installation on vscode.dev
  
- **`validate_theme_colors`** - Validates theme colors match expected palette
  - Parameters: `captureScreenshot` (boolean, default: true)
  - Checks editor background for sepia tone (hex: f7f4e8)
  - Captures screenshots for visual validation
  
- **`validate_file_icons`** - Verifies custom file icons are displayed
  - Checks for hc_minimal icon theme application
  - Validates icon rendering in file explorer
  
- **`close_browser`** - Cleans up browser instances

### Expected Theme Values
The validation tools check against these Sharp Solarized specifications:
- **Editor Background**: hex f7f4e8 (rgb: 247, 244, 232) - Signature sepia tone
- **Dark Accent**: hex 423E31 - High contrast borders and elements  
- **Medium Accent**: hex D2CCB8 - Secondary UI elements
- **Theme Type**: hcLight - High contrast light theme

### Setup Requirements
1. Navigate to `playwright/` directory
2. Run `npm install` to install dependencies
3. Run `npx playwright install` to download browser binaries
4. Server auto-compiles TypeScript on startup via `npm run start-stdio`

### Usage in AI Development
This MCP server enables AI assistants to:
- Programmatically test theme changes during development
- Validate color consistency across UI components  
- Capture visual evidence of theme rendering
- Verify accessibility and contrast compliance
- Test icon theme integration

**Note**: The validation tools test against vscode.dev, which may not have the Sharp Solarized theme pre-installed. For full validation, the theme extension needs to be installed manually in the browser environment first.

The validation tools are particularly useful when updating `themes/sharp-solarized.json` or `fileicons/` to ensure changes maintain the intended sepia/kindle aesthetic while preserving accessibility standards.

## Key Conventions

### Color Modifications
- Always test changes against VS Code's accessibility requirements for high contrast themes
- Update both UI colors (`colors` section) and syntax highlighting (`tokenColors` section)
- Include transparency variants (e.g., `42343180`) for layered elements

### Version Management
- Production versions use semantic versioning (1.0.0)
- Pre-release versions auto-generated from date stamps
- Update `CHANGELOG.md` for user-facing changes

## Critical Files for Changes
- `package.json` - Extension metadata and contribution points
- `themes/sharp-solarized.json` - All theme colors and token styles
- `fileicons/hc_minimal-icon-theme.json` - Icon theme configuration
- `.github/workflows/` - Automated publishing workflows

