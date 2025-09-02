// Comprehensive accessibility utilities and ARIA management

import React from 'react';

// Accessibility configuration
export interface AccessibilityConfig {
  enableScreenReaderSupport: boolean;
  enableKeyboardNavigation: boolean;
  enableHighContrastMode: boolean;
  enableReducedMotion: boolean;
  enableFocusManagement: boolean;
  announceRouteChanges: boolean;
  announceStateChanges: boolean;
}

// ARIA live region types
export type AriaLiveType = 'polite' | 'assertive' | 'off';

// Focus management utilities
export class FocusManager {
  private static instance: FocusManager;
  private focusStack: HTMLElement[] = [];
  private trapStack: HTMLElement[] = [];

  static getInstance(): FocusManager {
    if (!FocusManager.instance) {
      FocusManager.instance = new FocusManager();
    }
    return FocusManager.instance;
  }

  // Save current focus and set new focus
  saveFocus(element?: HTMLElement): void {
    const currentFocus = document.activeElement as HTMLElement;
    if (currentFocus && currentFocus !== document.body) {
      this.focusStack.push(currentFocus);
    }
    
    if (element) {
      this.setFocus(element);
    }
  }

  // Restore previous focus
  restoreFocus(): void {
    const previousFocus = this.focusStack.pop();
    if (previousFocus && document.contains(previousFocus)) {
      this.setFocus(previousFocus);
    }
  }

  // Set focus with error handling
  setFocus(element: HTMLElement, options?: FocusOptions): void {
    try {
      // Ensure element is focusable
      if (!this.isFocusable(element)) {
        element.setAttribute('tabindex', '-1');
      }
      
      element.focus(options);
      
      // Announce focus change to screen readers
      this.announceFocusChange(element);
    } catch (error) {
      console.warn('Failed to set focus:', error);
    }
  }

  // Check if element is focusable
  isFocusable(element: HTMLElement): boolean {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ];

    return focusableSelectors.some(selector => element.matches(selector)) ||
           element.getAttribute('tabindex') === '0';
  }

  // Get all focusable elements within a container
  getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'a[href]:not([disabled])',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"]):not([disabled])',
      '[contenteditable="true"]:not([disabled])'
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors))
      .filter(el => this.isVisible(el as HTMLElement)) as HTMLElement[];
  }

  // Check if element is visible
  private isVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetWidth > 0 && 
           element.offsetHeight > 0;
  }

  // Trap focus within a container
  trapFocus(container: HTMLElement): () => void {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) return () => {};

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Set initial focus
    this.setFocus(firstElement);
    this.trapStack.push(container);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          this.setFocus(lastElement);
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          this.setFocus(firstElement);
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      this.trapStack = this.trapStack.filter(el => el !== container);
    };
  }

  // Announce focus change to screen readers
  private announceFocusChange(element: HTMLElement): void {
    const label = this.getAccessibleLabel(element);
    if (label) {
      this.announce(`Focused: ${label}`, 'polite');
    }
  }

  // Get accessible label for element
  private getAccessibleLabel(element: HTMLElement): string {
    return element.getAttribute('aria-label') ||
           element.getAttribute('aria-labelledby') ||
           element.getAttribute('title') ||
           (element as HTMLInputElement).placeholder ||
           element.textContent?.trim() ||
           '';
  }

  // Announce message to screen readers
  announce(message: string, priority: AriaLiveType = 'polite'): void {
    const announcer = ScreenReaderAnnouncer.getInstance();
    announcer.announce(message, priority);
  }
}

// Screen reader announcer
export class ScreenReaderAnnouncer {
  private static instance: ScreenReaderAnnouncer;
  private politeRegion: HTMLElement | null = null;
  private assertiveRegion: HTMLElement | null = null;

  static getInstance(): ScreenReaderAnnouncer {
    if (!ScreenReaderAnnouncer.instance) {
      ScreenReaderAnnouncer.instance = new ScreenReaderAnnouncer();
    }
    return ScreenReaderAnnouncer.instance;
  }

