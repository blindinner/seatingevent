import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Widget } from './components/Widget';
import { injectStyles } from './injectStyles';
import type { WidgetConfig, SelectedSeat } from './types';

// Re-export types for consumers
export type { WidgetConfig, SelectedSeat };

// Capture the script's origin at load time
// - For traditional <script> tags: use document.currentScript.src
// - For ES modules: use import.meta.url
const scriptOrigin = (() => {
  // Try document.currentScript first (works for <script src="..."> tags)
  if (typeof document !== 'undefined' && document.currentScript) {
    try {
      return new URL((document.currentScript as HTMLScriptElement).src).origin;
    } catch {
      // Fall through to import.meta.url
    }
  }
  // Try import.meta.url for ES modules
  try {
    return new URL(import.meta.url).origin;
  } catch {
    return null;
  }
})();

/**
 * SeatMapWidget - Embeddable seat selection widget
 *
 * Usage:
 * ```html
 * <div id="seat-map"></div>
 * <script src="https://yourdomain.com/embed/seat-map-widget.js"></script>
 * <script>
 *   SeatMapWidget.init({
 *     container: '#seat-map',
 *     eventId: 'evt_abc123',
 *     onSelectionChange: (seats) => console.log('Selected:', seats),
 *     onCheckout: (seats, holdId) => {
 *       window.location.href = `/checkout?holdId=${holdId}`;
 *     }
 *   });
 * </script>
 * ```
 */
class SeatMapWidgetClass {
  private root: Root | null = null;
  private container: HTMLElement | null = null;
  private config: WidgetConfig | null = null;

  /**
   * Initialize the seat map widget
   * @param config Widget configuration
   * @returns The widget instance
   */
  init(config: WidgetConfig): SeatMapWidgetClass {
    // Get container element
    if (typeof config.container === 'string') {
      this.container = document.querySelector(config.container);
    } else {
      this.container = config.container;
    }

    if (!this.container) {
      console.error('SeatMapWidget: Container element not found');
      if (config.onError) {
        config.onError(new Error('Container element not found'));
      }
      return this;
    }

    // Inject styles
    injectStyles();

    // Validate required config
    if (!config.eventId) {
      console.error('SeatMapWidget: eventId is required');
      if (config.onError) {
        config.onError(new Error('eventId is required'));
      }
      return this;
    }

    this.config = config;

    // Create React root and render
    // Pass scriptOrigin to Widget so API calls go to the correct server
    this.root = createRoot(this.container);
    this.root.render(React.createElement(Widget, { config, scriptOrigin }));

    return this;
  }

  /**
   * Destroy the widget and clean up
   */
  destroy(): void {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
    this.container = null;
    this.config = null;
  }

  /**
   * Get the current configuration
   */
  getConfig(): WidgetConfig | null {
    return this.config;
  }
}

// Create singleton instance
const SeatMapWidget = new SeatMapWidgetClass();

// Expose to window for script tag usage
if (typeof window !== 'undefined') {
  (window as unknown as { SeatMapWidget: SeatMapWidgetClass }).SeatMapWidget = SeatMapWidget;
}

export { SeatMapWidget };
