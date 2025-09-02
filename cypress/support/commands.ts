/// <reference types="cypress" />

// Custom command to select elements by data-cy attribute
Cypress.Commands.add('dataCy', (value: string) => {
  return cy.get(`[data-cy=${value}]`);
});

// Custom command to mock AI API responses
Cypress.Commands.add('mockAIResponse', (endpoint: string, response: any) => {
  cy.intercept('POST', `/api/${endpoint}`, {
    statusCode: 200,
    body: response,
    delay: 500, // Simulate network delay
  }).as(`mock${endpoint.charAt(0).toUpperCase() + endpoint.slice(1)}`);
});

// Custom command to wait for analysis to complete
Cypress.Commands.add('waitForAnalysis', () => {
  // Wait for loading state to appear and disappear
  cy.get('[data-cy=analysis-loading]', { timeout: 1000 }).should('exist');
  cy.get('[data-cy=analysis-loading]', { timeout: 10000 }).should('not.exist');
  
  // Wait for highlights to appear
  cy.get('[data-cy=highlight-overlay]', { timeout: 5000 }).should('exist');
});

// Custom command to type in rich text editor
Cypress.Commands.add('typeInEditor', (text: string) => {
  // Focus on the editor
  cy.get('[data-cy=rich-text-editor]').click();
  
  // Clear existing content
  cy.get('[data-cy=rich-text-editor]').clear();
  
  // Type new content
  cy.get('[data-cy=rich-text-editor]').type(text, { delay: 50 });
  
  // Wait for debounced analysis
  cy.wait(1500);
});

// Add support for file uploads
Cypress.Commands.add('uploadFile', (fileName: string, fileType: string = 'text/plain') => {
  cy.fixture(fileName).then(fileContent => {
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from(fileContent),
      fileName,
      mimeType: fileType,
    });
  });
});

// Enhanced API mocking commands
Cypress.Commands.add('mockAnalyzeAPI', (response?: any) => {
  const defaultResponse = {
    message: {
      content: 'This is a <fluff>really great</fluff> email that contains <spam_words>amazing deals</spam_words> and some <hard_to_read>complex sentences that are difficult to understand and process</hard_to_read>.'
    }
  };
  
  cy.intercept('POST', '/api/analyze', response || defaultResponse).as('analyzeAPI');
});

Cypress.Commands.add('mockFixAPI', (response?: any) => {
  const defaultResponse = {
    message: {
      content: '<old_draft>really great</old_draft><optimized_draft>excellent</optimized_draft>\n<old_draft>amazing deals</old_draft><optimized_draft>valuable offers</optimized_draft>\n<old_draft>complex sentences that are difficult to understand and process</old_draft><optimized_draft>clear and concise information</optimized_draft>'
    }
  };
  
  cy.intercept('POST', '/api/fix', response || defaultResponse).as('fixAPI');
});

Cypress.Commands.add('mockStorageAPI', () => {
  cy.intercept('POST', '/api/store', { id: 'test-uuid-12345' }).as('storeAPI');
  cy.intercept('GET', '/api/load*', {
    fullOriginalText: 'Test email content',
    fullOriginalHTML: '<p>Test email content</p>',
    taggedContent: 'Test <fluff>email</fluff> content'
  }).as('loadAPI');
});

// Error simulation commands
Cypress.Commands.add('simulateNetworkError', () => {
  cy.intercept('POST', '/api/**', { forceNetworkError: true });
});

Cypress.Commands.add('simulateServerError', (statusCode: number = 500) => {
  cy.intercept('POST', '/api/**', { statusCode, body: { error: 'Server error' } });
});

// Navigation helpers
Cypress.Commands.add('visitGradeMyMail', () => {
  cy.visit('/');
  cy.get('[data-cy=grade-my-mail-page]').should('be.visible');
});

Cypress.Commands.add('visitFixMyMail', () => {
  cy.visit('/fix');
  cy.get('[data-cy=fix-my-mail-page]').should('be.visible');
});

