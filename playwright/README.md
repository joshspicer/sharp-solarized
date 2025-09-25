# Sharp Solarized Theme Validation MCP Server

This directory contains a Model Context Protocol (MCP) server that provides Playwright browser automation capabilities specifically designed for validating the Sharp Solarized VS Code theme. The MCP server enables AI assistants to programmatically test theme colors, contrast ratios, and icon visibility.

## What is MCP?

The [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) is an open standard that enables AI assistants to securely connect to external data sources and tools. This MCP server specifically provides browser automation capabilities using Playwright for theme validation, making it possible for AI assistants to:

- Launch VS Code with the Sharp Solarized theme
- Validate theme colors match the expected sepia/kindle aesthetic
- Check contrast ratios for accessibility compliance
- Verify file icons are properly displayed
- Capture screenshots for visual validation
- Test theme consistency across different UI components

## Quick Start

### Prerequisites

Make sure you have all dependencies installed:

```bash
# From the Sharp Solarized root directory
cd playwright
npm install

# Install Playwright browser (required for automation)
npx playwright install chromium
```

**Note**: If browser installation fails due to network issues, you can:
- Retry later when network is stable
- Use system Chrome/Chromium by setting `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` and installing Chrome manually:
  - **Ubuntu/Debian**: `sudo apt-get install chromium-browser`
  - **macOS**: `brew install chromium` or download from [Chrome website](https://www.google.com/chrome/)
  - **Windows**: Download from [Chrome website](https://www.google.com/chrome/) or use Chocolatey: `choco install googlechrome`
- See [Playwright's browser installation guide](https://playwright.dev/docs/browsers) for alternative installation methods

### Start the MCP Server

Open the Command Palette and run:
```
MCP: List Servers → sharp-solarized-theme-validation → Start Server
```

Or open [mcp.json](../.vscode/mcp.json) and start it from there.

The server will automatically compile the TypeScript files and start.

### Using the Server

Once started, you can use the following MCP tools via AI assistants:

- `/launch_vscode_with_theme` - Launch VS Code in browser for testing
- `/apply_sharp_solarized_theme` - Apply the Sharp Solarized theme
- `/validate_theme_colors` - Check if colors match expected values
- `/validate_file_icons` - Verify custom file icons are working
- `/close_browser` - Clean up and close browser instances

## Available Tools

### Theme Validation Tools

#### `launch_vscode_with_theme`
Launches VS Code in a browser for theme testing.

**Parameters:**
- `headless` (boolean, default: false) - Run browser in headless mode
- `extensionPath` (string) - Path to the theme extension

#### `apply_sharp_solarized_theme`
Applies the Sharp Solarized theme in the launched VS Code instance.

#### `validate_theme_colors`
Validates that theme colors match the expected Sharp Solarized palette.

**Parameters:**
- `captureScreenshot` (boolean, default: true) - Capture screenshot during validation

**Validates:**
- Editor background color (#f7f4e8 - sepia tone)
- Activity bar background
- Contrast ratios for accessibility

#### `validate_file_icons`
Checks that the hc_minimal icon theme is properly applied.

**Validates:**
- Presence of custom file icons
- Icon rendering in file explorer
- Icon theme consistency

#### `close_browser`
Closes browser instances and cleans up resources.

## Expected Theme Values

The validation tools check against these expected Sharp Solarized values:

- **Editor Background**: `#f7f4e8` (rgb(247, 244, 232)) - Sepia/kindle tone
- **Dark Accent**: `#423E31` - Used for borders and high contrast elements
- **Medium Accent**: `#D2CCB8` - Used for secondary UI elements
- **Theme Type**: High contrast light (`hcLight`)

## Development

### Manual Setup

```bash
# Navigate to the MCP directory
cd playwright

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Start the server manually
npm run start-stdio
```

### Project Structure

```
playwright/
├── src/
│   ├── stdio.ts           # MCP server entry point
│   ├── server.ts          # Main server configuration
│   └── themeTools.ts      # Theme validation tools
├── package.json           # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

### Key Features

- **Theme-Specific Validation**: Focused on Sharp Solarized color palette and aesthetic
- **Accessibility Testing**: Checks contrast ratios for WCAG compliance
- **Icon Theme Validation**: Verifies custom file icons are properly rendered
- **Screenshot Capture**: Visual validation through automated screenshots
- **Headless Mode**: Support for automated CI/CD pipeline testing

## Debugging

### Server Won't Start
- Ensure all dependencies are installed with `npm install`
- Check that TypeScript compiles without errors: `npm run compile`
- Verify the MCP configuration in `.vscode/mcp.json`

### Browser Installation Issues
If `npx playwright install chromium` fails:
- Check network connectivity and retry
- Set `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` and install system Chrome/Chromium
- Use `--force` flag to retry download: `npx playwright install chromium --force`
- For CI environments, use headless mode and cached browser installations
- Check disk space availability and permissions
- See [Playwright docs](https://playwright.dev/docs/browsers#managing-browser-binaries) for advanced configuration

### Theme Validation Issues
- Make sure the Sharp Solarized theme is installed in VS Code
- Check browser console for JavaScript errors
- Verify VS Code web is accessible and loading properly

### Common Validation Scenarios

1. **Color Validation**: Verify the signature sepia background is applied
2. **Contrast Testing**: Ensure text remains readable with high contrast
3. **Icon Consistency**: Check that minimal icons work across file types
4. **Cross-Component Testing**: Validate theme across editor, sidebars, and panels

## Integration with Sharp Solarized Development

This MCP server is designed to work alongside the Sharp Solarized theme development workflow:

1. **Theme Development**: Make changes to `themes/sharp-solarized.json`
2. **Automated Validation**: Use MCP tools to verify changes
3. **Visual Verification**: Capture screenshots for manual review
4. **Accessibility Check**: Ensure contrast ratios remain compliant
5. **Icon Testing**: Verify file icons work with theme changes

## License

This project is licensed under the MIT License - see the top-level project's license file for details.