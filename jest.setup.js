import '@testing-library/jest-dom'

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
const FDBFactory = require('fake-indexeddb/lib/FDBFactory')
const idb = new FDBFactory()

// Set up all the IndexedDB globals
global.indexedDB = idb
global.IDBDatabase = idb.IDBDatabase
global.IDBTransaction = idb.IDBTransaction
global.IDBRequest = idb.IDBRequest
global.IDBOpenDBRequest = idb.IDBOpenDBRequest
global.IDBKeyRange = idb.IDBKeyRange
global.IDBCursor = idb.IDBCursor
global.IDBObjectStore = idb.IDBObjectStore
global.IDBIndex = idb.IDBIndex
