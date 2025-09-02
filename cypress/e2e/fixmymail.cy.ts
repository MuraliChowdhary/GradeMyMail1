describe('FixMyMail - Email Improvement', () => {
  beforeEach(() => {
    // Set up API mocks
    cy.mockAIResponse('load', {
      fullOriginalText: 'This is a really great email that contains amazing deals and some complex sentences that are difficult to understand and process.',
      fullOriginalHTML: '<p>This is a <strong>really great</strong> email that contains <em>amazing deals</em> and some complex sentences that are difficult to understand and process.</p>',
      taggedContent: 'This is a <fluff>really great</fluff> email that contains <spam_words>amazing deals</spam_words> and some <hard_to_read>complex sentences that are difficult to understand and process</hard_to_read>.'
    });
    
    cy.mockAIResponse('fix', {
      message: {
        content: '<old_draft>really great</old_draft><optimized_draft>excellent</optimized_draft>\n<old_draft>amazing deals</old_draft><optimized_draft>valuable offers</optimized_draft>\n<old_draft>complex sentences that are difficult to understand and process</old_draft><optimized_draft>clear and concise information</optimized_draft>'
      }
    });
    
    // Visit FixMyMail with test data
    cy.visit('/fixmymail?id=test-uuid-12345');
  });

  it('should load the FixMyMail interface', () => {
    cy.get('[data-cy=diff-viewer]').should('be.visible');
    cy.get('[data-cy=original-column]').should('be.visible');
    cy.get('[data-cy=improved-column]').should('be.visible');
    cy.contains('FixMyMail').should('be.visible');
  });

  it('should display original and improved content side by side', () => {
    // Wait for content to load
    cy.get('[data-cy=diff-viewer]').should('be.visible');
    
    // Check original column
    cy.get('[data-cy=original-column]').should('contain', 'really great');
    cy.get('[data-cy=original-column]').should('contain', 'amazing deals');
    
    // Check improved column
    cy.get('[data-cy=improved-column]').should('contain', 'excellent');
    cy.get('[data-cy=improved-column]').should('contain', 'valuable offers');
  });

  it('should highlight differences between original and improved text', () => {
    // Check for diff highlighting
    cy.get('[data-cy=diff-highlight-removed]').should('exist');
    cy.get('[data-cy=diff-highlight-added]').should('exist');
    
    // Verify specific changes are highlighted
    cy.get('[data-cy=diff-highlight-removed]').should('contain', 'really great');
    cy.get('[data-cy=diff-highlight-added]').should('contain', 'excellent');
  });

  it('should synchronize hover effects between columns', () => {
    // Hover over improved text
    cy.get('[data-cy=improved-column] [data-cy=diff-highlight-added]').first().trigger('mouseover');
    
    // Check that corresponding original text is highlighted
    cy.get('[data-cy=original-column] [data-cy=diff-highlight-removed]').first()
      .should('have.class', 'hover-synchronized');
  });

  it('should handle missing data gracefully', () => {
    // Mock empty response
    cy.mockAIResponse('load', {
      statusCode: 404,
      body: { error: 'Data not found' }
    });
    
    cy.visit('/fixmymail?id=invalid-id');
    
    // Error message should be displayed
    cy.get('[data-cy=error-message]').should('be.visible');
    cy.get('[data-cy=error-message]').should('contain', 'not found');
    
    // Return to GradeMyMail button should be available
    cy.get('[data-cy=return-to-grademymail]').should('be.visible');
  });

  it('should handle API errors during improvement generation', () => {
    // Mock fix API error
    cy.mockAIResponse('fix', {
      statusCode: 500,
      body: { error: 'Improvement service temporarily unavailable' }
    });
    
    cy.visit('/fixmymail?id=test-uuid-12345');
    
    // Error message should be displayed
    cy.get('[data-cy=error-message]').should('be.visible');
    cy.get('[data-cy=error-message]').should('contain', 'temporarily unavailable');
    
    // Retry button should be available
    cy.get('[data-cy=retry-button]').should('be.visible');
  });

  it('should preserve HTML formatting in diff view', () => {
    // Check that HTML formatting is preserved
    cy.get('[data-cy=original-column] strong').should('exist');
    cy.get('[data-cy=improved-column] strong').should('exist');
  });

  it('should show loading states during improvement generation', () => {
    // Add delay to mock response
    cy.mockAIResponse('fix', {
      message: {
        content: '<old_draft>test</old_draft><optimized_draft>improved</optimized_draft>'
      },
      delay: 2000
    });
    
    cy.visit('/fixmymail?id=test-uuid-12345');
    
    // Loading state should appear
    cy.get('[data-cy=improvement-loading]').should('be.visible');
    
    // Wait for loading to complete
    cy.get('[data-cy=improvement-loading]', { timeout: 5000 }).should('not.exist');
    cy.get('[data-cy=diff-viewer]').should('be.visible');
  });

  it('should support copy to clipboard functionality', () => {
    // Click copy button
    cy.get('[data-cy=copy-improved-button]').click();
    
    // Success message should appear
    cy.get('[data-cy=copy-success-message]').should('be.visible');
    cy.get('[data-cy=copy-success-message]').should('contain', 'Copied to clipboard');
  });
});

describe('FixMyMail - Navigation', () => {
  it('should redirect to GradeMyMail when no data is available', () => {
    cy.visit('/fixmymail');
    
    // Should redirect to home page
    cy.url().should('eq', Cypress.config().baseUrl + '/');
    
    // Error message should be displayed
    cy.get('[data-cy=error-message]').should('contain', 'return to GradeMyMail');
  });

  it('should provide navigation back to GradeMyMail', () => {
    cy.visit('/fixmymail?id=test-uuid-12345');
    
    // Click back button
    cy.get('[data-cy=back-to-grademymail]').click();
    
    // Should navigate to home page
    cy.url().should('eq', Cypress.config().baseUrl + '/');
  });
});