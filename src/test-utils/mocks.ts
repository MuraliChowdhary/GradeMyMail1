import { expect } from 'storybook/internal/test';
// @ts-nocheck
import { vi } from 'vitest';

// Mock AI API responses
export const mockAIResponses = {
  analyze: {
    success: {
      message: {
        content: 'This is a <fluff>really great</fluff> email that contains <spam_words>amazing deals</spam_words> and some <hard_to_read>complex sentences that are difficult to understand and process</hard_to_read>.'
      }
    },
    multipleIssues: {
      message: {
        content: 'Hey there! <fluff>I hope this email finds you well.</fluff> We have <spam_words>AMAZING DEALS</spam_words> that you <spam_words>CANNOT MISS</spam_words>! <hard_to_read>This is a really long sentence that goes on and on without much structure and contains multiple clauses that make it difficult to read and understand what the main point is supposed to be.</hard_to_read> <fluff>Please don\'t hesitate to reach out</fluff> if you have any questions.'
      }
    },
    fluffOnly: {
      message: {
        content: 'I hope this email finds you well. <fluff>I wanted to reach out</fluff> regarding the project. <fluff>Please let me know your thoughts at your earliest convenience.</fluff> Thank you for your time.'
      }
    },
    spamWordsOnly: {
      message: {
        content: 'Check out our <spam_words>AMAZING DEALS</spam_words> and <spam_words>LIMITED TIME OFFERS</spam_words>! Don\'t miss these <spam_words>INCREDIBLE SAVINGS</spam_words>!'
      }
    },
    hardToReadOnly: {
      message: {
        content: 'The project status update includes <hard_to_read>multiple interconnected components that require careful consideration of various factors including timeline dependencies, resource allocation, stakeholder requirements, and technical implementation details that must be thoroughly evaluated before proceeding with the next phase of development</hard_to_read>.'
      }
    },
    noIssues: {
      message: {
        content: 'This is a well-written professional email with clear communication.'
      }
    },
    emptyContent: {
      message: {
        content: ''
      }
    },
    error: {
      error: 'Analysis service temporarily unavailable'
    },
    networkError: {
      error: 'Network connection failed'
    },
    timeoutError: {
      error: 'Request timeout - please try again'
    },
    invalidInput: {
      error: 'Invalid input format'
    }
  },
  fix: {
    success: {
      message: {
        content: '<old_draft>really great</old_draft><optimized_draft>excellent</optimized_draft>\n<old_draft>amazing deals</old_draft><optimized_draft>valuable offers</optimized_draft>\n<old_draft>complex sentences that are difficult to understand and process</old_draft><optimized_draft>clear and concise information</optimized_draft>'
      }
    },
    multipleImprovements: {
      message: {
        content: '<old_draft>I hope this email finds you well.</old_draft><optimized_draft>I hope you\'re doing well.</optimized_draft>\n<old_draft>AMAZING DEALS</old_draft><optimized_draft>great offers</optimized_draft>\n<old_draft>CANNOT MISS</old_draft><optimized_draft>worth considering</optimized_draft>\n<old_draft>This is a really long sentence that goes on and on without much structure and contains multiple clauses that make it difficult to read and understand what the main point is supposed to be.</old_draft><optimized_draft>Here are the key project updates you need to know.</optimized_draft>\n<old_draft>Please don\'t hesitate to reach out</old_draft><optimized_draft>Feel free to contact me</optimized_draft>'
      }
    },
    singleImprovement: {
      message: {
        content: '<old_draft>I wanted to reach out</old_draft><optimized_draft>I\'m writing to discuss</optimized_draft>'
      }
    },
    noImprovements: {
      message: {
        content: ''
      }
    },
    partialSuccess: {
      message: {
        content: '<old_draft>really great</old_draft><optimized_draft>excellent</optimized_draft>\n<old_draft>amazing deals</old_draft><optimized_draft>valuable offers</optimized_draft>'
      }
    },
    error: {
      error: 'Improvement service temporarily unavailable'
    },
    networkError: {
      error: 'Network connection failed'
    },
    timeoutError: {
      error: 'Request timeout - please try again'
    },
    invalidFormat: {
      error: 'Invalid tagged content format'
    }
  },
  store: {
    success: {
      id: 'test-uuid-12345'
    }
  },
  load: {
    success: {
      fullOriginalText: 'This is a really great email that contains amazing deals and some complex sentences that are difficult to understand and process.',
      fullOriginalHTML: '<p>This is a <strong>really great</strong> email that contains <em>amazing deals</em> and some complex sentences that are difficult to understand and process.</p>',
      taggedContent: 'This is a <fluff>really great</fluff> email that contains <spam_words>amazing deals</spam_words> and some <hard_to_read>complex sentences that are difficult to understand and process</hard_to_read>.'
    }
  }
};

// Mock fetch responses
export const mockFetch = (endpoint: string, success: boolean = true) => {
  const responses: Record<string, any> = {
    '/api/analyze': success ? mockAIResponses.analyze.success : mockAIResponses.analyze.error,
    '/api/fix': success ? mockAIResponses.fix.success : mockAIResponses.fix.error,
    '/api/store': success ? mockAIResponses.store.success : { error: 'Storage failed' },
    '/api/load': success ? mockAIResponses.load.success : { error: 'Data not found' }
  };

  return vi.fn().mockResolvedValue({
    ok: success,
    status: success ? 200 : 500,
    json: () => Promise.resolve(responses[endpoint] || {}),
  });
};

