import { useState, useEffect, useContext } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/ui/stat-card";
import { API_BASE_URL } from "@/config/api";
import { AuthContext } from "@/context/AuthContext";
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
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

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
  amount?: number;
  riskScore?: number;
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
  const [trendDays, setTrendDays] = useState<number>(30);
  const [activeTrendMetric, setActiveTrendMetric] = useState<'total' | 'duplicates' | 'invalidGst' | 'missingGst'>('total');

  // Load anomaly trends from backend
  const loadAnomalyTrends = async (days: number = trendDays) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/anomaly-trends?days=${days}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      if (data.success && data.trends && data.trends.length > 0) {
        setAnomalyTrends(data.trends.map((trend: any) => ({
          date: new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          duplicates: trend.duplicates || 0,
          invalidGst: trend.invalidGst || 0,
          missingGst: trend.missingGst || 0,
          total: trend.total || 0,
        })));
      } else {
        setAnomalyTrends([]);
      }
    } catch (error) {
      console.error('Failed to load anomaly trends:', error);
      setAnomalyTrends([]);
    }
  };

  const handleFilterChange = (days: number) => {
    setTrendDays(days);
    loadAnomalyTrends(days);
  };

  useEffect(() => {
    loadDashboardStats();
    loadAnomalyCounts();
    loadRecentActivities();
    loadAnomalyTrends(trendDays);
    const interval = setInterval(() => {
      loadDashboardStats();
      loadAnomalyCounts();
      loadRecentActivities();
      loadAnomalyTrends(trendDays);
    }, 30000);
    return () => clearInterval(interval);
  }, [trendDays]);

  const loadDashboardStats = async (retryCount = 0) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/stats`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.success && data.stats) {
        setStats({
          totalInvoices: data.stats.totalInvoices || 0,
          totalVendors: data.stats.totalVendors || 0,
          totalAnomalies: data.stats.totalAnomalies || 0,
          highSeverityAnomalies: data.stats.highSeverityAnomalies || 0,
          totalAmountProcessed: data.stats.totalAmountProcessed || 0,
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
      if (retryCount < 2) setTimeout(() => loadDashboardStats(retryCount + 1), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnomalyCounts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/anomalies`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.success && data.anomalies) {
        setAnomalyCounts({
          duplicates: data.anomalies.filter((a: any) => a.anomalyType === 'DUPLICATE_INVOICE').length,
          invalidGst: data.anomalies.filter((a: any) => ['INVALID_GST', 'MISSING_GST', 'GST_VENDOR_MISMATCH'].includes(a.anomalyType)).length,
          priceAnomalies: data.anomalies.filter((a: any) => ['UNUSUAL_AMOUNT', 'HSN_PRICE_DEVIATION', 'INVALID_HSN_SAC', 'HSN_GST_RATE_MISMATCH'].includes(a.anomalyType)).length,
        });
      }
    } catch (error) {
      console.error('Failed to load anomaly counts:', error);
    }
  };

  const loadRecentActivities = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/invoices/history?limit=10');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.success && data.invoices) {
        setRecentActivities(data.invoices.map((inv: any) => ({
            id: inv._id || inv.id,
            type: inv.anomalies?.length > 0 ? 'anomaly' : (inv.gstVerification?.[0]?.is_active ? 'verified' : 'upload'),
            message: inv.anomalies?.length > 0 ? `Anomaly in ${inv.invoiceNumber || inv.invoice_number}` : `Invoice ${inv.invoiceNumber || inv.invoice_number} processed`,
            timestamp: inv.uploadDate || inv.upload_date || new Date().toISOString(),
            invoiceNo: inv.invoiceNumber || inv.invoice_number,
            vendor: inv.vendorName || inv.vendor_name,
            amount: inv.totalAmount || 0,
            riskScore: inv.riskScore || 0,
        })).slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to load recent activities:', error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12 mt-4">
        <div className="grid gap-6 md:grid-cols-3">
          <StatCard title="Total Invoices Processed" value={isLoading ? "..." : stats.totalInvoices.toLocaleString()} icon={FileText} className="border border-[var(--border)]" />
          <StatCard title="Anomalies Detected" value={isLoading ? "..." : stats.totalAnomalies.toString()} icon={AlertTriangle} variant="warning" className="border border-[var(--border)]" />
          <StatCard title="Active Vendors" value={isLoading ? "..." : stats.totalVendors.toLocaleString()} icon={Users} className="border border-[var(--border)]" />
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="col-span-12 lg:col-span-5 p-6 flex flex-col justify-between rounded-[24px] shadow-sm bg-white dark:bg-[var(--bg-surface)] border border-[var(--border)]">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4">Anomaly Categories</h3>
            <div className="flex-1 flex flex-col sm:flex-row items-center justify-between">
              <div className="w-full sm:w-[55%] h-[240px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[{ name: 'Invalid GST', value: anomalyCounts.invalidGst || 0, color: '#1A2035' },{ name: 'HSN Mismatches', value: anomalyCounts.priceAnomalies || 0, color: '#4361EE' },{ name: 'Duplicates', value: anomalyCounts.duplicates || 0, color: '#94A3B8' }]} cx="50%" cy="50%" innerRadius={70} outerRadius={95} dataKey="value" stroke="none" paddingAngle={4} cornerRadius={6}>
                      {[{ name: 'Invalid GST', color: '#1A2035' },{ name: 'HSN Mismatches', color: '#4361EE' },{ name: 'Duplicates', color: '#94A3B8' }].map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-3xl font-extrabold text-gray-900 dark:text-white leading-none mb-1">{anomalyCounts.invalidGst + anomalyCounts.priceAnomalies + anomalyCounts.duplicates || 0}</span>
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total</span>
                </div>
              </div>
              <div className="w-full sm:w-[40%] flex flex-col gap-5 px-4 mt-6 sm:mt-0">
                {[{ label: 'Invalid GST', color: '#1A2035', value: anomalyCounts.invalidGst },{ label: 'HSN Issues', color: '#4361EE', value: anomalyCounts.priceAnomalies },{ label: 'Duplicates', color: '#94A3B8', value: anomalyCounts.duplicates }].map(item => (
                  <div key={item.label} className="flex flex-col">
                    <span className="text-xs font-medium text-gray-400 mb-1">{item.label}</span>
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                       <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{item.value || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="col-span-12 lg:col-span-7 p-6 flex flex-col justify-between rounded-[24px] shadow-sm bg-white dark:bg-[var(--bg-surface)] border border-[var(--border)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col">
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">Anomaly Trends</h3>
                <span className="text-[10px] text-gray-400 capitalize font-medium">{activeTrendMetric === 'total' ? 'Overall Productivity' : activeTrendMetric.replace(/([A-Z])/g, ' $1')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {[7, 30].map(d => <button key={d} onClick={() => handleFilterChange(d)} className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-all ${trendDays === d ? 'bg-[#4361EE] text-white shadow-sm' : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-gray-700'}`}>{d === 30 ? '1M' : `${d}D`}</button>)}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><button className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"><MoreHorizontal className="w-4 h-4 text-gray-400" /></button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl"><DropdownMenuItem className="text-xs cursor-pointer" onClick={() => setActiveTrendMetric('total')}>All Trends</DropdownMenuItem><DropdownMenuItem className="text-xs cursor-pointer" onClick={() => setActiveTrendMetric('duplicates')}>Duplicates</DropdownMenuItem><DropdownMenuItem className="text-xs cursor-pointer" onClick={() => setActiveTrendMetric('invalidGst')}>Invalid GST</DropdownMenuItem><DropdownMenuItem className="text-xs cursor-pointer" onClick={() => setActiveTrendMetric('missingGst')}>Missing GST</DropdownMenuItem></DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="flex-1 h-[260px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={anomalyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDuplicates" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#94A3B8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorInvalidGST" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1A2035" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#1A2035" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorMissingGST" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4361EE" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4361EE" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.1)" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#A0AEC0', fontSize: 10 }} 
                    dy={10} 
                    interval={Math.max(0, Math.floor(anomalyTrends.length / 8))}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#A0AEC0', fontSize: 10 }} dx={-5} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }} />
                  <Area 
                    type="monotone" 
                    dataKey="duplicates" 
                    name="Duplicates"
                    stroke="#94A3B8" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorDuplicates)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="invalidGst" 
                    name="Invalid GST"
                    stroke="#1A2035" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorInvalidGST)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="missingGst" 
                    name="Missing GST"
                    stroke="#4361EE" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorMissingGST)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <Card className="rounded-[24px] shadow-sm bg-white dark:bg-[var(--bg-surface)] border border-[var(--border)] overflow-hidden text-[var(--text-primary)]">
          <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center"><h3 className="text-base font-bold">Audit Logs</h3><Clock className="w-4 h-4 text-gray-400" /></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[800px]">
              <thead><tr className="bg-gray-50/50 dark:bg-white/5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider"><th className="px-6 py-4">Invoice ID</th><th className="px-6 py-4">Vendor</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4 text-right">Time</th></tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {recentActivities.map(activity => (
                  <tr key={activity.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold">{activity.invoiceNo || `#${activity.id.slice(-6)}`}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{activity.vendor || '-'}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-800 dark:text-gray-100">₹{(activity.amount || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-400 text-right">{new Date(activity.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
