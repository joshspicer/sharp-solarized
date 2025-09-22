# Sharp Solarized Theme Validation MCP Server

This directory contains a Model Context Protocol (MCP) server that provides comprehensive Playwright browser automation capabilities specifically designed for validating the Sharp Solarized VS Code theme. The MCP server enables AI assistants to programmatically test theme colors, contrast ratios, icon visibility, and accessibility compliance.

## What is MCP?

The [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) is an open standard that enables AI assistants to securely connect to external data sources and tools. This MCP server specifically provides browser automation capabilities using Playwright for theme validation, making it possible for AI assistants to:

- Launch VS Code with the Sharp Solarized theme
- Automatically apply themes with intelligent fallbacks
- Validate theme colors with tolerance-based matching
- Calculate WCAG contrast ratios for accessibility compliance
- Verify file icons are properly displayed
- Capture screenshots for visual validation
- Test theme consistency across different UI components
- Package extensions for installation

## 🚀 Quick Start

### Prerequisites

Make sure you have all dependencies installed:

```bash
# From the Sharp Solarized root directory
cd playwright
npm install

# Install Playwright browsers (required for full functionality)
npx playwright install chromium
```

### Start the MCP Server

The MCP server is configured in the project's `.vscode/mcp.json` file and can be used with any MCP-compatible AI assistant.

The server will automatically compile the TypeScript files and start.

### Using the Server

Once started, you can use the following MCP tools via AI assistants:

## 🔧 Available Tools

### Core Validation Tools

#### `package_extension`
Validates and packages the Sharp Solarized extension structure.

**Parameters:**
- `extensionPath` (string) - Path to extension directory
- `outputPath` (string) - Output path for VSIX file

#### `launch_vscode_with_theme`
Launches VS Code in browser for theme testing with robust error handling.

**Parameters:**
- `headless` (boolean, default: false) - Run browser in headless mode
- `extensionPath` (string) - Path to the theme extension
- `installExtension` (boolean, default: true) - Attempt automatic installation

**Improvements:**
- Enhanced error handling and cleanup
- Automatic browser restart on failures
- Viewport standardization for consistent testing
- Network idle waiting for better stability

#### `apply_sharp_solarized_theme`
Applies the Sharp Solarized theme with intelligent fallbacks.

**Parameters:**
- `fallbackToSimilar` (boolean, default: true) - Try similar themes if not found

**Improvements:**
- Multiple selector strategies for robustness
- Automatic retry logic with exponential backoff
- Fallback to high contrast light themes
- Enhanced error reporting

#### `validate_theme_colors`
Comprehensive color validation with WCAG compliance checking.

**Parameters:**
- `captureScreenshot` (boolean, default: true) - Capture screenshot during validation
- `colorTolerance` (number, default: 10) - Color difference tolerance (0-255)
- `checkContrast` (boolean, default: true) - Perform WCAG contrast checks

