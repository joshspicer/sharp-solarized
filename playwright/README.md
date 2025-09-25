# Sharp Solarized Theme Validation MCP Server

This directory contains a Model Context Protocol (MCP) server that provides Playwright browser automation capabilities specifically designed for validating the Sharp Solarized VS Code theme. The MCP server enables AI assistants to programmatically test theme colors, contrast ratios, and icon visibility with robust error handling and comprehensive validation.

## What is MCP?

The [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) is an open standard that enables AI assistants to securely connect to external data sources and tools. This MCP server specifically provides browser automation capabilities using Playwright for theme validation, making it possible for AI assistants to:

- Launch VS Code with improved reliability and error handling
- Validate theme colors with tolerance-based matching and WCAG contrast calculations  
- Check accessibility compliance with detailed contrast ratio analysis
- Verify file icons with comprehensive icon theme detection
- Capture screenshots for visual validation
- Test theme consistency across different UI components

## Quick Start

### Prerequisites

Make sure you have all dependencies installed:

```bash
# From the Sharp Solarized root directory
cd playwright
npm install

# Install Playwright browsers
npx playwright install chromium
```

### Start the MCP Server

The server is configured in `.vscode/mcp.json`. You can start it by:

1. Using VS Code Command Palette: `MCP: Restart Server → sharp-solarized-theme-validation`
2. Or manually: `cd playwright && npm run start-stdio`

The server will automatically compile TypeScript files and start.

### Using the Server

Once started, you can use the following MCP tools via AI assistants:

- `launch_vscode_with_theme` - Launch VS Code in browser for testing
- `apply_sharp_solarized_theme` - Apply the Sharp Solarized theme with multiple fallback strategies
- `validate_theme_colors` - Check colors with WCAG compliance and tolerance matching
- `validate_file_icons` - Verify custom file icons with detailed analysis
- `test_mcp_setup` - Validate MCP server setup and dependencies
- `close_browser` - Clean up and close browser instances

## Available Tools

### Theme Validation Tools

#### `launch_vscode_with_theme`
Launches VS Code in a browser for theme testing with robust error handling.

**Parameters:**
- `headless` (boolean, default: false) - Run browser in headless mode
- `extensionPath` (string) - Path to the theme extension (auto-detected)  
- `installExtension` (boolean, default: false) - Attempt automatic extension installation

**Improvements:**
- Multiple viewport sizes and browser configurations
- Robust selector waiting with fallback strategies
- Improved error messages and troubleshooting guidance

#### `apply_sharp_solarized_theme`
Applies the Sharp Solarized theme with multiple fallback strategies.

**Parameters:**
- `themeName` (string, default: "Sharp Solarized") - Name of theme to apply

**Improvements:**
- Multiple application strategies (command palette, settings UI)
- Better error handling when theme is not installed
- Improved selector resilience across VS Code versions

#### `validate_theme_colors`
Comprehensive theme color validation with WCAG compliance checking.

**Parameters:**
- `captureScreenshot` (boolean, default: true) - Capture validation screenshots
- `tolerance` (number, default: 10) - Color matching tolerance (0-50)
- `checkContrast` (boolean, default: true) - Perform WCAG contrast validation