  constructor() {
    this.createLiveRegions();
  }

  // Create ARIA live regions
  private createLiveRegions(): void {
    // Check if we're in a browser environment
    if (typeof document === 'undefined' || !document.body) {
      return;
    }

    // Check if regions already exist
    if (document.getElementById('aria-live-polite')) {
      this.politeRegion = document.getElementById('aria-live-polite');
      this.assertiveRegion = document.getElementById('aria-live-assertive');
      return;
    }

    // Polite region for non-urgent announcements
    this.politeRegion = document.createElement('div');
    this.politeRegion.setAttribute('aria-live', 'polite');
    this.politeRegion.setAttribute('aria-atomic', 'true');
    this.politeRegion.setAttribute('aria-relevant', 'text');
    this.politeRegion.className = 'sr-only';
    this.politeRegion.id = 'aria-live-polite';

    // Assertive region for urgent announcements
    this.assertiveRegion = document.createElement('div');
    this.assertiveRegion.setAttribute('aria-live', 'assertive');
    this.assertiveRegion.setAttribute('aria-atomic', 'true');
    this.assertiveRegion.setAttribute('aria-relevant', 'text');
    this.assertiveRegion.className = 'sr-only';
    this.assertiveRegion.id = 'aria-live-assertive';

    // Add to document if appendChild is available
    if (document.body.appendChild) {
      document.body.appendChild(this.politeRegion);
      document.body.appendChild(this.assertiveRegion);
    }
  }

  // Announce message
  announce(message: string, priority: AriaLiveType = 'polite'): void {
    if (!message.trim()) return;

    const region = priority === 'assertive' ? this.assertiveRegion : this.politeRegion;
    if (!region) return;

    // Clear previous message
    region.textContent = '';
    
    // Set new message after a brief delay to ensure screen readers pick it up
    setTimeout(() => {
      region.textContent = message;
    }, 100);

    // Clear message after announcement
    setTimeout(() => {
      region.textContent = '';
    }, 5000);
  }

  // Announce route change
  announceRouteChange(routeName: string): void {
    this.announce(`Navigated to ${routeName}`, 'polite');
  }

  // Announce loading state
  announceLoading(message: string = 'Loading'): void {
    this.announce(message, 'polite');
  }

  // Announce error
  announceError(message: string): void {
    this.announce(`Error: ${message}`, 'assertive');
  }

  // Announce success
  announceSuccess(message: string): void {
    this.announce(`Success: ${message}`, 'polite');
  }
}

// Keyboard navigation manager
export class KeyboardNavigationManager {
  private static instance: KeyboardNavigationManager;
  private shortcuts: Map<string, () => void> = new Map();
  private isEnabled = true;

  static getInstance(): KeyboardNavigationManager {
    if (!KeyboardNavigationManager.instance) {
      KeyboardNavigationManager.instance = new KeyboardNavigationManager();
    }
    return KeyboardNavigationManager.instance;
  }

  constructor() {
    this.setupGlobalKeyboardHandlers();
  }

  // Setup global keyboard event handlers
  private setupGlobalKeyboardHandlers(): void {
    document.addEventListener('keydown', this.handleGlobalKeyDown.bind(this));
    
    // Skip links for keyboard navigation
    this.createSkipLinks();
  }

