import '@testing-library/jest-dom'

// Polyfill for fetch (required by salve-annos for Node.js)
if (typeof global.fetch === 'undefined') {
  const fetch = require('node-fetch')
  global.fetch = fetch
  global.Request = fetch.Request
  global.Response = fetch.Response
  global.Headers = fetch.Headers
}

// Polyfill for structuredClone (required by fake-indexeddb)
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (val) => JSON.parse(JSON.stringify(val))
}

// Polyfill for ResizeObserver (required by cmdk)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Polyfill for scrollIntoView (required by cmdk)
Element.prototype.scrollIntoView = jest.fn()

// Polyfill for TransformStream (required by @ax-llm/ax)
if (typeof global.TransformStream === 'undefined') {
  const { TransformStream } = require('web-streams-polyfill/dist/ponyfill')
  global.TransformStream = TransformStream
}

// Polyfill for IndexedDB (required by Dexie)
const fakeIndexedDB = require('fake-indexeddb')
global.indexedDB = fakeIndexedDB.indexedDB
global.IDBDatabase = fakeIndexedDB.IDBDatabase
global.IDBTransaction = fakeIndexedDB.IDBTransaction
global.IDBRequest = fakeIndexedDB.IDBRequest
global.IDBOpenDBRequest = fakeIndexedDB.IDBOpenDBRequest
global.IDBKeyRange = fakeIndexedDB.IDBKeyRange
global.IDBCursor = fakeIndexedDB.IDBCursor
global.IDBObjectStore = fakeIndexedDB.IDBObjectStore
global.IDBIndex = fakeIndexedDB.IDBIndex

// Mock react-hotkeys-hook
jest.mock('react-hotkeys-hook', () => ({
  useHotkeys: jest.fn(),
}))
