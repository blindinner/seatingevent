declare type SeatCategory = 'vip' | 'regular' | 'accessible' | 'restricted' | 'premium';

export declare const SeatMapWidget: SeatMapWidgetClass;

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
declare class SeatMapWidgetClass {
    private root;
    private container;
    private config;
    /**
     * Initialize the seat map widget
     * @param config Widget configuration
     * @returns The widget instance
     */
    init(config: WidgetConfig): SeatMapWidgetClass;
    /**
     * Destroy the widget and clean up
     */
    destroy(): void;
    /**
     * Get the current configuration
     */
    getConfig(): WidgetConfig | null;
}

export declare interface SelectedSeat {
    id: string;
    label: string;
    category: SeatCategory;
    price?: number;
    rowLabel?: string;
    sectionLabel?: string;
}

export declare interface WidgetConfig {
    container: string | HTMLElement;
    eventId: string;
    apiBaseUrl?: string;
    maxSeats?: number;
    theme?: 'light' | 'dark';
    showLegend?: boolean;
    showZoomControls?: boolean;
    /**
     * Custom background color for the seat map canvas.
     * Defaults to the map's stored background color.
     * Example: '#1a1a2e', 'rgb(26, 26, 46)', 'transparent'
     */
    canvasBackgroundColor?: string;
    /**
     * Override category prices from the client's system.
     * Keys should match category names (e.g., "VIP", "Premium", "Gold")
     * Values are the prices in the client's currency.
     *
     * Example:
     * ```
     * categoryPrices: {
     *   'Gold': 200,
     *   'Silver': 150,
     *   'Bronze': 100
     * }
     * ```
     */
    categoryPrices?: Record<string, number>;
    onSelectionChange?: (seats: SelectedSeat[]) => void;
    onCheckout?: (seats: SelectedSeat[], holdId: string) => void;
    onError?: (error: Error) => void;
    onLoad?: () => void;
}

export { }
