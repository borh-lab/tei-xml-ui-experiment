import '@testing-library/jest-dom';

// Polyfill for TextEncoder/TextDecoder (required by Effect)
if (typeof global.TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Polyfill for fetch (required by salve-annos for Node.js)
if (typeof global.fetch === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fetch = require('node-fetch');
  global.fetch = fetch;
  global.Request = fetch.Request;
  global.Response = fetch.Response;
  global.Headers = fetch.Headers;
}

// Polyfill for structuredClone (required by fake-indexeddb)
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (val) => JSON.parse(JSON.stringify(val));
}

// Polyfill for ResizeObserver (required by cmdk)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill for scrollIntoView (required by cmdk)
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = jest.fn();
}

// Polyfill for TransformStream (required by @ax-llm/ax)
if (typeof global.TransformStream === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TransformStream } = require('web-streams-polyfill/dist/ponyfill');
  global.TransformStream = TransformStream;
}

// Polyfill for IndexedDB (required by Dexie)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fakeIndexedDB = require('fake-indexeddb');
global.indexedDB = fakeIndexedDB.indexedDB;
global.IDBDatabase = fakeIndexedDB.IDBDatabase;
global.IDBTransaction = fakeIndexedDB.IDBTransaction;
global.IDBRequest = fakeIndexedDB.IDBRequest;
global.IDBOpenDBRequest = fakeIndexedDB.IDBOpenDBRequest;
global.IDBKeyRange = fakeIndexedDB.IDBKeyRange;
global.IDBCursor = fakeIndexedDB.IDBCursor;
global.IDBObjectStore = fakeIndexedDB.IDBObjectStore;
global.IDBIndex = fakeIndexedDB.IDBIndex;

// Mock react-hotkeys-hook
jest.mock('react-hotkeys-hook', () => ({
  useHotkeys: jest.fn(),
}));


// Mock fetch for sample files
global.fetch = jest.fn(async (url) => {
  // Mock sample file responses
  if (typeof url === 'string' && url.startsWith('/samples/')) {
    const sampleId = url.replace('/samples/', '').replace('.xml', '');
    // Return a valid TEI document for all sample requests
    return {
      ok: true,
      status: 200,
      text: async () => `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>This is a sample TEI document for ${sampleId}.</p>
    </body>
  </text>
</TEI>`,
    };
  }
  // Default mock response for other URLs
  return {
    ok: false,
    status: 404,
    text: async () => 'Not found',
  };
});
