import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/ui/stat-card";
import {
  FileText,
  AlertTriangle,
  Users,
  Copy,
  BadgeAlert,
  TrendingUp,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

interface DashboardStats {
  totalInvoices: number;
  totalVendors: number;
  totalAnomalies: number;
  highSeverityAnomalies: number;
  totalAmountProcessed: number;
}

interface AnomalyCounts {
  duplicates: number;
  invalidGst: number;
  priceAnomalies: number;
}

interface AnomalyTrendData {
  date: string;
  duplicates: number;
  invalidGst: number;
  missingGst: number;
  total: number;
}

interface Activity {
  id: string;
  type: 'upload' | 'verified' | 'anomaly' | 'failed';
  message: string;
  timestamp: string;
  invoiceNo?: string;
  vendor?: string;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalInvoices: 0,
    totalVendors: 0,
    totalAnomalies: 0,
    highSeverityAnomalies: 0,
    totalAmountProcessed: 0,
  });
  const [anomalyCounts, setAnomalyCounts] = useState<AnomalyCounts>({
    duplicates: 0,
    invalidGst: 0,
    priceAnomalies: 0,
  });
  const [anomalyTrends, setAnomalyTrends] = useState<AnomalyTrendData[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trendDays, setTrendDays] = useState<number>(365);
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });

  // Load anomaly trends from backend
  const loadAnomalyTrends = async (days: number = trendDays) => {
    try {
      console.log(`Fetching anomaly trends for ${days} days...`);
      const response = await fetch(`http://localhost:8000/api/dashboard/anomaly-trends?days=${days}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Anomaly trends loaded:', data);

      if (data.success && data.trends && data.trends.length > 0) {
        // Format dates for display
        const formattedTrends = data.trends.map((trend: any) => ({
          date: new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          duplicates: trend.duplicates,
          invalidGst: trend.invalidGst || 0,
          missingGst: trend.missingGst || 0,
          total: trend.total,
        }));
        setAnomalyTrends(formattedTrends);
        console.log('Trends set successfully:', formattedTrends.length, 'data points');
      } else {
        console.warn('No trends data, setting empty array');
        setAnomalyTrends([]);
      }
    } catch (error) {
      console.error('Failed to load anomaly trends:', error);
      // Set empty array on error
      setAnomalyTrends([]);
    }
  };

  // Handle filter change
  const handleFilterChange = (days: number) => {
    setTrendDays(days);
    loadAnomalyTrends(days);
  };

  // Load dashboard stats from MongoDB
  useEffect(() => {
    loadDashboardStats();
    loadAnomalyCounts();
    loadRecentActivities();
    loadAnomalyTrends(trendDays);
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadDashboardStats();
      loadAnomalyCounts();
      loadRecentActivities();
      loadAnomalyTrends(trendDays); // Refresh with current filter
    }, 30000);
    return () => clearInterval(interval);
  }, [trendDays]); // Re-run when trendDays changes

  const loadDashboardStats = async (retryCount = 0) => {
    try {
      console.log('Fetching dashboard stats...');
      const response = await fetch('http://localhost:8000/api/dashboard/stats');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Dashboard stats loaded:', data);

      if (data.success && data.stats) {
        setStats({
          totalInvoices: data.stats.totalInvoices || 0,
          totalVendors: data.stats.totalVendors || 0,
          totalAnomalies: data.stats.totalAnomalies || 0,
          highSeverityAnomalies: data.stats.highSeverityAnomalies || 0,
          totalAmountProcessed: data.stats.totalAmountProcessed || 0,
        });
        console.log('Stats set successfully:', data.stats);
      } else {
        console.warn('No stats in response:', data);
      }
    } catch (error) {
      console.error('Failed to load dashboard stats (attempt ' + (retryCount + 1) + '):', error);
      // Retry once after 2 seconds
      if (retryCount < 2) {
        setTimeout(() => loadDashboardStats(retryCount + 1), 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnomalyCounts = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/anomalies');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Anomaly counts loaded:', data);

      if (data.success && data.anomalies) {
        const counts = {
          duplicates: data.anomalies.filter((a: any) => a.anomalyType === 'DUPLICATE_INVOICE').length,
          invalidGst: data.anomalies.filter((a: any) =>
            a.anomalyType === 'INVALID_GST' ||
            a.anomalyType === 'MISSING_GST' ||
            a.anomalyType === 'GST_VENDOR_MISMATCH'
          ).length,
          priceAnomalies: data.anomalies.filter((a: any) =>
            a.anomalyType === 'UNUSUAL_AMOUNT' ||
            a.anomalyType === 'HSN_PRICE_DEVIATION' ||
            a.anomalyType === 'INVALID_HSN_SAC' ||
            a.anomalyType === 'HSN_GST_RATE_MISMATCH'
          ).length,
        };
        setAnomalyCounts(counts);
      }
    } catch (error) {
      console.error('Failed to load anomaly counts:', error);
    }
  };

  const loadRecentActivities = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/invoices/history?limit=10');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (data.success && data.invoices) {
        const activities: Activity[] = data.invoices.map((inv: any) => {
          const hasAnomalies = inv.anomalies && inv.anomalies.length > 0;
          const gstVerified = inv.gstVerification && inv.gstVerification[0]?.is_active;

          let type: Activity['type'] = 'upload';
          let message = '';

          if (hasAnomalies) {
            type = 'anomaly';
            message = `Anomaly detected in invoice ${inv.invoiceNumber || inv.invoice_number}`;
          } else if (gstVerified) {
            type = 'verified';
            message = `Invoice ${inv.invoiceNumber || inv.invoice_number} verified successfully`;
          } else if (inv.gstVerification && inv.gstVerification[0]?.success === false) {
            type = 'failed';
            message = `GST verification failed for ${inv.invoiceNumber || inv.invoice_number}`;
          } else {
            type = 'upload';
            message = `New invoice ${inv.invoiceNumber || inv.invoice_number} uploaded`;
          }

          return {
            id: inv._id || inv.id,
            type,
            message,
            timestamp: inv.uploadDate || inv.upload_date || new Date().toISOString(),
            invoiceNo: inv.invoiceNumber || inv.invoice_number,
            vendor: inv.vendorName || inv.vendor_name,
          };
        }).slice(0, 5); // Only show last 5 activities

        setRecentActivities(activities);
      }
    } catch (error) {
      console.error('Failed to load recent activities:', error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Expense Anomaly & Compliance Overview
          </h1>
          <p className="text-muted-foreground">
            Powered by FINTEL AI — Your Financial Intelligence Agent
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Invoices Processed"
            value={isLoading ? "..." : stats.totalInvoices.toLocaleString()}
            icon={FileText}
            trend={{ value: 12.5, isPositive: true }}
          />
          <StatCard
            title="Anomalies Detected"
            value={isLoading ? "..." : stats.totalAnomalies.toString()}
            icon={AlertTriangle}
            variant="warning"
            trend={{ value: stats.highSeverityAnomalies, isPositive: false }}
          />
          <StatCard
            title="Active Vendors"
            value={isLoading ? "..." : stats.totalVendors.toLocaleString()}
            icon={Users}
            trend={{ value: 5.1, isPositive: true }}
          />
        </div>

        {/* Anomaly Distribution & Recent Activity - Side by Side */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Anomaly Trends - Left Side */}
          <Card className="p-6 relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Header with title + filter pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 relative z-10">
              <div>
                <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Anomaly Trends
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Anomaly detection activity over time</p>
              </div>
              <div className="flex gap-1 p-1 rounded-lg bg-muted/50 backdrop-blur-sm border border-border/50">
                {[
                  { label: '2D', value: 2 },
                  { label: '5D', value: 5 },
                  { label: '1W', value: 7 },
                  { label: '1M', value: 30 },
                  { label: 'All', value: 365 },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => handleFilterChange(filter.value)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-300 ${trendDays === filter.value
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>


            {/* Chart Area */}
            {isLoading ? (
              <div className="h-72 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground animate-pulse">Loading trends...</p>
                </div>
              </div>
            ) : anomalyTrends.length === 0 ? (
              <div className="h-72 flex flex-col items-center justify-center text-muted-foreground">
                <div className="p-4 rounded-2xl bg-muted/30 mb-4">
                  <TrendingUp className="h-12 w-12 opacity-20" />
                </div>
                <p className="text-sm font-medium">No data available</p>
                <p className="text-xs mt-1 opacity-60">Upload invoices to see anomaly trends</p>
              </div>
            ) : anomalyTrends.every(t => t.total === 0) ? (
              <div className="h-72 flex items-center justify-center">
                <div className="bg-emerald-500/10 backdrop-blur-sm px-5 py-3 rounded-2xl border border-emerald-500/20">
                  <p className="text-sm font-semibold text-emerald-600 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    No anomalies in last {trendDays === 365 ? 'year' : `${trendDays} ${trendDays === 1 ? 'day' : 'days'}`} — All Clear!
                  </p>
                </div>
              </div>
            ) : (() => {
              // Filter to only dates with anomalies for a clean chart
              const chartData = anomalyTrends
                .filter(t => t.total > 0)
                .map(t => ({
                  ...t,
                  label: new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                }));

              return (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        padding: '10px 14px',
                        fontSize: '13px',
                      }}
                      labelStyle={{ fontWeight: 600, color: '#374151', marginBottom: '4px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="duplicates"
                      stroke="#ef4444"
                      strokeWidth={3}
                      name="Duplicates"
                      dot={{ fill: '#ef4444', stroke: '#fff', strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7, stroke: '#ef4444', strokeWidth: 2, fill: '#fff' }}
                      animationDuration={1000}
                    />
                    <Line
                      type="monotone"
                      dataKey="invalidGst"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      name="Invalid GST"
                      dot={{ fill: '#f59e0b', stroke: '#fff', strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7, stroke: '#f59e0b', strokeWidth: 2, fill: '#fff' }}
                      animationDuration={1200}
                    />
                    <Line
                      type="monotone"
                      dataKey="missingGst"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      name="Missing GST"
                      dot={{ fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7, stroke: '#8b5cf6', strokeWidth: 2, fill: '#fff' }}
                      animationDuration={1400}
                    />
                  </LineChart>
                </ResponsiveContainer>
              );
            })()}

            {/* Legend */}
            {!isLoading && anomalyTrends.length > 0 && !anomalyTrends.every(t => t.total === 0) && (
              <div className="flex items-center justify-center gap-6 mt-3">
                {[
                  { label: 'Duplicates', color: '#ef4444' },
                  { label: 'Invalid GST', color: '#f59e0b' },
                  { label: 'Missing GST', color: '#8b5cf6' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className="w-3 h-[3px] rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Activity - Right Side */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-3 max-h-[350px] overflow-y-auto">
              {isLoading ? (
                <p className="text-center text-muted-foreground py-4">Loading activities...</p>
              ) : recentActivities.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No recent activities</p>
              ) : (
                recentActivities.map((activity) => {
                  const getActivityIcon = () => {
                    switch (activity.type) {
                      case 'upload':
                        return <Upload className="h-4 w-4 text-blue-500" />;
                      case 'verified':
                        return <CheckCircle className="h-4 w-4 text-green-500" />;
                      case 'anomaly':
                        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
                      case 'failed':
                        return <XCircle className="h-4 w-4 text-red-500" />;
                      default:
                        return <Clock className="h-4 w-4 text-gray-500" />;
                    }
                  };

                  const getActivityBadge = () => {
                    switch (activity.type) {
                      case 'upload':
                        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Uploaded</Badge>;
                      case 'verified':
                        return <Badge variant="default" className="bg-green-50 text-green-700 border-green-200 text-xs">Verified</Badge>;
                      case 'anomaly':
                        return <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">Anomaly</Badge>;
                      case 'failed':
                        return <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200 text-xs">Failed</Badge>;
                      default:
                        return <Badge variant="outline" className="text-xs">Unknown</Badge>;
                    }
                  };

                  const formatTime = (timestamp: string) => {
                    const date = new Date(timestamp);
                    const now = new Date();
                    const diffMs = now.getTime() - date.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    const diffDays = Math.floor(diffMs / 86400000);

                    if (diffMins < 1) return 'Just now';
                    if (diffMins < 60) return `${diffMins}m ago`;
                    if (diffHours < 24) return `${diffHours}h ago`;
                    if (diffDays < 7) return `${diffDays}d ago`;
                    return date.toLocaleDateString();
                  };

                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-border"
                    >
                      <div className="p-2 rounded-full bg-muted">
                        {getActivityIcon()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium">{activity.message}</p>
                          {getActivityBadge()}
                        </div>
                        {activity.vendor && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {activity.vendor}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTime(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Anomaly Categories */}
        <div>
          <h3 className="text-lg font-semibold mb-4">
            Anomaly Categories
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-6 border-l-4 border-l-destructive hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-destructive/10">
                  <Copy className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Duplicates Detected</h4>
                  <p className="text-2xl font-bold mb-1">{isLoading ? "..." : anomalyCounts.duplicates}</p>
                  <p className="text-sm text-muted-foreground">
                    Potential duplicate invoices
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-l-warning hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-warning/10">
                  <BadgeAlert className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">
                    Invalid GST Numbers
                  </h4>
                  <p className="text-2xl font-bold mb-1">{isLoading ? "..." : anomalyCounts.invalidGst}</p>
                  <p className="text-sm text-muted-foreground">
                    GST verification failed
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-l-warning hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-warning/10">
                  <TrendingUp className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">HSN/Price Anomalies</h4>
                  <p className="text-2xl font-bold mb-1">{isLoading ? "..." : anomalyCounts.priceAnomalies}</p>
                  <p className="text-sm text-muted-foreground">
                    HSN/SAC & price issues
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