// Analysis workflow helpers
Cypress.Commands.add('expectHighlights', (types: string[]) => {
  types.forEach(type => {
    cy.get(`[data-highlight-type="${type}"]`).should('be.visible');
  });
});

Cypress.Commands.add('clickFixMyMailButton', () => {
  cy.get('[data-cy=fix-my-mail-button]').should('be.visible');
  cy.get('[data-cy=fix-my-mail-button]').click();
});

// Diff viewer helpers
Cypress.Commands.add('expectDiffColumns', () => {
  cy.get('[data-cy=original-column]').should('be.visible');
  cy.get('[data-cy=improved-column]').should('be.visible');
});

Cypress.Commands.add('testHoverSynchronization', () => {
  cy.get('[data-cy=improved-text]').first().trigger('mouseover');
  cy.get('[data-cy=original-text]').first().should('have.class', 'highlighted');
});

// Performance testing
Cypress.Commands.add('measurePerformance', (actionName: string, action: () => void) => {
  cy.window().then((win) => {
    win.performance.mark(`${actionName}-start`);
  });
  
  action();
  
  cy.window().then((win) => {
    win.performance.mark(`${actionName}-end`);
    win.performance.measure(actionName, `${actionName}-start`, `${actionName}-end`);
    
    const measure = win.performance.getEntriesByName(actionName)[0];
    cy.log(`${actionName} took ${measure.duration}ms`);
    
    // Assert performance threshold
    expect(measure.duration).to.be.lessThan(2000);
  });
});

// Accessibility testing
Cypress.Commands.add('checkA11y', () => {
  cy.injectAxe();
  cy.checkA11y();
});

Cypress.Commands.add('testKeyboardNavigation', () => {
  cy.get('body').tab();
  cy.focused().should('be.visible');
});

// Storage helpers
Cypress.Commands.add('clearAppStorage', () => {
  cy.clearLocalStorage();
  cy.clearCookies();
  cy.window().then((win) => {
    win.sessionStorage.clear();
  });
});

Cypress.Commands.add('setMockData', (key: string, data: any) => {
  cy.window().then((win) => {
    win.localStorage.setItem(key, JSON.stringify(data));
  });
});

// Component testing helper
Cypress.Commands.add('mountWithProviders', (component: any, options?: any) => {
  const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
  const { BrowserRouter } = require('react-router-dom');
  
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );

  return cy.mount(component, { wrapper: Wrapper, ...options });
});

declare global {
  namespace Cypress {
    interface Chainable {
      // Existing commands
      dataCy(value: string): Chainable<JQuery<HTMLElement>>;
      mockAIResponse(endpoint: string, response: any): Chainable<void>;
      waitForAnalysis(): Chainable<void>;
      typeInEditor(text: string): Chainable<void>;
      uploadFile(fileName: string, fileType?: string): Chainable<void>;
      
      // Enhanced API mocking
      mockAnalyzeAPI(response?: any): Chainable<void>;
      mockFixAPI(response?: any): Chainable<void>;
      mockStorageAPI(): Chainable<void>;
      
      // Error simulation
      simulateNetworkError(): Chainable<void>;
      simulateServerError(statusCode?: number): Chainable<void>;
      
      // Navigation
      visitGradeMyMail(): Chainable<void>;
      visitFixMyMail(): Chainable<void>;
      
      // Analysis workflow
      expectHighlights(types: string[]): Chainable<void>;
      clickFixMyMailButton(): Chainable<void>;
      
      // Diff viewer
      expectDiffColumns(): Chainable<void>;
      testHoverSynchronization(): Chainable<void>;
      
      // Performance
      measurePerformance(actionName: string, action: () => void): Chainable<void>;
      
      // Accessibility
      checkA11y(): Chainable<void>;
      testKeyboardNavigation(): Chainable<void>;
      
      // Storage
      clearAppStorage(): Chainable<void>;
      setMockData(key: string, data: any): Chainable<void>;
      
      // Component testing
      mountWithProviders(component: any, options?: any): Chainable<void>;
    }
  }
}