**Validates:**
- Editor background color (#f7f4e8 - sepia tone) with tolerance matching
- Activity bar, sidebar, and panel colors
- WCAG AA/AAA contrast ratios for accessibility
- Color distance calculations instead of exact string matching

**New Features:**
- Color tolerance matching for reliable validation across browsers
- WCAG 2.1 contrast ratio calculations with AA/AAA level reporting
- Comprehensive UI element color analysis
- Detailed issue reporting with specific recommendations

#### `validate_file_icons`
Advanced file icon validation with detailed theme detection.

**Parameters:**
- `captureIconScreenshot` (boolean, default: false) - Capture icon screenshots

**Validates:**
- Presence of custom file icons with multiple detection strategies
- hc_minimal icon theme activation
- Icon rendering consistency across file types
- Fallback to codicon detection when custom icons aren't available

**New Features:**
- Multiple icon selector strategies for reliability
- Detailed analysis of icon types (custom, codicon, data URL)
- hc_minimal theme-specific detection
- Sample icon style reporting for debugging

#### `test_mcp_setup`
Validates MCP server setup and dependencies.

**Parameters:**
- `skipBrowserTest` (boolean, default: false) - Skip browser tests for CI

**Tests:**
- Node.js version and Playwright availability
- Browser installation and launch capability
- Extension file structure and configuration
- Color utility functions
- MCP server tool registration

#### `close_browser`
Enhanced browser cleanup with error recovery.

**Parameters:**
- `force` (boolean, default: false) - Force close even with errors

**Improvements:**
- Graceful error handling during cleanup
- Detailed reporting of cleanup status
- Force close option for stuck processes

## Expected Theme Values

The validation tools check against these expected Sharp Solarized values:

- **Editor Background**: `#f7f4e8` (rgb(247, 244, 232)) - Signature sepia/kindle tone
- **Dark Accent**: `#423E31` (rgb(66, 62, 49)) - High contrast borders
- **Medium Accent**: `#D2CCB8` (rgb(210, 204, 184)) - Secondary UI elements  
- **Theme Type**: High contrast light (`hcLight`)
- **WCAG Compliance**: AA level minimum (4.5:1 contrast ratio)

## Key Improvements

### Reliability Enhancements
- **Robust DOM Selection**: Multiple selector strategies with fallbacks
- **Error Recovery**: Retry logic and graceful degradation
- **Cross-Version Compatibility**: Works with different VS Code versions
- **Environment Detection**: Repository-relative paths instead of hardcoded values

### Advanced Validation
- **Color Distance Calculations**: Tolerance-based matching instead of exact equality
- **WCAG Contrast Analysis**: Full AA/AAA compliance checking with detailed ratios
- **Comprehensive UI Testing**: Validates all major VS Code UI components
- **Icon Theme Detection**: Advanced heuristics for custom icon theme validation

### Development Experience
- **Detailed Reporting**: Comprehensive validation results with specific recommendations
- **Screenshot Integration**: Visual validation with automated screenshot capture
- **Setup Validation**: Built-in testing for dependencies and configuration
- **CI/CD Ready**: Headless mode and setup validation for automated testing

## Development

### Manual Setup

```bash
# Navigate to the MCP directory
cd playwright

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Compile TypeScript
npm run compile

# Test setup
node -e "console.log('Testing setup...'); require('./out/server.js')"

# Start the server manually (for debugging)
npm run start-stdio
```

### Project Structure

```
playwright/
├── src/
│   ├── stdio.ts           # MCP server entry point
│   ├── server.ts          # Main server configuration  
│   ├── themeTools.ts      # Theme validation tools
│   └── colorUtils.ts      # Color calculation utilities
├── package.json           # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

### Key Features

- **Theme-Specific Validation**: Focused on Sharp Solarized sepia aesthetic
- **Accessibility Testing**: WCAG contrast ratio calculations with detailed reporting
- **Icon Theme Validation**: Comprehensive hc_minimal icon theme detection
- **Visual Validation**: Automated screenshot capture with error recovery
- **Headless Mode**: Full CI/CD pipeline compatibility
- **Error Resilience**: Multiple fallback strategies and robust error handling

## Debugging

### Server Won't Start
- Ensure all dependencies are installed: `npm install`
- Install Playwright browsers: `npx playwright install chromium`
- Check TypeScript compilation: `npm run compile` 
- Verify MCP configuration in `.vscode/mcp.json`
- Run setup validation: Use `test_mcp_setup` tool

### Theme Validation Issues
- Confirm Sharp Solarized theme is installed in VS Code
- Check browser console for JavaScript errors (use non-headless mode)
- Verify VS Code web is accessible and loading properly
- Try different tolerance values for color matching
- Use screenshot capture to visually inspect theme application

### Browser/Playwright Issues
- Install browsers: `npx playwright install chromium`
- Try headless mode: `{ "headless": true }`  
- Check browser launch permissions and security settings
- For CI environments, ensure proper headless browser support

### Common Validation Scenarios

1. **Color Validation**: Verify sepia background with tolerance matching
2. **Contrast Testing**: Ensure WCAG AA/AAA compliance for accessibility
3. **Icon Consistency**: Validate hc_minimal icons across file types
4. **Cross-Component Testing**: Check theme across editor, sidebars, and panels
5. **Visual Regression**: Use screenshots to detect visual changes

## Integration with Sharp Solarized Development

This MCP server enhances the Sharp Solarized theme development workflow:

1. **Theme Development**: Make changes to `themes/sharp-solarized.json`
2. **Automated Validation**: Use MCP tools to verify changes with tolerance
3. **Accessibility Verification**: Ensure WCAG compliance is maintained  
4. **Visual Documentation**: Capture screenshots for design reviews
5. **CI/CD Integration**: Automate validation in development pipeline

## License

This project is licensed under the MIT License - see the top-level project's license file for details.