// Fallback environment variables for tests
process.env.SESSION_SECRET = process.env.SESSION_SECRET || "test-secret-must-be-at-least-32-chars-long!";
process.env.GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
process.env.DATA_DRIVER = process.env.DATA_DRIVER || "local";
Object.assign(process.env, { NODE_ENV: "test" });

// Mock window.matchMedia for JSDOM
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
