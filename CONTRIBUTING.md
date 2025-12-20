# Contributing to UpTier

Thank you for your interest in contributing to UpTier! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Getting Started](#getting-started)
- [Project Architecture](#project-architecture)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Areas for Contribution](#areas-for-contribution)

## Getting Started

### Prerequisites

- **Node.js** 20+ LTS (required for native module compatibility)
- **pnpm** (package manager for workspaces)
- **Git**

### Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/uptier.git
   cd uptier
   ```

2. **Install pnpm** (if not already installed)
   ```bash
   npm install -g pnpm
   ```

3. **Install dependencies**
   ```bash
   pnpm install
   ```

4. **Approve native module builds**
   ```bash
   pnpm approve-builds
   ```

5. **Rebuild native modules**
   ```bash
   pnpm rebuild
   ```

6. **Build the shared package** (required before running apps)
   ```bash
   pnpm --filter @uptier/shared build
   ```

7. **Build the MCP server** (if working with Claude Desktop integration)
   ```bash
   pnpm --filter @uptier/mcp-server build
   ```

### Verify Setup

Run the Electron app in development mode:
```bash
pnpm dev:electron
```

## Project Architecture

UpTier is a pnpm monorepo with the following structure:

```
uptier/
├── apps/
│   ├── electron/           # Desktop application (Electron + React)
│   │   ├── src/
│   │   │   ├── main/       # Electron main process
│   │   │   ├── preload/    # Preload scripts (IPC bridge)
│   │   │   └── renderer/   # React UI components
│   │   └── build/          # App icons and build assets
│   │
│   └── mcp-server/         # MCP server for Claude Desktop
│       └── src/
│           └── tools/      # MCP tool implementations
│
├── packages/
│   └── shared/             # Shared types, constants, and schema
│
└── scripts/                # Build and deployment scripts
```

### Key Technologies

| Component | Technologies |
|-----------|-------------|
| Desktop UI | React 18, Tailwind CSS, Radix UI |
| Desktop Framework | Electron 31, electron-vite |
| Database | SQLite (better-sqlite3, WAL mode) |
| MCP Integration | @modelcontextprotocol/sdk |
| Build Tools | Vite, TypeScript, electron-builder |

### Native Module Notes

The project uses native modules (better-sqlite3, canvas, electron) that require platform-specific compilation. Each app maintains its own native binary because:
- Electron uses its own Node.js version
- Claude Desktop MCP may use a different Node version

## Development Workflow

### Running Development Servers

**Electron app:**
```bash
pnpm dev:electron
```

**MCP server (watch mode):**
```bash
pnpm dev:mcp
```

### Building

**Build all packages:**
```bash
pnpm build
```

**Build individual packages:**
```bash
pnpm build:shared      # Shared types
pnpm build:mcp         # MCP server
pnpm build:electron    # Electron app
```

### Type Checking

```bash
pnpm typecheck
```

### Packaging for Distribution

```bash
pnpm package
```

### Cleaning Build Outputs

```bash
pnpm clean
```

## Code Style Guidelines

### TypeScript

- **Strict mode is enforced** - The TypeScript compiler catches most issues
- All code must pass `pnpm typecheck` without errors
- Use explicit types for function parameters and return values
- Avoid `any` type; use `unknown` with type guards when necessary

### React Components

- Use functional components with hooks
- Follow existing component patterns in `apps/electron/src/renderer/components/`
- Use Tailwind CSS for styling
- Leverage Radix UI primitives for accessible components

### File Organization

- Keep components focused and single-purpose
- Place shared utilities in `packages/shared/`
- Database operations belong in `main/` process (Electron) or root (MCP server)

### General Guidelines

- Follow existing patterns in the codebase
- Keep functions small and focused
- Use descriptive variable and function names
- Add comments only when the code isn't self-explanatory

## Pull Request Process

### Branch Naming

Use descriptive branch names:
- `feature/add-task-filtering` - New features
- `fix/timestamp-timezone` - Bug fixes
- `docs/update-readme` - Documentation
- `refactor/database-queries` - Code improvements

### Commit Messages

Write clear, descriptive commit messages:
```
Add task deletion with confirmation dialog

- Add delete button to TaskDetail component
- Implement confirmation before deletion
- Invalidate related queries after deletion
```

### PR Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make your changes** and test locally
   ```bash
   pnpm dev:electron    # Test changes
   pnpm typecheck       # Verify types
   ```

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

4. **Push to your fork**
   ```bash
   git push origin feature/your-feature
   ```

5. **Open a Pull Request** against the `main` branch

### PR Requirements

- Clear description of what the PR does
- Reference any related issues
- All type checks must pass
- Test your changes manually on your platform
- Keep PRs focused - one feature or fix per PR

## Issue Guidelines

### Bug Reports

When reporting a bug, include:

1. **Summary** - Brief description of the issue
2. **Steps to Reproduce**
   - Step-by-step instructions to reproduce
   - Include any specific data or configuration
3. **Expected Behavior** - What should happen
4. **Actual Behavior** - What actually happens
5. **Environment**
   - OS and version (Windows 11, macOS 14, etc.)
   - Node.js version (`node --version`)
   - UpTier version or commit hash

### Feature Requests

When requesting a feature:

1. **Use Case** - Describe the problem you're trying to solve
2. **Proposed Solution** - Your idea for how to solve it
3. **Alternatives** - Other approaches you've considered
4. **Additional Context** - Screenshots, mockups, or examples

### Questions

For questions about the codebase or how to implement something, feel free to open an issue with the `question` label.

## Areas for Contribution

We welcome contributions in these areas:

### High Priority
- **Bug fixes** - Help squash bugs and improve stability
- **Documentation** - Improve README, add code comments, create guides
- **Testing** - Help establish a testing infrastructure

### Features
- **UI/UX improvements** - Better accessibility, responsive design
- **Platform support** - Testing and fixes for macOS and Linux
- **New MCP tools** - Expand Claude Desktop integration

### Infrastructure
- **CI/CD** - GitHub Actions for automated testing and builds
- **Linting** - ESLint/Prettier configuration
- **Performance** - Database query optimization, render performance

## Questions?

If you have questions about contributing, feel free to:
- Open an issue with the `question` label
- Check existing issues and discussions

Thank you for contributing to UpTier!
