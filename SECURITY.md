# Security Policy

## Supported Versions

We actively support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Security Features

This application is designed with security as a core principle:

### Client-Side Only
- No backend server means no server-side attack vectors
- No database means no data breaches
- No API endpoints means no API vulnerabilities

### Data Handling
- **No Logging**: We do not log any user input or output
- **No Storage**: We do not use localStorage, sessionStorage, IndexedDB, or cookies
- **No Transmission**: We do not send any data to external servers
- **No Analytics**: We do not track user behavior or collect analytics

### Code Security
- Uses only native `JSON.parse()` - no eval() or Function() constructor
- TypeScript for type safety
- ESLint for code quality
- No dangerous dependencies

### Browser Security
- Content Security Policy headers
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Referrer-Policy: no-referrer

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email security concerns to: [your-email@example.com]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and work with you to address the issue.

## Security Best Practices for Users

1. **Verify the Source**: Since this is open source, you can review the code yourself
2. **Use HTTPS**: Always access the application over HTTPS when deployed
3. **Check Dependencies**: Review `package.json` to see all dependencies
4. **Build from Source**: For maximum security, build from source rather than using a hosted version

## Known Limitations

- Large JSON files may cause browser performance issues (processed in main thread)
- Browser extensions may have access to page content (standard browser limitation)
- The application relies on browser security features

## Security Audit

This project is designed to be auditable:
- Minimal dependencies
- Clear, readable code
- No obfuscation
- Open source license

We encourage security researchers to review the codebase and report any issues.

