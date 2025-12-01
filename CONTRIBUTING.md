# Contributing to Safe JSON Formatter

Thank you for your interest in contributing! This project prioritizes security and privacy, so please keep that in mind when contributing.

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/inmass/safe-json-formatter.git`
3. Install dependencies: `npm install`
4. Start the dev server: `npm run dev`

## Code Standards

- **TypeScript**: All code must be written in TypeScript
- **Security First**: Never introduce code that:
  - Logs user data
  - Stores user data (localStorage, sessionStorage, cookies, etc.)
  - Sends data to external servers
  - Uses `eval()` or `Function()` constructor
- **Linting**: Run `npm run lint` before committing
- **Type Safety**: Avoid `any` types when possible

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all tests pass (if applicable)
4. Update documentation if needed
5. Submit a pull request with a clear description

## Security Considerations

When contributing, please ensure:

- ✅ No data logging or storage
- ✅ No external API calls
- ✅ No use of dangerous functions (eval, Function, etc.)
- ✅ All user input is handled securely
- ✅ No tracking or analytics

## Questions?

Open an issue for discussion before making significant changes.