// Mock highlight data
export const mockHighlights = [
  {
    id: '1',
    type: 'fluff' as const,
    text: 'really great',
    position: { start: 10, end: 22 },
    severity: 'medium' as const,
  },
  {
    id: '2',
    type: 'spam_words' as const,
    text: 'amazing deals',
    position: { start: 45, end: 58 },
    severity: 'high' as const,
  },
  {
    id: '3',
    type: 'hard_to_read' as const,
    text: 'complex sentence',
    position: { start: 70, end: 86 },
    severity: 'low' as const,
  },
];

// Mock email content
export const mockEmailContent = {
  businessEmail: {
    subject: 'Quarterly Report Review',
    content: 'Dear Team, I hope this email finds you well. I wanted to reach out regarding the quarterly report that we discussed in our last meeting. The numbers look really great and I think we should definitely move forward with the proposed strategy. Please let me know your thoughts at your earliest convenience. Best regards, John'
  },
  marketingEmail: {
    subject: 'AMAZING DEALS - Don\'t Miss Out!!!',
    content: 'Hey there! We have some absolutely incredible deals that you simply cannot miss! These amazing offers are only available for a limited time, so act fast! Click here now to save big on all your favorite products. Don\'t wait - these deals won\'t last forever!'
  },
  poorEmail: {
    subject: 'Re: Stuff',
    content: 'Hey, so like I was thinking about that thing we talked about and I think maybe we should probably do something about it but I\'m not really sure what exactly we should do so maybe we could meet sometime soon to discuss this further and figure out what our next steps should be.'
  },
  wellWrittenEmail: {
    subject: 'Project Update - Next Steps',
    content: 'Hi Sarah, I wanted to update you on the project status. We\'ve completed the initial research phase and are ready to move to development. The timeline remains on track for our Q2 delivery. I\'ll send the detailed specifications by Friday. Please let me know if you have any questions. Thanks, Mike'
  }
};

// Mock React Query client
export const createMockQueryClient = () => {
  const { QueryClient } = require('@tanstack/react-query');
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

// Mock router
export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

// Mock Lexical editor
export const mockLexicalEditor = {
  getEditorState: vi.fn(),
  setEditorState: vi.fn(),
  update: vi.fn(),
  focus: vi.fn(),
  blur: vi.fn(),
  isEditable: vi.fn(() => true),
  setEditable: vi.fn(),
  toJSON: vi.fn(() => ({})),
  registerCommand: vi.fn(),
  registerUpdateListener: vi.fn(),
  registerTextContentListener: vi.fn(),
  registerMutationListener: vi.fn(),
  registerEditableListener: vi.fn(),
  registerDecoratorListener: vi.fn(),
  registerRootListener: vi.fn(),
  registerNodeTransform: vi.fn(),
  hasNodes: vi.fn(() => true),
  dispatchCommand: vi.fn(),
  getElementByKey: vi.fn(),
  getRootElement: vi.fn(),
  setRootElement: vi.fn(),
  getKey: vi.fn(() => 'mock-key'),
  destroy: vi.fn(),
};

// Mock Web Vitals
export const mockWebVitals = {
  getCLS: vi.fn(),
  getFID: vi.fn(),
  getFCP: vi.fn(),
  getLCP: vi.fn(),
  getTTFB: vi.fn(),
};

// Mock performance observer
export const mockPerformanceObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn(() => []),
}));

// Add static property to the mock constructor
(mockPerformanceObserver as any).supportedEntryTypes = ['navigation', 'resource', 'paint', 'measure', 'mark'];

// Setup function for tests
export const setupTestEnvironment = () => {
  // Reset all mocks
  vi.clearAllMocks();
  
  // Setup fetch mock
  global.fetch = mockFetch('/api/analyze');
  
  // Setup performance observer
  global.PerformanceObserver = mockPerformanceObserver;
  
  // Setup console mocks to reduce noise in tests
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
};

// Cleanup function for tests
export const cleanupTestEnvironment = () => {
  vi.restoreAllMocks();
  vi.clearAllTimers();
};

// Test utilities for React Testing Library
export const renderWithProviders = (ui: any, options: any = {}) => {
  const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
  const { render } = require('@testing-library/react');
  const { BrowserRouter } = require('react-router-dom');
  const React = require('react');
  
  const queryClient = createMockQueryClient();
  
  const AllTheProviders = ({ children }: { children: any }) => {
    return React.createElement(QueryClientProvider, { client: queryClient },
      React.createElement(BrowserRouter, null, children)
    );
  };

  return render(ui, { wrapper: AllTheProviders, ...options });
};

// Custom render hook with providers
export const renderHookWithProviders = (hook: () => any, options: any = {}) => {
  const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
  const { renderHook } = require('@testing-library/react');
  const { BrowserRouter } = require('react-router-dom');
  const React = require('react');
  
  const queryClient = createMockQueryClient();
  
  const wrapper = ({ children }: { children: any }) => 
    React.createElement(QueryClientProvider, { client: queryClient },
      React.createElement(BrowserRouter, null, children)
    );

  return renderHook(hook, { wrapper, ...options });
};

// Wait for async operations in tests
export const waitForLoadingToFinish = async () => {
  const { waitFor } = require('@testing-library/react');
  await waitFor(() => {
    expect(document.querySelector('[data-testid="loading"]')).not.toBeInTheDocument();
  }, { timeout: 5000 });
};

// Mock API server responses for testing
export const mockApiServer = {
  analyze: (response: any = mockAIResponses.analyze.success) => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(response),
    });
  },
  fix: (response: any = mockAIResponses.fix.success) => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(response),
    });
  },
  error: (status: number = 500, message: string = 'Server error') => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: () => Promise.resolve({ error: message }),
    });
  },
  networkError: () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
  },
};