  // Handle global keyboard events
  private handleGlobalKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled) return;

    // Handle escape key globally
    if (event.key === 'Escape') {
      this.handleEscape();
      return;
    }

    // Handle keyboard shortcuts
    const shortcutKey = this.getShortcutKey(event);
    const handler = this.shortcuts.get(shortcutKey);
    if (handler) {
      event.preventDefault();
      handler();
    }
  }

  // Get shortcut key string
  private getShortcutKey(event: KeyboardEvent): string {
    const parts: string[] = [];
    
    if (event.ctrlKey || event.metaKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    parts.push(event.key.toLowerCase());
    
    return parts.join('+');
  }

  // Handle escape key
  private handleEscape(): void {
    // Close modals, dropdowns, etc.
    const activeModal = document.querySelector('[role="dialog"][aria-hidden="false"]');
    if (activeModal) {
      const closeButton = activeModal.querySelector('[aria-label*="close"], [aria-label*="Close"]');
      if (closeButton) {
        (closeButton as HTMLElement).click();
      }
    }

    // Clear focus from search inputs
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement.matches('input[type="search"], input[role="searchbox"]')) {
      activeElement.blur();
    }
  }

  // Register keyboard shortcut
  registerShortcut(key: string, handler: () => void, description?: string): void {
    this.shortcuts.set(key, handler);
    
    if (description) {
      // Store description for help system
      this.storeShortcutDescription(key, description);
    }
  }

  // Unregister keyboard shortcut
  unregisterShortcut(key: string): void {
    this.shortcuts.delete(key);
  }

  // Store shortcut description for help system
  private storeShortcutDescription(key: string, description: string): void {
    const shortcuts = JSON.parse(localStorage.getItem('keyboardShortcuts') || '{}');
    shortcuts[key] = description;
    localStorage.setItem('keyboardShortcuts', JSON.stringify(shortcuts));
  }

  // Create skip links for accessibility
  private createSkipLinks(): void {
    // Check if we're in a browser environment
    if (typeof document === 'undefined' || !document.body) {
      return;
    }

    // Check if skip links already exist
    if (document.querySelector('.skip-links')) {
      return;
    }

    const skipLinks = document.createElement('div');
    skipLinks.className = 'skip-links';
    skipLinks.innerHTML = `
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <a href="#navigation" class="skip-link">Skip to navigation</a>
    `;
    
    if (document.body.insertBefore) {
      document.body.insertBefore(skipLinks, document.body.firstChild);
    }
  }

  // Enable/disable keyboard navigation
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }
}

// High contrast mode manager
export class HighContrastManager {
  private static instance: HighContrastManager;
  private isHighContrast = false;

  static getInstance(): HighContrastManager {
    if (!HighContrastManager.instance) {
      HighContrastManager.instance = new HighContrastManager();
    }
    return HighContrastManager.instance;
  }

  constructor() {
    this.detectHighContrastMode();
    this.setupMediaQueryListener();
  }

  // Detect high contrast mode
  private detectHighContrastMode(): void {
    // Check for Windows high contrast mode
    const highContrastMedia = window.matchMedia('(prefers-contrast: high)');
    this.isHighContrast = highContrastMedia.matches;
    
    // Apply high contrast styles
    this.applyHighContrastStyles();
  }

  // Setup media query listener
  private setupMediaQueryListener(): void {
    const highContrastMedia = window.matchMedia('(prefers-contrast: high)');
    highContrastMedia.addEventListener('change', (e) => {
      this.isHighContrast = e.matches;
      this.applyHighContrastStyles();
    });
  }

  // Apply high contrast styles
  private applyHighContrastStyles(): void {
    if (this.isHighContrast) {
      document.documentElement.classList.add('high-contrast');
      
      // Announce mode change
      const announcer = ScreenReaderAnnouncer.getInstance();
      announcer.announce('High contrast mode enabled', 'polite');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }

  // Check if high contrast mode is active
  isActive(): boolean {
    return this.isHighContrast;
  }
}

// Reduced motion manager
export class ReducedMotionManager {
  private static instance: ReducedMotionManager;
  private prefersReducedMotion = false;

  static getInstance(): ReducedMotionManager {
    if (!ReducedMotionManager.instance) {
      ReducedMotionManager.instance = new ReducedMotionManager();
    }
    return ReducedMotionManager.instance;
  }

  constructor() {
    this.detectReducedMotionPreference();
    this.setupMediaQueryListener();
  }

