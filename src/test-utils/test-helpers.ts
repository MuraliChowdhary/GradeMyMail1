// @ts-nocheck
import { vi, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Test utilities for common testing patterns
 */

// User interaction helpers
export const user = userEvent.setup();

// Common test patterns
export const testPatterns = {
  // Test loading states
  async expectLoadingState(testId: string = 'loading') {
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  },

  // Test error states
  async expectErrorState(message?: string) {
    const errorElement = await screen.findByRole('alert');
    expect(errorElement).toBeInTheDocument();
    if (message) {
      expect(errorElement).toHaveTextContent(message);
    }
  },

  // Test form submission
  async submitForm(formTestId: string, submitButtonText: string = 'Submit') {
    const form = screen.getByTestId(formTestId);
    const submitButton = screen.getByRole('button', { name: submitButtonText });
    
    await user.click(submitButton);
    
    return { form, submitButton };
  },

  // Test input changes
  async typeInInput(labelText: string, value: string) {
    const input = screen.getByLabelText(labelText);
    await user.clear(input);
    await user.type(input, value);
    return input;
  },

  // Test navigation
  async expectNavigation(expectedPath: string) {
    await waitFor(() => {
      expect(window.location.pathname).toBe(expectedPath);
    });
  },

  // Test accessibility
  async expectAccessibleButton(buttonText: string) {
    const button = screen.getByRole('button', { name: buttonText });
    expect(button).toBeInTheDocument();
    expect(button).not.toHaveAttribute('aria-disabled', 'true');
    return button;
  },

  // Test keyboard navigation
  async testKeyboardNavigation(element: HTMLElement, key: string) {
    element.focus();
    await user.keyboard(`{${key}}`);
  },
};

// Mock implementations for common APIs
export const mockImplementations = {
  // Mock Intersection Observer
  intersectionObserver: (isIntersecting: boolean = true) => {
    const mockIntersectionObserver = vi.fn();
    mockIntersectionObserver.mockReturnValue({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    });

    // Mock the callback
    const mockEntries = [{ isIntersecting, target: document.createElement('div') }];
    const mockCallback = vi.fn();
    
    global.IntersectionObserver = vi.fn().mockImplementation((callback) => {
      mockCallback.mockImplementation(callback);
      setTimeout(() => callback(mockEntries), 0);
      return mockIntersectionObserver();
    });

    return { mockCallback, mockEntries };
  },

  // Mock ResizeObserver
  resizeObserver: (contentRect: Partial<DOMRectReadOnly> = {}) => {
    const mockResizeObserver = vi.fn();
    mockResizeObserver.mockReturnValue({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    });

    const mockEntries = [{
      target: document.createElement('div'),
      contentRect: {
        width: 100,
        height: 100,
        top: 0,
        left: 0,
        bottom: 100,
        right: 100,
        x: 0,
        y: 0,
        ...contentRect,
      },
    }];

    global.ResizeObserver = vi.fn().mockImplementation((callback) => {
      setTimeout(() => callback(mockEntries), 0);
      return mockResizeObserver();
    });

    return { mockEntries };
  },

  // Mock Canvas context
  canvasContext: () => {
    const mockContext = {
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      measureText: vi.fn(() => ({ width: 100 })),
      fillText: vi.fn(),
      strokeText: vi.fn(),
    };

    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext);
    return mockContext;
  },
};

// Performance testing utilities
export const performanceHelpers = {
  // Measure component render time
  async measureRenderTime(renderFn: () => void): Promise<number> {
    const start = performance.now();
    renderFn();
    await waitFor(() => {}, { timeout: 100 });
    const end = performance.now();
    return end - start;
  },

  // Test memory leaks
  expectNoMemoryLeaks: () => {
    // Mock implementation for memory leak detection
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    return {
      check: () => {
        const currentMemory = (performance as any).memory?.usedJSHeapSize || 0;
        const memoryIncrease = currentMemory - initialMemory;
        
        // Allow for some memory increase but flag significant leaks
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB threshold
      },
    };
  },
};

// Async testing utilities
export const asyncHelpers = {
  // Wait for element to appear
  async waitForElement(selector: string, timeout: number = 5000) {
    return await waitFor(
      () => {
        const element = document.querySelector(selector);
        expect(element).toBeInTheDocument();
        return element;
      },
      { timeout }
    );
  },

  // Wait for element to disappear
  async waitForElementToDisappear(selector: string, timeout: number = 5000) {
    return await waitFor(
      () => {
        const element = document.querySelector(selector);
        expect(element).not.toBeInTheDocument();
      },
      { timeout }
    );
  },

  // Wait for API call to complete
  async waitForApiCall(mockFetch: any, expectedUrl?: string) {
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
      if (expectedUrl) {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(expectedUrl),
          expect.any(Object)
        );
      }
    });
  },

  // Simulate network delay
  async simulateNetworkDelay(ms: number = 1000) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
};

// Component testing utilities
export const componentHelpers = {
  // Test component props
  expectPropsToBePassedCorrectly: (component: HTMLElement, expectedProps: Record<string, any>) => {
    Object.entries(expectedProps).forEach(([prop, value]) => {
      if (typeof value === 'boolean') {
        if (value) {
          expect(component).toHaveAttribute(prop);
        } else {
          expect(component).not.toHaveAttribute(prop);
        }
      } else {
        expect(component).toHaveAttribute(prop, String(value));
      }
    });
  },

  // Test component state changes
  async testStateChange(
    trigger: () => Promise<void>,
    expectation: () => void
  ) {
    await trigger();
    await waitFor(expectation);
  },

  // Test component cleanup
  testComponentCleanup: (cleanupFn: () => void) => {
    return () => {
      cleanupFn();
      // Verify no lingering effects
      expect(document.querySelectorAll('[data-testid]')).toHaveLength(0);
    };
  },
};

// Accessibility testing helpers
export const a11yHelpers = {
  // Test ARIA attributes
  expectAriaAttributes: (element: HTMLElement, attributes: Record<string, string>) => {
    Object.entries(attributes).forEach(([attr, value]) => {
      expect(element).toHaveAttribute(`aria-${attr}`, value);
    });
  },

  // Test keyboard navigation
  async testKeyboardNavigation(elements: HTMLElement[]) {
    for (let i = 0; i < elements.length; i++) {
      await user.tab();
      expect(elements[i]).toHaveFocus();
    }
  },

  // Test screen reader announcements
  expectScreenReaderAnnouncement: (text: string) => {
    const announcement = screen.getByRole('status', { hidden: true });
    expect(announcement).toHaveTextContent(text);
  },
};

// Visual testing utilities
export const visualHelpers = {
  // Test CSS classes
  expectCssClasses: (element: HTMLElement, classes: string[]) => {
    classes.forEach(className => {
      expect(element).toHaveClass(className);
    });
  },

  // Test computed styles
  expectComputedStyle: (element: HTMLElement, property: string, value: string) => {
    const computedStyle = window.getComputedStyle(element);
    expect(computedStyle.getPropertyValue(property)).toBe(value);
  },

  // Test responsive behavior
  async testResponsiveBreakpoint(width: number, height: number = 768) {
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });

    // Trigger resize event
    fireEvent(window, new Event('resize'));
    
    // Wait for any responsive changes to take effect
    await waitFor(() => {}, { timeout: 100 });
  },
};

// Export all helpers as a single object for easy importing
export const testHelpers = {
  patterns: testPatterns,
  mocks: mockImplementations,
  performance: performanceHelpers,
  async: asyncHelpers,
  component: componentHelpers,
  a11y: a11yHelpers,
  visual: visualHelpers,
};