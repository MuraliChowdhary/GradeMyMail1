// ***********************************************************
// This example support/component.ts is processed and
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

// Import global styles
import '../../src/index.css';

// Import React Query for component testing
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { mount } from 'cypress/react';

// Augment the Cypress namespace to include type definitions for
// your custom command.
declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
      mountWithProviders(component: React.ReactElement): Chainable<void>;
    }
  }
}

// Create a custom mount command that includes providers
Cypress.Commands.add('mountWithProviders', (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );

  return cy.mount(component, { wrapper: Wrapper });
});

Cypress.Commands.add('mount', mount);

// Component testing setup
beforeEach(() => {
  // Inject axe for accessibility testing
  cy.injectAxe();
});

// Handle component testing exceptions
Cypress.on('uncaught:exception', (err) => {
  // Ignore React development warnings
  if (err.message.includes('Warning:')) {
    return false;
  }
  
  // Ignore Lexical editor warnings in tests
  if (err.message.includes('Lexical')) {
    return false;
  }
  
  return true;
});