  // Detect reduced motion preference
  private detectReducedMotionPreference(): void {
    const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.prefersReducedMotion = reducedMotionMedia.matches;
    
    // Apply reduced motion styles
    this.applyReducedMotionStyles();
  }

  // Setup media query listener
  private setupMediaQueryListener(): void {
    const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionMedia.addEventListener('change', (e) => {
      this.prefersReducedMotion = e.matches;
      this.applyReducedMotionStyles();
    });
  }

  // Apply reduced motion styles
  private applyReducedMotionStyles(): void {
    if (this.prefersReducedMotion) {
      document.documentElement.classList.add('reduce-motion');
      
      // Announce mode change
      const announcer = ScreenReaderAnnouncer.getInstance();
      announcer.announce('Reduced motion mode enabled', 'polite');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  }

  // Check if reduced motion is preferred
  isActive(): boolean {
    return this.prefersReducedMotion;
  }

  // Get safe animation duration
  getSafeAnimationDuration(defaultDuration: number): number {
    return this.prefersReducedMotion ? 0 : defaultDuration;
  }

  // Get safe transition duration
  getSafeTransitionDuration(defaultDuration: string): string {
    return this.prefersReducedMotion ? '0ms' : defaultDuration;
  }
}

// Main accessibility manager
export class AccessibilityManager {
  private static instance: AccessibilityManager;
  private config: AccessibilityConfig;
  private focusManager!: FocusManager;
  private announcer!: ScreenReaderAnnouncer;
  private keyboardManager!: KeyboardNavigationManager;
  private highContrastManager!: HighContrastManager;
  private reducedMotionManager!: ReducedMotionManager;

  static getInstance(config?: Partial<AccessibilityConfig>): AccessibilityManager {
    if (!AccessibilityManager.instance) {
      AccessibilityManager.instance = new AccessibilityManager(config);
    }
    return AccessibilityManager.instance;
  }

  constructor(config: Partial<AccessibilityConfig> = {}) {
    this.config = {
      enableScreenReaderSupport: true,
      enableKeyboardNavigation: true,
      enableHighContrastMode: true,
      enableReducedMotion: true,
      enableFocusManagement: true,
      announceRouteChanges: true,
      announceStateChanges: true,
      ...config,
    };

    this.initializeManagers();
    this.setupGlobalAccessibilityFeatures();
  }

  // Initialize all managers
  private initializeManagers(): void {
    this.focusManager = FocusManager.getInstance();
    this.announcer = ScreenReaderAnnouncer.getInstance();
    this.keyboardManager = KeyboardNavigationManager.getInstance();
    this.highContrastManager = HighContrastManager.getInstance();
    this.reducedMotionManager = ReducedMotionManager.getInstance();
  }

  // Setup global accessibility features
  private setupGlobalAccessibilityFeatures(): void {
    // Add accessibility attributes to root element
    document.documentElement.setAttribute('lang', 'en');
    
    // Setup default keyboard shortcuts
    if (this.config.enableKeyboardNavigation) {
      this.setupDefaultKeyboardShortcuts();
    }

    // Setup focus management
    if (this.config.enableFocusManagement) {
      this.setupFocusManagement();
    }
  }

  // Setup default keyboard shortcuts
  private setupDefaultKeyboardShortcuts(): void {
    // Alt + 1: Skip to main content
    this.keyboardManager.registerShortcut('alt+1', () => {
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        this.focusManager.setFocus(mainContent);
      }
    }, 'Skip to main content');

    // Alt + 2: Skip to navigation
    this.keyboardManager.registerShortcut('alt+2', () => {
      const navigation = document.getElementById('navigation');
      if (navigation) {
        this.focusManager.setFocus(navigation);
      }
    }, 'Skip to navigation');

    // Ctrl + /: Show keyboard shortcuts help
    this.keyboardManager.registerShortcut('ctrl+/', () => {
      this.showKeyboardShortcutsHelp();
    }, 'Show keyboard shortcuts help');
  }

