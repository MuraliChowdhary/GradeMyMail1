import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach } from 'vitest';

// Enhanced Jest-compatible matchers for Vitest
expect.extend({
  toBeInTheDocument: (received) => {
    const pass = received && document.body.contains(received);
    return {
      message: () => `expected element ${pass ? 'not ' : ''}to be in the document`,
      pass,
    };
  },
  toHaveTextContent: (received, expected) => {
    const pass = received && received.textContent && received.textContent.includes(expected);
    return {
      message: () => `expected element ${pass ? 'not ' : ''}to have text content "${expected}"`,
      pass,
    };
  },
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock DOMParser for Lexical
global.DOMParser = class DOMParser {
  parseFromString(str: string, type: string) {
    const doc = document.implementation.createHTMLDocument();
    doc.documentElement.innerHTML = str;
    return doc;
  }
};

// Mock Range for Lexical
global.Range = class Range {
  startContainer: Node = document.createElement('div');
  endContainer: Node = document.createElement('div');
  startOffset: number = 0;
  endOffset: number = 0;
  collapsed: boolean = true;
  commonAncestorContainer: Node = document.createElement('div');

  setStart() {}
  setEnd() {}
  selectNode() {}
  selectNodeContents() {}
  collapse() {}
  cloneContents() { return document.createDocumentFragment(); }
  deleteContents() {}
  extractContents() { return document.createDocumentFragment(); }
  insertNode() {}
  surroundContents() {}
  compareBoundaryPoints() { return 0; }
  cloneRange() { return new Range(); }
  detach() {}
  toString() { return ''; }
  getBoundingClientRect() {
    return {
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 0,
      width: 0,
      x: 0,
      y: 0,
      toJSON: () => ({})
    };
  }
  getClientRects() {
    return {
      length: 0,
      item: () => null,
      [Symbol.iterator]: function* () {}
    };
  }
};

// Mock Selection for Lexical
global.Selection = class Selection {
  anchorNode: Node | null = null;
  anchorOffset: number = 0;
  focusNode: Node | null = null;
  focusOffset: number = 0;
  isCollapsed: boolean = true;
  rangeCount: number = 0;
  type: string = 'None';

  addRange() {}
  collapse() {}
  collapseToEnd() {}
  collapseToStart() {}
  containsNode() { return false; }
  deleteFromDocument() {}
  empty() {}
  extend() {}
  getRangeAt() { return new Range(); }
  modify() {}
  removeAllRanges() {}
  removeRange() {}
  selectAllChildren() {}
  setBaseAndExtent() {}
  setPosition() {}
  toString() { return ''; }
};

// Mock getSelection
global.getSelection = () => new Selection();

// Mock document.createRange
document.createRange = () => new Range();

// Mock fetch for API testing
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = vi.fn();

// Mock HTMLCanvasElement
HTMLCanvasElement.prototype.getContext = vi.fn();

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mocked-url');
global.URL.revokeObjectURL = vi.fn();

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
    readText: vi.fn(() => Promise.resolve('')),
  },
});

// Mock performance API
global.performance = {
  ...global.performance,
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByName: vi.fn(() => []),
  getEntriesByType: vi.fn(() => []),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
};

// Mock ClipboardEvent
global.ClipboardEvent = class ClipboardEvent extends Event {
  clipboardData: any;
  constructor(type: string, eventInitDict?: any) {
    super(type, eventInitDict);
    this.clipboardData = eventInitDict?.clipboardData || null;
  }
};