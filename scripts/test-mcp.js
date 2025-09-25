#!/usr/bin/env node

/**
 * Simple test runner for the Sharp Solarized MCP server
 * Run with: node scripts/test-mcp.js
 */

const { getServer } = require('../playwright/out/server');
const { SHARP_SOLARIZED_COLORS, rgbToHex } = require('../playwright/out/colorUtils');
const fs = require('fs');
const path = require('path');

async function testMCPServer() {
  console.log('🔧 Testing Sharp Solarized MCP Server...\n');
  
  try {
    // Test server creation
    console.log('1. Creating MCP server...');
    const server = await getServer();
    console.log('   ✅ Server created successfully');
    
    // Test server properties
    if (server && typeof server.connect === 'function') {
      console.log('   ✅ Server has connect method');
    } else {
      console.log('   ❌ Server missing connect method');
    }
    
    // Test file structure
    console.log('\n2. Checking file structure...');
    
    const requiredFiles = [
      'playwright/out/stdio.js',
      'playwright/out/server.js', 
      'playwright/out/themeTools.js',
      'playwright/out/colorUtils.js',
      '.vscode/mcp.json',
      'themes/sharp-solarized.json',
      'package.json'
    ];
    
    let missingFiles = 0;
    for (const file of requiredFiles) {
      const fullPath = path.join(__dirname, '..', file);
      if (fs.existsSync(fullPath)) {
        console.log(`   ✅ ${file}`);
      } else {
        console.log(`   ❌ ${file} (missing)`);
        missingFiles++;
      }
    }
    
    // Test MCP configuration
    console.log('\n3. Validating MCP configuration...');
    const mcpConfigPath = path.join(__dirname, '..', '.vscode/mcp.json');
    if (fs.existsSync(mcpConfigPath)) {
      const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
      if (mcpConfig.servers && mcpConfig.servers['sharp-solarized-theme-validation']) {
        console.log('   ✅ MCP server configuration found');
        const serverConfig = mcpConfig.servers['sharp-solarized-theme-validation'];
        if (serverConfig.alwaysAllow && serverConfig.alwaysAllow.length > 0) {
          console.log(`   ✅ ${serverConfig.alwaysAllow.length} tools configured in alwaysAllow`);
        }
      } else {
        console.log('   ❌ MCP server configuration not found');
      }
    }
    
    // Test theme file
    console.log('\n4. Validating theme file...');
    const themeFilePath = path.join(__dirname, '..', 'themes/sharp-solarized.json');
    if (fs.existsSync(themeFilePath)) {
      const themeData = JSON.parse(fs.readFileSync(themeFilePath, 'utf8'));
      if (themeData.colors && themeData.colors['editor.background']) {
        const editorBg = themeData.colors['editor.background'];
        console.log(`   ✅ Editor background color: ${editorBg}`);
        
        // Check if it matches expected sepia tone using imported constant
        const expectedSepia = rgbToHex(SHARP_SOLARIZED_COLORS.editorBackground);
        if (editorBg.toLowerCase() === expectedSepia.toLowerCase() || editorBg.toLowerCase() === expectedSepia.substring(1).toLowerCase()) {
          console.log(`   ✅ Matches expected sepia tone (${expectedSepia})`);
        } else {
          console.log(`   ⚠️  Different from expected sepia tone (${expectedSepia})`);
        }
      }
    }
    
    // Summary
    console.log('\n📋 Test Summary:');
    if (missingFiles === 0) {
      console.log('✅ All required files present');
      console.log('✅ MCP server setup appears complete');
      console.log('\n🎉 Ready for MCP client connection!');
      console.log('\n💡 To use:');
      console.log('   1. Start VS Code');
      console.log('   2. Open Command Palette');
      console.log('   3. Run: "MCP: Restart Server"');
      console.log('   4. Select: "sharp-solarized-theme-validation"');
    } else {
      console.log(`❌ ${missingFiles} files missing - check build process`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testMCPServer();
}

module.exports = { testMCPServer };