'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/auth';

interface AnalyticsData {
  totalViews: number;
  uniqueVisitors: number;
  dailyViews: { date: string; views: number; uniqueVisitors: number }[];
  deviceBreakdown: Record<string, number>;
  topReferrers: { domain: string; count: number }[];
  period: string;
}

interface PageViewsAnalyticsProps {
  eventId: string;
}

export function PageViewsAnalytics({ eventId }: PageViewsAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('7d');

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      setError(null);

      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();

        const res = await fetch(`/api/events/${eventId}/analytics?period=${period}`, {
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
          },
        });

        if (!res.ok) {
          throw new Error('Failed to fetch analytics');
        }

        const analyticsData = await res.json();
        setData(analyticsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [eventId, period]);

  // Find max views for chart scaling
  const maxViews = data?.dailyViews.reduce((max, d) => Math.max(max, d.views), 0) || 1;

  // Generate date labels for the chart
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Page Views</h3>
        <div className="flex gap-1">
          {(['7d', '30d', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                period === p
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-5 h-5 border-2 border-white/20 border-t-white rounded-full" />
          </div>
        ) : error ? (
          <div className="text-sm text-red-400 text-center py-4">{error}</div>
        ) : data ? (
          <div className="space-y-4">
            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/[0.04] rounded-lg p-3">
                <div className="text-2xl font-semibold text-white">{data.totalViews}</div>
                <div className="text-xs text-white/50">Total Views</div>
              </div>
              <div className="bg-white/[0.04] rounded-lg p-3">
                <div className="text-2xl font-semibold text-white">{data.uniqueVisitors}</div>
                <div className="text-xs text-white/50">Unique Visitors</div>
              </div>
            </div>

            {/* Simple Bar Chart */}
            {data.dailyViews.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs text-white/50">Views by Day</div>
                <div className="flex items-end gap-1 h-24">
                  {data.dailyViews.slice(-14).map((day, i) => (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-blue-500/80 rounded-t transition-all duration-300 hover:bg-blue-400"
                        style={{
                          height: `${Math.max(4, (day.views / maxViews) * 100)}%`,
                        }}
                        title={`${formatDate(day.date)}: ${day.views} views`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-white/40">
                  <span>{data.dailyViews.length > 0 ? formatDate(data.dailyViews[Math.max(0, data.dailyViews.length - 14)].date) : ''}</span>
                  <span>{data.dailyViews.length > 0 ? formatDate(data.dailyViews[data.dailyViews.length - 1].date) : ''}</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-white/40 text-center py-4">
                No views yet
              </div>
            )}

            {/* Device Breakdown */}
            {Object.keys(data.deviceBreakdown).length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-white/50">Devices</div>
                <div className="flex gap-3">
                  {Object.entries(data.deviceBreakdown).map(([device, count]) => {
                    const percentage = Math.round((count / data.totalViews) * 100);
                    return (
                      <div key={device} className="flex items-center gap-2 text-xs">
                        <span className="capitalize text-white/70">{device}</span>
                        <span className="text-white/40">{percentage}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top Referrers */}
            {data.topReferrers.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-white/50">Top Sources</div>
                <div className="space-y-1">
                  {data.topReferrers.slice(0, 3).map((ref) => (
                    <div key={ref.domain} className="flex items-center justify-between text-xs">
                      <span className="text-white/70 truncate">{ref.domain}</span>
                      <span className="text-white/40">{ref.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
