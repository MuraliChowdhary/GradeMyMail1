describe('GradeMyMail - Email Analysis', () => {
  beforeEach(() => {
    // Set up API mocks
    cy.mockAIResponse('analyze', {
      message: {
        content: 'This is a <fluff>really great</fluff> email that contains <spam_words>amazing deals</spam_words> and some <hard_to_read>complex sentences that are difficult to understand and process</hard_to_read>.'
      }
    });
    
    cy.mockAIResponse('store', { id: 'test-uuid-12345' });
    
    cy.visit('/');
  });

  it('should load the GradeMyMail interface', () => {
    cy.get('[data-cy=rich-text-editor]').should('be.visible');
    cy.get('[data-cy=analysis-legend]').should('be.visible');
    cy.contains('GradeMyMail').should('be.visible');
  });

  it('should analyze email content and show highlights', () => {
    cy.fixture('test-emails').then((emails) => {
      cy.typeInEditor(emails.poorEmail.content);
      
      // Wait for analysis to complete
      cy.waitForAnalysis();
      
      // Check that highlights are displayed
      cy.get('[data-cy=highlight-overlay]').should('be.visible');
      cy.get('[data-cy=highlight-legend]').should('be.visible');
      
      // Check for different highlight types
      cy.get('.highlight-fluff').should('exist');
      cy.get('.highlight-spam').should('exist');
      cy.get('.highlight-hard-to-read').should('exist');
    });
  });

  it('should show FixMyMail button when issues are found', () => {
    cy.fixture('test-emails').then((emails) => {
      cy.typeInEditor(emails.poorEmail.content);
      cy.waitForAnalysis();
      
      // FixMyMail button should appear
      cy.get('[data-cy=fix-my-mail-button]').should('be.visible');
      cy.get('[data-cy=fix-my-mail-button]').should('contain', 'FixMyMail');
    });
  });

  it('should not show FixMyMail button for well-written emails', () => {
    // Mock response with no issues
    cy.mockAIResponse('analyze', {
      message: {
        content: 'This is a well-written professional email with clear communication.'
      }
    });
    
    cy.fixture('test-emails').then((emails) => {
      cy.typeInEditor(emails.wellWrittenEmail.content);
      cy.wait(1500); // Wait for debounced analysis
      
      // FixMyMail button should not appear
      cy.get('[data-cy=fix-my-mail-button]').should('not.exist');
    });
  });

  it('should handle API errors gracefully', () => {
    // Mock API error
    cy.mockAIResponse('analyze', {
      statusCode: 500,
      body: { error: 'Analysis service temporarily unavailable' }
    });
    
    cy.fixture('test-emails').then((emails) => {
      cy.typeInEditor(emails.businessEmail.content);
      cy.wait(1500);
      
      // Error message should be displayed
      cy.get('[data-cy=error-message]').should('be.visible');
      cy.get('[data-cy=error-message]').should('contain', 'temporarily unavailable');
    });
  });

  it('should preserve rich text formatting during analysis', () => {
    // Type formatted content
    cy.get('[data-cy=rich-text-editor]').click();
    cy.get('[data-cy=bold-button]').click();
    cy.get('[data-cy=rich-text-editor]').type('Bold text ');
    cy.get('[data-cy=bold-button]').click(); // Turn off bold
    cy.get('[data-cy=rich-text-editor]').type('and normal text');
    
    cy.wait(1500); // Wait for analysis
    
    // Check that formatting is preserved
    cy.get('[data-cy=rich-text-editor] strong').should('contain', 'Bold text');
  });

  it('should show loading states during analysis', () => {
    cy.fixture('test-emails').then((emails) => {
      cy.typeInEditor(emails.businessEmail.content);
      
      // Loading state should appear
      cy.get('[data-cy=analysis-loading]').should('be.visible');
      
      // Wait for analysis to complete
      cy.waitForAnalysis();
      
      // Loading state should disappear
      cy.get('[data-cy=analysis-loading]').should('not.exist');
    });
  });
});

describe('GradeMyMail - Rich Text Editor', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should support basic text formatting', () => {
    cy.get('[data-cy=rich-text-editor]').click();
    
    // Test bold formatting
    cy.get('[data-cy=bold-button]').click();
    cy.get('[data-cy=rich-text-editor]').type('Bold text');
    cy.get('[data-cy=rich-text-editor] strong').should('contain', 'Bold text');
    
    // Test italic formatting
    cy.get('[data-cy=italic-button]').click();
    cy.get('[data-cy=rich-text-editor]').type(' Italic text');
    cy.get('[data-cy=rich-text-editor] em').should('contain', 'Italic text');
  });

  it('should support undo/redo functionality', () => {
    cy.get('[data-cy=rich-text-editor]').click();
    cy.get('[data-cy=rich-text-editor]').type('Test content');
    
    // Undo
    cy.get('[data-cy=undo-button]').click();
    cy.get('[data-cy=rich-text-editor]').should('not.contain', 'Test content');
    
    // Redo
    cy.get('[data-cy=redo-button]').click();
    cy.get('[data-cy=rich-text-editor]').should('contain', 'Test content');
  });

  it('should handle paste operations', () => {
    const htmlContent = '<p><strong>Bold</strong> and <em>italic</em> text</p>';
    
    cy.get('[data-cy=rich-text-editor]').click();
    cy.get('[data-cy=rich-text-editor]').invoke('html', htmlContent);
    
    // Check that formatting is preserved
    cy.get('[data-cy=rich-text-editor] strong').should('contain', 'Bold');
    cy.get('[data-cy=rich-text-editor] em').should('contain', 'italic');
  });
});