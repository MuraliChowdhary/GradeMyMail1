// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands and setup
import './commands';
import 'cypress-axe';

// Add custom assertions
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to select DOM element by data-cy attribute.
       * @example cy.dataCy('greeting')
       */
      dataCy(value: string): Chainable<JQuery<HTMLElement>>;
      
      /**
       * Custom command to mock AI API responses
       * @example cy.mockAIResponse('analyze', { message: { content: 'mocked response' } })
       */
      mockAIResponse(endpoint: string, response: any): Chainable<null>;
      
      /**
       * Custom command to wait for analysis to complete
       * @example cy.waitForAnalysis()
       */
      waitForAnalysis(): Chainable<null>;
      
      /**
       * Custom command to type in rich text editor
       * @example cy.typeInEditor('Hello world')
       */
      typeInEditor(text: string): Chainable<null>;
    }
  }
}

// Handle uncaught exceptions
Cypress.on('uncaught:exception', (err) => {
  // Ignore React hydration errors in development
  if (err.message.includes('Hydration failed')) {
    return false;
  }
  
  // Ignore ResizeObserver errors
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  
  // Don't fail the test on unhandled promise rejections
  if (err.message.includes('ResizeObserver loop completed with undelivered notifications')) {
    return false;
  }
  
  // Ignore expected errors during error testing scenarios
  if (err.message.includes('Network Error') || 
      err.message.includes('Failed to fetch') ||
      err.message.includes('Analysis service temporarily unavailable')) {
    return false;
  }
  
  return true;
});

// Global test setup
beforeEach(() => {
  // Set consistent viewport
  cy.viewport(1280, 720);
  
  // Clear application storage before each test
  cy.clearAppStorage();
  
  // Set up default API mocks
  cy.mockStorageAPI();
  
  // Inject axe for accessibility testing
  cy.injectAxe();
});

// Performance monitoring setup
Cypress.on('window:before:load', (win) => {
  // Add performance marks for testing
  win.performance.mark('test-start');
});

// Custom assertions for performance testing
chai.use((chai) => {
  chai.Assertion.addMethod('withinPerformanceThreshold', function (threshold: number) {
    const obj = this._obj;
    const duration = obj.duration || obj;
    
    this.assert(
      duration < threshold,
      `expected performance to be within ${threshold}ms but was ${duration}ms`,
      `expected performance to exceed ${threshold}ms but was ${duration}ms`,
      threshold,
      duration
    );
  });
});

declare global {
  namespace Chai {
    interface Assertion {
      withinPerformanceThreshold(threshold: number): Assertion;
    }
  }
}