  // Setup focus management
  private setupFocusManagement(): void {
    // Handle focus on page load
    window.addEventListener('load', () => {
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        this.focusManager.setFocus(mainContent);
      }
    });

    // Handle focus on route changes
    if (this.config.announceRouteChanges) {
      this.setupRouteChangeAnnouncements();
    }
  }

  // Setup route change announcements
  private setupRouteChangeAnnouncements(): void {
    // This would be integrated with the router
    // For now, we'll listen to popstate events
    window.addEventListener('popstate', () => {
      const routeName = this.getRouteNameFromPath(window.location.pathname);
      this.announcer.announceRouteChange(routeName);
    });
  }

  // Get route name from path
  private getRouteNameFromPath(path: string): string {
    const routeNames: Record<string, string> = {
      '/': 'GradeMyMail',
      '/fixmymail': 'FixMyMail',
      '/design-system': 'Design System',
      '/premium-ux': 'Premium UX',
      '/loading-demo': 'Loading Demo',
    };

    return routeNames[path] || 'Page';
  }

  // Show keyboard shortcuts help
  private showKeyboardShortcutsHelp(): void {
    const shortcuts = JSON.parse(localStorage.getItem('keyboardShortcuts') || '{}');
    const helpText = Object.entries(shortcuts)
      .map(([key, description]) => `${key}: ${description}`)
      .join('\n');
    
    this.announcer.announce(`Keyboard shortcuts: ${helpText}`, 'polite');
  }

  // Public API methods
  announce(message: string, priority?: AriaLiveType): void {
    if (this.config.enableScreenReaderSupport) {
      this.announcer.announce(message, priority);
    }
  }

  setFocus(element: HTMLElement): void {
    if (this.config.enableFocusManagement) {
      this.focusManager.setFocus(element);
    }
  }

  trapFocus(container: HTMLElement): () => void {
    if (this.config.enableFocusManagement) {
      return this.focusManager.trapFocus(container);
    }
    return () => {};
  }

  registerKeyboardShortcut(key: string, handler: () => void, description?: string): void {
    if (this.config.enableKeyboardNavigation) {
      this.keyboardManager.registerShortcut(key, handler, description);
    }
  }

  isHighContrastMode(): boolean {
    return this.highContrastManager.isActive();
  }

  isReducedMotionMode(): boolean {
    return this.reducedMotionManager.isActive();
  }

  getSafeAnimationDuration(defaultDuration: number): number {
    return this.reducedMotionManager.getSafeAnimationDuration(defaultDuration);
  }

  // Get current configuration
  getConfig(): AccessibilityConfig {
    return { ...this.config };
  }

  // Update configuration
  updateConfig(newConfig: Partial<AccessibilityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// React hooks for accessibility
export function useAccessibility(config?: Partial<AccessibilityConfig>) {
  const manager = React.useMemo(() => 
    AccessibilityManager.getInstance(config), [config]
  );

  return {
    announce: manager.announce.bind(manager),
    setFocus: manager.setFocus.bind(manager),
    trapFocus: manager.trapFocus.bind(manager),
    registerShortcut: manager.registerKeyboardShortcut.bind(manager),
    isHighContrast: manager.isHighContrastMode(),
    isReducedMotion: manager.isReducedMotionMode(),
    getSafeAnimationDuration: manager.getSafeAnimationDuration.bind(manager),
  };
}

// HOC for accessibility
export function withAccessibility<P extends object>(
  Component: React.ComponentType<P>,
  config?: Partial<AccessibilityConfig>
) {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => {
    const accessibility = useAccessibility(config);
    
    return React.createElement(Component, {
      ...props,
      ref,
      accessibility,
    } as any);
  });
  
  WrappedComponent.displayName = `withAccessibility(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Initialize accessibility on app start
export function initializeAccessibility(config?: Partial<AccessibilityConfig>): AccessibilityManager {
  return AccessibilityManager.getInstance(config);
}