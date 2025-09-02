import React from 'react';
import { RichTextEditor } from '../../src/components/RichTextEditor/RichTextEditor';

describe('RichTextEditor Component', () => {
  it('renders with default content', () => {
    cy.mountWithProviders(
      <RichTextEditor
        initialContent="Test content"
        onChange={() => {}}
        onAnalyze={() => {}}
      />
    );
    
    cy.get('[data-cy=rich-text-editor]').should('contain', 'Test content');
  });

  it('calls onChange when content is modified', () => {
    const onChange = cy.stub();
    
    cy.mountWithProviders(
      <RichTextEditor
        initialContent=""
        onChange={onChange}
        onAnalyze={() => {}}
      />
    );
    
    cy.get('[data-cy=rich-text-editor]').click();
    cy.get('[data-cy=rich-text-editor]').type('New content');
    
    cy.then(() => {
      expect(onChange).to.have.been.called;
    });
  });

  it('supports bold formatting', () => {
    cy.mountWithProviders(
      <RichTextEditor
        initialContent=""
        onChange={() => {}}
        onAnalyze={() => {}}
      />
    );
    
    cy.get('[data-cy=rich-text-editor]').click();
    cy.get('[data-cy=bold-button]').click();
    cy.get('[data-cy=rich-text-editor]').type('Bold text');
    
    cy.get('[data-cy=rich-text-editor] strong').should('contain', 'Bold text');
  });

  it('supports italic formatting', () => {
    cy.mountWithProviders(
      <RichTextEditor
        initialContent=""
        onChange={() => {}}
        onAnalyze={() => {}}
      />
    );
    
    cy.get('[data-cy=rich-text-editor]').click();
    cy.get('[data-cy=italic-button]').click();
    cy.get('[data-cy=rich-text-editor]').type('Italic text');
    
    cy.get('[data-cy=rich-text-editor] em').should('contain', 'Italic text');
  });

  it('supports undo/redo operations', () => {
    cy.mountWithProviders(
      <RichTextEditor
        initialContent=""
        onChange={() => {}}
        onAnalyze={() => {}}
      />
    );
    
    cy.get('[data-cy=rich-text-editor]').click();
    cy.get('[data-cy=rich-text-editor]').type('Test content');
    
    // Undo
    cy.get('[data-cy=undo-button]').click();
    cy.get('[data-cy=rich-text-editor]').should('not.contain', 'Test content');
    
    // Redo
    cy.get('[data-cy=redo-button]').click();
    cy.get('[data-cy=rich-text-editor]').should('contain', 'Test content');
  });

  it('handles paste operations correctly', () => {
    cy.mountWithProviders(
      <RichTextEditor
        initialContent=""
        onChange={() => {}}
        onAnalyze={() => {}}
      />
    );
    
    const htmlContent = '<p><strong>Bold</strong> and <em>italic</em> text</p>';
    
    cy.get('[data-cy=rich-text-editor]').click();
    cy.get('[data-cy=rich-text-editor]').invoke('html', htmlContent);
    
    // Trigger paste event
    cy.get('[data-cy=rich-text-editor]').trigger('paste');
    
    // Check that formatting is preserved
    cy.get('[data-cy=rich-text-editor] strong').should('contain', 'Bold');
    cy.get('[data-cy=rich-text-editor] em').should('contain', 'italic');
  });

  it('shows loading state during analysis', () => {
    cy.mountWithProviders(
      <RichTextEditor
        initialContent=""
        onChange={() => {}}
        onAnalyze={() => {}}
        isAnalyzing={true}
      />
    );
    
    cy.get('[data-cy=analysis-loading]').should('be.visible');
  });

  it('displays error states appropriately', () => {
    cy.mountWithProviders(
      <RichTextEditor
        initialContent=""
        onChange={() => {}}
        onAnalyze={() => {}}
        error="Analysis failed"
      />
    );
    
    cy.get('[data-cy=error-message]').should('be.visible');
    cy.get('[data-cy=error-message]').should('contain', 'Analysis failed');
  });
});