**Validates:**
- Editor background color (#f7f4e8 - sepia tone) with tolerance
- Activity bar, sidebar, status bar, and title bar colors
- WCAG AA (4.5:1) and AAA (7.0:1) contrast ratios
- High contrast theme detection

**Improvements:**
- Robust color comparison with tolerance
- WCAG contrast ratio calculations
- Multiple UI element validation
- Color distance algorithms
- Comprehensive reporting

#### `validate_file_icons`
Advanced file icon validation with multiple detection strategies.

**Parameters:**
- `openFolder` (boolean, default: true) - Try to open folder for testing

**Validates:**
- Custom file icon presence across multiple selectors
- Icon theme application (hc-minimal)
- Background image detection
- Theme-specific icon classes

**Improvements:**
- Multiple icon selector strategies
- Enhanced icon detection algorithms
- Theme class validation
- Interactive file exploration

#### `close_browser`
Enhanced cleanup with force options and proper error handling.

**Parameters:**
- `force` (boolean, default: false) - Force close even if cleanup fails

### Workflow Tools

#### `run_full_theme_validation`
Provides a complete validation workflow guide.

**Parameters:**
- `headless` (boolean, default: false) - Run in headless mode
- `captureScreenshots` (boolean, default: true) - Capture screenshots
- `extensionPath` (string) - Path to extension

**Provides:**
- Step-by-step validation workflow
- Expected validation results
- Tool sequencing guidance
- Parameter recommendations

#### `test_mcp_tools`
Test MCP server functionality without browser dependencies.

**Parameters:**
- `skipBrowserTest` (boolean, default: true) - Skip browser-dependent tests

**Tests:**
- Color utility functions
- Contrast calculations
- Tool availability
- Server operational status
- Optional browser capability testing

## 📊 Expected Theme Values

The validation tools check against these Sharp Solarized specifications:

- **Editor Background**: `#f7f4e8` (rgb(247, 244, 232)) - Sepia/kindle tone
- **Dark Accent**: `#423E31` - Used for borders and high contrast elements
- **Medium Accent**: `#D2CCB8` - Used for secondary UI elements
- **Theme Type**: High contrast light (`hcLight`)
- **Icon Theme**: hc-minimal (custom minimal icons)

## 🎯 Validation Features

### Color Validation
- **Tolerance-based matching**: Configurable color difference tolerance
- **Hex/RGB conversion**: Automatic color format handling
- **Distance calculation**: Euclidean color space distance
- **Multi-element testing**: Editor, sidebars, status bars, etc.

### Contrast Compliance
- **WCAG AA/AAA standards**: 4.5:1 and 7.0:1 contrast ratios
- **Luminance calculation**: Proper sRGB luminance computation
- **Accessibility reporting**: Clear pass/fail indicators
- **Multiple element pairs**: Background/foreground combinations

### Icon Validation
- **Multi-selector strategy**: Robust icon detection
- **Custom theme detection**: hc-minimal theme verification
- **Background analysis**: Custom vs default icon detection
- **Interactive testing**: File explorer interaction

### Browser Automation
- **Robust selectors**: Multiple fallback strategies
- **Retry logic**: Automatic retry with exponential backoff
- **Error recovery**: Graceful failure handling
- **Resource cleanup**: Proper browser/page cleanup

## 🛠️ Development

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

# Start the server manually
npm run start-stdio
```

### Project Structure

```
playwright/
├── src/
│   ├── stdio.ts           # MCP server entry point
│   ├── server.ts          # Main server configuration
│   └── themeTools.ts      # Theme validation tools (enhanced)
├── package.json           # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

### Key Improvements Made

1. **Robust Color Validation**
   - Tolerance-based color matching instead of exact string comparison
   - WCAG contrast ratio calculations for accessibility
   - Multiple color format support (hex, rgb)

2. **Enhanced Selector Resilience**
   - Multiple fallback selectors for VS Code UI elements
   - Retry logic with exponential backoff
   - Graceful degradation when elements aren't found

3. **Improved Error Handling**
   - Comprehensive try-catch blocks
   - Detailed error messages
   - Automatic cleanup on failures
   - Force cleanup options

4. **Extended Validation Coverage**
   - Multiple UI element validation
   - Icon theme detection improvements
   - High contrast theme verification
   - Comprehensive reporting

5. **Better Tool Organization**
   - Workflow guidance tools
   - Test utilities for development
   - Extension packaging validation
   - Documentation and examples

## 🐛 Debugging

### Server Won't Start
- Ensure all dependencies are installed with `npm install`
- Check that TypeScript compiles without errors: `npm run compile`
- Verify the MCP configuration in `.vscode/mcp.json`

### Browser Installation Issues
- Run `npx playwright install chromium` to install browsers
- Check network connectivity for browser downloads
- Use `test_mcp_tools` to verify server functionality without browsers

### Theme Validation Issues
- Verify the Sharp Solarized theme is installed in VS Code
- Check browser console for JavaScript errors
- Use tolerance settings for color validation
- Ensure VS Code web is accessible and loading properly

### Common Validation Scenarios

1. **Color Validation**: Verify the signature sepia background (#f7f4e8)
2. **Contrast Testing**: Ensure WCAG AA compliance (4.5:1 minimum)
3. **Icon Consistency**: Check hc-minimal icons across file types
4. **Cross-Component Testing**: Validate theme across all UI elements

## 🔗 Integration with Sharp Solarized Development

This MCP server enhances the Sharp Solarized theme development workflow:

1. **Theme Development**: Make changes to `themes/sharp-solarized.json`
2. **Automated Validation**: Use MCP tools to verify changes
3. **Visual Verification**: Capture screenshots for manual review
4. **Accessibility Check**: Ensure contrast ratios remain compliant
5. **Icon Testing**: Verify file icons work with theme changes
6. **CI/CD Integration**: Automated validation in pipelines

## 📄 License

This project is licensed under the MIT License - see the top-level project's license file for details.