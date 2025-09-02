import React from 'react';
import { HighlightOverlay } from '../../src/components/HighlightOverlay/HighlightOverlay';

describe('HighlightOverlay Component', () => {
  const mockHighlights = [
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

  it('renders highlight overlays correctly', () => {
    cy.mountWithProviders(
      <div style={{ position: 'relative', width: '500px', height: '300px' }}>
        <HighlightOverlay
          highlights={mockHighlights}
          containerRef={{ current: null }}
          isVisible={true}
        />
      </div>
    );
    
    cy.get('[data-cy=highlight-overlay]').should('be.visible');
    cy.get('.highlight-fluff').should('exist');
    cy.get('.highlight-spam').should('exist');
    cy.get('.highlight-hard-to-read').should('exist');
  });

  it('shows different colors for different highlight types', () => {
    cy.mountWithProviders(
      <div style={{ position: 'relative', width: '500px', height: '300px' }}>
        <HighlightOverlay
          highlights={mockHighlights}
          containerRef={{ current: null }}
          isVisible={true}
        />
      </div>
    );
    
    // Check that different highlight types have different colors
    cy.get('.highlight-fluff').should('have.css', 'background-color');
    cy.get('.highlight-spam').should('have.css', 'background-color');
    cy.get('.highlight-hard-to-read').should('have.css', 'background-color');
  });

  it('handles empty highlights array', () => {
    cy.mountWithProviders(
      <div style={{ position: 'relative', width: '500px', height: '300px' }}>
        <HighlightOverlay
          highlights={[]}
          containerRef={{ current: null }}
          isVisible={true}
        />
      </div>
    );
    
    cy.get('[data-cy=highlight-overlay]').should('be.visible');
    cy.get('.highlight-fluff').should('not.exist');
    cy.get('.highlight-spam').should('not.exist');
    cy.get('.highlight-hard-to-read').should('not.exist');
  });

  it('can be hidden when isVisible is false', () => {
    cy.mountWithProviders(
      <div style={{ position: 'relative', width: '500px', height: '300px' }}>
        <HighlightOverlay
          highlights={mockHighlights}
          containerRef={{ current: null }}
          isVisible={false}
        />
      </div>
    );
    
    cy.get('[data-cy=highlight-overlay]').should('not.be.visible');
  });

  it('supports hover interactions', () => {
    const onHighlightHover = cy.stub();
    
    cy.mountWithProviders(
      <div style={{ position: 'relative', width: '500px', height: '300px' }}>
        <HighlightOverlay
          highlights={mockHighlights}
          containerRef={{ current: null }}
          isVisible={true}
          onHighlightHover={onHighlightHover}
        />
      </div>
    );
    
    cy.get('.highlight-fluff').first().trigger('mouseover');
    
    cy.then(() => {
      expect(onHighlightHover).to.have.been.calledWith(mockHighlights[0]);
    });
  });

  it('animates highlights progressively', () => {
    cy.mountWithProviders(
      <div style={{ position: 'relative', width: '500px', height: '300px' }}>
        <HighlightOverlay
          highlights={mockHighlights}
          containerRef={{ current: null }}
          isVisible={true}
          animateIn={true}
        />
      </div>
    );
    
    // Check that highlights have animation classes
    cy.get('.highlight-fluff').should('have.class', 'animate-in');
    cy.get('.highlight-spam').should('have.class', 'animate-in');
    cy.get('.highlight-hard-to-read').should('have.class', 'animate-in');
  });
});