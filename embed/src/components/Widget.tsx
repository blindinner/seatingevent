import { useEffect, useRef, useCallback } from 'react';
import { useWidgetStore } from '../stores/widgetStore';
import { ApiClient } from '../api/client';
import { RealtimeClient } from '../api/realtime';
import { SeatMapViewer } from './SeatMapViewer';
import { SelectionPanel } from './SelectionPanel';
import { ToastContainer } from './Toast';
import type { WidgetConfig } from '../types';

interface WidgetProps {
  config: WidgetConfig;
  scriptOrigin?: string | null;
}

export function Widget({ config, scriptOrigin }: WidgetProps) {
  const apiClientRef = useRef<ApiClient | null>(null);
  const realtimeClientRef = useRef<RealtimeClient | null>(null);

  const {
    setConfig,
    setEventData,
    updateSeatStatuses,
    isLoading,
    error,
    setError,
    setLoading,
  } = useWidgetStore();

  // Initialize API client
  // Priority: explicit apiBaseUrl > script origin > page origin (last resort)
  const getApiClient = useCallback(() => {
    if (!apiClientRef.current) {
      const baseUrl = config.apiBaseUrl || scriptOrigin || window.location.origin;
      apiClientRef.current = new ApiClient(baseUrl);
    }
    return apiClientRef.current;
  }, [config.apiBaseUrl, scriptOrigin]);

  // Load event data
  useEffect(() => {
    setConfig(config);

    const loadEvent = async () => {
      setLoading(true);
      try {
        const apiClient = getApiClient();
        const data = await apiClient.fetchEvent(config.eventId);

        setEventData(data.event, data.map, data.seatStatuses);

        // Set up realtime updates
        const baseUrl = config.apiBaseUrl || scriptOrigin || window.location.origin;
        realtimeClientRef.current = new RealtimeClient(baseUrl, config.eventId);
        realtimeClientRef.current.subscribe((seatStatuses) => {
          updateSeatStatuses(seatStatuses);
        });

        // Call onLoad callback
        if (config.onLoad) {
          config.onLoad();
        }
      } catch (err) {
        console.error('Failed to load event:', err);
        setError(err instanceof Error ? err.message : 'Failed to load event');
        if (config.onError) {
          config.onError(err instanceof Error ? err : new Error('Failed to load event'));
        }
      }
    };

    loadEvent();

    // Cleanup
    return () => {
      realtimeClientRef.current?.unsubscribe();
    };
  }, [config, setConfig, setEventData, setLoading, setError, updateSeatStatuses, getApiClient]);

  const handleClearError = useCallback(() => {
    setError(null);
  }, [setError]);

  const handleRetry = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const apiClient = getApiClient();
      const data = await apiClient.fetchEvent(config.eventId);
      setEventData(data.event, data.map, data.seatStatuses);
    } catch (err) {
      console.error('Retry failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load event');
    }
  }, [config.eventId, getApiClient, setEventData, setError, setLoading]);

  const themeClass = config.theme === 'dark' ? '' : 'smw-theme-light';

  // Error state
  if (error && isLoading === false) {
    return (
      <div className={`smw-container ${themeClass}`}>
        <div className="smw-error">
          <svg className="smw-error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="smw-error-message">{error}</div>
          <button className="smw-retry-button" onClick={handleRetry}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`smw-container ${themeClass}`}>
        <div className="smw-loading">
          <div className="smw-spinner" />
          <span>Loading seat map...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`smw-container ${themeClass}`}>
      <SeatMapViewer
        showLegend={config.showLegend !== false}
        showZoomControls={config.showZoomControls !== false}
      />
      <SelectionPanel
        apiClient={getApiClient()}
        eventId={config.eventId}
      />
      <ToastContainer error={error} onClearError={handleClearError} />
    </div>
  );
}
