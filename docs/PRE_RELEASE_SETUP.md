# Pre-release Workflow Setup

This repository includes a GitHub Actions workflow that automatically publishes pre-release versions of the VS Code extension to the Visual Studio Code Marketplace whenever changes are merged to the `main` branch.

## Prerequisites

To enable the pre-release workflow, you need to set up a Personal Access Token (PAT) for the Visual Studio Code Marketplace.

### Setting up Visual Studio Code Marketplace Credentials

1. **Create a Visual Studio Marketplace Publisher Account** (if you don't have one):
   - Go to [Visual Studio Marketplace Publisher Management](https://marketplace.visualstudio.com/manage)
   - Sign in with your Microsoft account
   - Create a publisher if you haven't already

2. **Generate a Personal Access Token**:
   - Go to [Azure DevOps](https://dev.azure.com)
   - Click on your profile picture → Personal access tokens
   - Click "New Token"
   - Configure the token:
     - **Name**: Something descriptive like "VS Code Extension Publishing"
     - **Organization**: Select "All accessible organizations"
     - **Expiration**: Set an appropriate expiration date
     - **Scopes**: Select "Custom defined" and choose:
       - **Marketplace**: Read & Manage
   - Click "Create" and copy the token immediately (you won't be able to see it again)

3. **Add the Token to GitHub Secrets**:
   - Go to your GitHub repository
   - Navigate to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Set:
     - **Name**: `VSCE_PAT`
     - **Value**: The Personal Access Token you created
   - Click "Add secret"

## How the Workflow Works

The pre-release workflow (`/.github/workflows/pre-release.yml`) automatically:

1. **Triggers** on any push to the `main` branch
2. **Generates a pre-release version** using the format: `{major}.{minor}.{timestamp}`
   - Example: `1.0.20241217123045`
3. **Packages** the extension using `vsce package`
4. **Publishes** the extension as a pre-release to the VS Code Marketplace
5. **Uploads** the `.vsix` file as a GitHub Actions artifact for 180 days

## Pre-release Versions

Pre-release versions:
- Are marked as "pre-release" in the VS Code Marketplace
- Can be installed by users who opt into pre-release versions
- Allow testing of new features before stable releases
- Don't affect the stable version numbering

## Manual Testing

You can test the packaging process locally:

```bash
# Install dependencies
npm install

# Package the extension
npm run package

# This will create a .vsix file that you can install in VS Code
```

## Troubleshooting

### Common Issues

1. **Invalid Token Error**: Ensure your `VSCE_PAT` secret is correctly set and hasn't expired
2. **Publisher Mismatch**: Make sure the `publisher` field in `package.json` matches your Visual Studio Marketplace publisher ID
3. **Permission Denied**: Verify your Personal Access Token has "Marketplace: Read & Manage" permissions

### Testing the Workflow

The workflow will run automatically on pushes to `main`. You can also:
- Check the Actions tab in your GitHub repository to see workflow runs
- Download the generated `.vsix` files from the Actions artifacts
- Install the `.vsix` files manually in VS Code for testing

### Security Notes

- Never commit Personal Access Tokens to your repository
- Regularly rotate your PAT tokens
- Use GitHub Secrets to store sensitive information
- The workflow only runs on the `main` branch to prevent unauthorized releases