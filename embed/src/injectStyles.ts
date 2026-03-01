// CSS styles that get injected into the page
const styles = `
/* Seat Map Widget Styles */
/* All classes prefixed with smw- to avoid conflicts */

.smw-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 320px;
  max-height: 500px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  background: transparent;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.smw-container.smw-theme-light {
  background: linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

/* Loading state */
.smw-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 200px;
  color: #6b7280;
  gap: 16px;
}

.smw-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(99, 102, 241, 0.2);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: smw-spin 0.8s linear infinite;
}

@keyframes smw-spin {
  to {
    transform: rotate(360deg);
  }
}

/* Error state */
.smw-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 200px;
  color: #f87171;
  gap: 16px;
  padding: 24px;
  text-align: center;
}

.smw-error-icon {
  width: 48px;
  height: 48px;
  opacity: 0.8;
}

.smw-error-message {
  font-size: 14px;
  max-width: 280px;
  line-height: 1.5;
}

.smw-retry-button {
  padding: 10px 20px;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}

.smw-retry-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

/* Viewer */
.smw-viewer {
  position: relative;
  flex: 1;
  overflow: hidden;
}

.smw-canvas-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.smw-canvas {
  display: block;
  transition: transform 0.15s ease-out;
}

/* Seat hover effect */
.smw-seat {
  transition: transform 0.15s ease;
}

.smw-seat:hover .smw-seat-circle {
  filter: brightness(1.2);
}

/* Tooltip */
.smw-tooltip {
  position: fixed;
  z-index: 1000;
  background: rgba(15, 15, 26, 0.95);
  backdrop-filter: blur(8px);
  border-radius: 10px;
  padding: 12px 14px;
  pointer-events: none;
  animation: smw-tooltip-in 0.15s ease-out;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
  min-width: 140px;
}

@keyframes smw-tooltip-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.smw-tooltip-header {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.smw-tooltip-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.smw-tooltip-label {
  font-size: 10px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.smw-tooltip-value {
  font-size: 13px;
  font-weight: 600;
  color: white;
  display: flex;
  align-items: center;
  gap: 6px;
}

.smw-tooltip-category-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.smw-tooltip-price {
  font-size: 18px;
  font-weight: 700;
  color: #22c55e;
  text-align: center;
  padding-top: 4px;
}

/* Zoom controls */
.smw-zoom-controls {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: rgba(15, 15, 26, 0.85);
  backdrop-filter: blur(8px);
  border-radius: 10px;
  padding: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.smw-zoom-controls button {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.smw-zoom-controls button:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
}

.smw-zoom-controls button:active {
  transform: scale(0.95);
}

/* Legend */
.smw-legend {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  background: rgba(15, 15, 26, 0.85);
  backdrop-filter: blur(8px);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.smw-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.smw-legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
}

.smw-legend-available {
  background-color: #6366f1;
  box-shadow: 0 0 8px rgba(99, 102, 241, 0.5);
}

.smw-legend-selected {
  background-color: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
}

.smw-legend-held {
  background-color: #f59e0b;
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
}

.smw-legend-booked {
  background-color: #6b7280;
  box-shadow: none;
}

/* Selection panel */
.smw-selection-panel {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(15, 15, 26, 0.92);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  padding: 16px;
  min-width: 220px;
  max-width: 280px;
  color: white;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.08);
  animation: smw-panel-in 0.2s ease-out;
}

@keyframes smw-panel-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.smw-selection-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: rgba(255, 255, 255, 0.9);
}

.smw-selection-count {
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.1);
  padding: 3px 8px;
  border-radius: 12px;
}

.smw-selection-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 160px;
  overflow-y: auto;
  margin-bottom: 12px;
  padding-right: 4px;
}

.smw-selection-list::-webkit-scrollbar {
  width: 4px;
}

.smw-selection-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
}

.smw-selection-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.smw-selection-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  font-size: 13px;
  transition: background-color 0.15s ease;
}

.smw-selection-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.smw-selection-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.smw-selection-item-label {
  font-weight: 600;
  color: white;
}

.smw-selection-item-location {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.smw-selection-item-price {
  font-weight: 700;
  color: #22c55e;
}

.smw-selection-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: 600;
  font-size: 14px;
}

.smw-selection-total-price {
  font-size: 18px;
  font-weight: 700;
  color: #22c55e;
}

.smw-checkout-button {
  width: 100%;
  margin-top: 12px;
  padding: 14px;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.smw-checkout-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(34, 197, 94, 0.4);
}

.smw-checkout-button:active {
  transform: translateY(0);
}

.smw-checkout-button:disabled {
  background: linear-gradient(135deg, #4b5563 0%, #374151 100%);
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

/* Toast notifications */
.smw-toast-container {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 100;
}

.smw-toast {
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  color: white;
  animation: smw-toast-in 0.25s ease-out;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.smw-toast-error {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.smw-toast-success {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
}

.smw-toast-info {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
}

@keyframes smw-toast-in {
  from {
    opacity: 0;
    transform: translateY(-12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .smw-container {
    min-height: 280px;
    max-height: 400px;
    border-radius: 8px;
  }

  .smw-legend {
    font-size: 10px;
    padding: 8px 10px;
    gap: 8px;
    bottom: 8px;
    left: 8px;
  }

  .smw-legend-dot {
    width: 8px;
    height: 8px;
  }

  .smw-selection-panel {
    left: 8px;
    right: 8px;
    top: 8px;
    max-width: none;
    min-width: auto;
  }

  .smw-zoom-controls {
    bottom: 8px;
    right: 8px;
  }

  .smw-tooltip {
    font-size: 12px;
    padding: 10px 12px;
  }
}
`;

let stylesInjected = false;

export function injectStyles(): void {
  if (stylesInjected) return;

  const styleElement = document.createElement('style');
  styleElement.setAttribute('data-seat-map-widget', 'true');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);

  stylesInjected = true;
}
