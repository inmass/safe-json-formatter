# JSON Formatter

A secure, privacy-focused JSON formatter that runs entirely in your browser. **No data is ever sent to servers, logged, or stored anywhere.**

## 🔒 Security & Privacy

This tool is designed with security and privacy as the top priorities:

- ✅ **100% Client-Side**: All processing happens in your browser
- ✅ **No Data Transmission**: Nothing is sent to any server
- ✅ **No Logging**: No data is logged or stored
- ✅ **No Tracking**: No analytics, cookies, or tracking scripts
- ✅ **Open Source**: Full source code available for inspection
- ✅ **Secure Parsing**: Uses only native `JSON.parse()` - no `eval()` or `Function()` constructor
- ✅ **No Dependencies**: Minimal dependencies, all audited

## 🚀 Features

- **Format JSON** with customizable indentation (2, 4, or 8 spaces)
- **Minify JSON** to compact format
- **Validate JSON** with clear error messages
- **Copy to Clipboard** formatted output
- **Download** formatted JSON as a file
- **Real-time Formatting** as you type
- **Dark Mode** support (automatic based on system preference)
- **Responsive Design** works on desktop and mobile

## 🛠️ Technology Stack

- **React 18** - Modern UI framework
- **TypeScript** - Type-safe code
- **Vite** - Fast build tool and dev server
- **Zero Backend** - Pure client-side application

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/jsonformatter.git
cd jsonformatter

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🔍 Security Considerations

### Why This is Secure

1. **No Server Communication**: The application runs entirely in the browser. There's no backend server that could log or store your data.

2. **Native JSON Parsing**: We use only the native `JSON.parse()` method, which is the safest way to parse JSON. We explicitly avoid:
   - `eval()` - Can execute arbitrary code
   - `Function()` constructor - Can create executable functions
   - Custom parsers - May have vulnerabilities

3. **No External Dependencies for Parsing**: We don't use any third-party JSON parsing libraries that could have vulnerabilities.

4. **No Data Persistence**: 
   - No localStorage
   - No sessionStorage
   - No IndexedDB
   - No cookies
   - No server-side storage

5. **No Analytics or Tracking**: The application doesn't include any analytics, tracking pixels, or third-party scripts.

6. **Content Security Policy**: The HTML includes CSP headers to prevent XSS attacks.

### Common Vulnerabilities Avoided

- **Prototype Pollution**: Using native `JSON.parse()` avoids custom parsers that might be vulnerable
- **XSS Attacks**: CSP headers and React's built-in XSS protection
- **Data Exfiltration**: No network requests are made
- **Injection Attacks**: No server-side processing means no injection vectors

## 🧪 Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 📄 License

MIT License - feel free to use this project for any purpose.

## 🤝 Contributing

Contributions are welcome! Please ensure that:

1. All changes maintain the security and privacy guarantees
2. No data logging or storage is introduced
3. Code follows the existing style and patterns
4. Security considerations are documented

## ⚠️ Important Notes

- This tool is for formatting JSON only. It does not execute or evaluate JSON as code.
- Large JSON files may impact browser performance (processing happens in the main thread).
- For extremely sensitive data, consider reviewing the source code before use.

## 🔗 Links

- [GitHub Repository](https://github.com/yourusername/jsonformatter)
- [Live Demo](https://yourusername.github.io/jsonformatter) (if deployed)

---

**Remember**: Always verify the source code if you're handling extremely sensitive data. This project is open source so you can audit it yourself!

