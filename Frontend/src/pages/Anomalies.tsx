import { API_BASE_URL, BACKEND_URL } from '../config/api';
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, BadgeAlert, TrendingUp, Calculator, DollarSign, Shield, Loader2, Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Anomaly {
  id: string;
  type: "duplicate" | "gst" | "hsn" | "arithmetic" | "price";
  vendor: string;
  invoiceNo: string;
  severity: "high" | "medium" | "low";
  description: string;
  amount: string;
  date: string;
}

const Anomalies = () => {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewAnomaly, setReviewAnomaly] = useState<Anomaly | null>(null);

  useEffect(() => {
    fetchAnomalies();
  }, []);

  const dismissAnomaly = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/anomalies/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setAnomalies(prev => prev.filter(a => a.id !== id));
      }
    } catch (error) {
      console.error('Failed to dismiss anomaly:', error);
    }
  };

  const fetchAnomalies = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/anomalies`);
      const data = await response.json();
      
      if (data.success && data.anomalies) {
        // Transform backend data to frontend format
        const transformedAnomalies = data.anomalies.map((anomaly: any, index: number) => {
          let type: Anomaly['type'] = 'duplicate';
          let severity: Anomaly['severity'] = 'medium';
          
          // Map anomaly types (check both anomalyType and anomaly_type for compatibility)
          const anomalyType = anomaly.anomalyType || anomaly.anomaly_type;
          
          if (anomalyType === 'DUPLICATE_INVOICE') {
            type = 'duplicate';
            severity = 'high';
          } else if (anomalyType === 'INVALID_GST') {
            type = 'gst';
            severity = 'high';
          } else if (anomalyType === 'MISSING_GST') {
            type = 'gst';
            severity = 'high';
          } else if (anomalyType === 'GST_VENDOR_MISMATCH') {
            type = 'gst';
            severity = 'high';
          } else if (anomalyType === 'INVALID_HSN_SAC') {
            type = 'hsn';
            severity = 'high';
          } else if (anomalyType === 'HSN_GST_RATE_MISMATCH') {
            type = 'hsn';
            severity = 'high';
          } else if (anomalyType === 'UNUSUAL_AMOUNT') {
            type = 'price';
            severity = 'medium';
          } else if (anomalyType === 'HSN_PRICE_DEVIATION') {
            type = 'hsn';
            severity = 'medium';
          }
          
          return {
            id: anomaly._id || index.toString(),
            type,
            vendor: anomaly.vendor_name || anomaly.vendorName || 'Unknown',
            invoiceNo: anomaly.invoice_number || anomaly.invoiceNumber || 'N/A',
            severity,
            description: anomaly.description || anomaly.anomalyType || anomaly.anomaly_type,
            amount: `₹${(anomaly.amount || anomaly.totalAmount || 0).toLocaleString('en-IN')}`,
            date: anomaly.invoiceDate 
              ? (typeof anomaly.invoiceDate === 'string' && anomaly.invoiceDate.includes('T') 
                ? new Date(anomaly.invoiceDate).toLocaleDateString('en-IN') 
                : anomaly.invoiceDate)
              : anomaly.detectedDate 
                ? new Date(anomaly.detectedDate).toLocaleDateString('en-IN') 
                : 'N/A',
          };
        });
        
        setAnomalies(transformedAnomalies);
      }
    } catch (error) {
      console.error('Error fetching anomalies:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const getAnomalyIcon = (type: Anomaly["type"]) => {
    const icons = {
      duplicate: Copy,
      gst: BadgeAlert,
      hsn: Shield,
      arithmetic: Calculator,
      price: DollarSign,
    };
    return icons[type];
  };

  const getAnomalyLabel = (type: Anomaly["type"]) => {
    const labels = {
      duplicate: "Duplicate Invoice",
      gst: "Invalid GST",
      hsn: "HSN Mismatch",
      arithmetic: "Arithmetic Error",
      price: "Price Outlier",
    };
    return labels[type];
  };

  const getAnomalyColor = (type: Anomaly["type"]) => {
    const colors = {
      duplicate: "text-[var(--anomaly-duplicate)]",
      gst: "text-[var(--anomaly-gst)]",
      hsn: "text-[var(--anomaly-hsn)]",
      arithmetic: "text-[var(--anomaly-price)]",
      price: "text-[var(--anomaly-price)]",
    };
    return colors[type] || "text-primary";
  };

  const getSeverityBadge = (severity: Anomaly["severity"]) => {
    const variants = {
      high: "destructive" as const,
      medium: "secondary" as const,
      low: "outline" as const,
    };
    return (
      <Badge variant={variants[severity]}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const getAnomaliesByType = (type: Anomaly["type"]) => {
    return anomalies.filter((a) => a.type === type);
  };

  const anomalyStats = [
    { type: "gst" as const, count: anomalies.filter(a => a.type === "gst").length, label: "Invalid GST", color: "border-l-[var(--anomaly-gst)]", bgColor: "bg-[var(--anomaly-gst)]/10", iconColor: "text-[var(--anomaly-gst)]" },
    { type: "duplicate" as const, count: anomalies.filter(a => a.type === "duplicate").length, label: "Duplicates", color: "border-l-[var(--anomaly-duplicate)]", bgColor: "bg-[var(--anomaly-duplicate)]/10", iconColor: "text-[var(--anomaly-duplicate)]" },
    { type: "hsn" as const, count: anomalies.filter(a => a.type === "hsn").length, label: "HSN Mismatches", color: "border-l-[var(--anomaly-hsn)]", bgColor: "bg-[var(--anomaly-hsn)]/10", iconColor: "text-[var(--anomaly-hsn)]" },
    { type: "price" as const, count: anomalies.filter(a => a.type === "price").length, label: "Price Outliers", color: "border-l-[var(--anomaly-price)]", bgColor: "bg-[var(--anomaly-price)]/10", iconColor: "text-[var(--anomaly-price)]" },
  ];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading anomalies...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (anomalies.length === 0) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Anomaly & Compliance Center</h1>
            <p className="text-muted-foreground">
              Review and manage all flagged invoices requiring attention
            </p>
          </div>
          <Card className="p-12 border border-[var(--border)] rounded-[24px] bg-white/50 dark:bg-white/5 shadow-sm">
            <div className="text-center">
              <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Anomalies Detected</h3>
              <p className="text-muted-foreground">
                All invoices are compliant. Upload more invoices to detect anomalies.
              </p>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const exportAnomalies = async () => {
    try {
      const XLSX = await import('xlsx');
      
      const exportData = anomalies.map(anomaly => ({
        'Type': getAnomalyLabel(anomaly.type),
        'Vendor': anomaly.vendor,
        'Invoice No': anomaly.invoiceNo,
        'Description': anomaly.description,
        'Amount': anomaly.amount,
        'Date': anomaly.date
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Anomalies');
      
      const fileName = `anomalies_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Anomaly & Compliance Center</h1>
            <p className="text-muted-foreground">
              Review and manage all flagged invoices requiring attention
            </p>
          </div>
          <Button className="gap-2" onClick={exportAnomalies}>
            <Download className="h-4 w-4" />
            Export Anomalies
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          {anomalyStats.map((stat) => {
            const Icon = getAnomalyIcon(stat.type);
            return (
              <Card key={stat.type} className={`p-6 border border-[var(--border)] border-l-4 ${stat.color} hover:shadow-lg transition-all rounded-[24px] bg-white/50 dark:bg-white/5 shadow-sm`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.count}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Vendor Risk Heatmap */}
        <Card className="p-6 border border-[var(--border)] rounded-[24px] bg-white/50 dark:bg-white/5 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Top Risky Vendors</h3>
          <div className="space-y-3">
            {(() => {
              // Group anomalies by vendor and count
              const vendorAnomalies = anomalies.reduce((acc: any, anomaly) => {
                const vendor = anomaly.vendor || 'Unknown';
                if (!acc[vendor]) {
                  acc[vendor] = { count: 0, highSeverity: 0 };
                }
                acc[vendor].count++;
                if (anomaly.severity === 'high') acc[vendor].highSeverity++;
                return acc;
              }, {});

              // Convert to array and sort by count
              const topVendors = Object.entries(vendorAnomalies)
                .map(([vendor, data]: [string, any]) => ({
                  vendor,
                  count: data.count,
                  risk: Math.min(0.95, (data.count * 0.15) + (data.highSeverity * 0.2))
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 3);

              if (topVendors.length === 0) {
                return <p className="text-muted-foreground text-center py-4">No risky vendors found</p>;
              }

              return topVendors.map((vendor, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{vendor.vendor}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${vendor.risk > 0.6 ? 'bg-destructive' : 'bg-warning'}`} 
                        style={{ width: `${vendor.risk * 100}%` }} 
                      />
                    </div>
                  </div>
                  <Badge variant={vendor.risk > 0.6 ? "destructive" : "secondary"}>
                    {vendor.count} Anomal{vendor.count === 1 ? 'y' : 'ies'}
                  </Badge>
                </div>
              ));
            })()}
          </div>
        </Card>

        {/* Anomalies by Type */}
        <Card className="p-6 border border-[var(--border)] rounded-[24px] bg-white/50 dark:bg-white/5 shadow-sm">
          <Tabs defaultValue="all">
            <TabsList className="mb-6">
              <TabsTrigger value="all">All Anomalies</TabsTrigger>
              <TabsTrigger value="duplicate">Duplicates</TabsTrigger>
              <TabsTrigger value="gst">Invalid GST</TabsTrigger>
              <TabsTrigger value="hsn">HSN Mismatch</TabsTrigger>
              <TabsTrigger value="price">Price Outliers</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anomalies.map((anomaly) => {
                    const Icon = getAnomalyIcon(anomaly.type);
                    return (
                      <TableRow key={anomaly.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${getAnomalyColor(anomaly.type)}`} />
                            <span className="text-sm">{getAnomalyLabel(anomaly.type)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{anomaly.vendor}</TableCell>
                        <TableCell>{anomaly.invoiceNo}</TableCell>
                        <TableCell className="max-w-xs truncate">{anomaly.description}</TableCell>
                        <TableCell className="font-semibold">{anomaly.amount}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{anomaly.date}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setReviewAnomaly(anomaly)}>Review</Button>
                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => dismissAnomaly(anomaly.id)}>Dismiss</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TabsContent>

            {["duplicate", "gst", "hsn", "price"].map((type) => (
              <TabsContent key={type} value={type}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Invoice No</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getAnomaliesByType(type as Anomaly["type"]).map((anomaly) => (
                      <TableRow key={anomaly.id}>
                        <TableCell className="font-medium">{anomaly.vendor}</TableCell>
                        <TableCell>{anomaly.invoiceNo}</TableCell>
                        <TableCell className="max-w-xs">{anomaly.description}</TableCell>
                        <TableCell className="font-semibold">{anomaly.amount}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{anomaly.date}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setReviewAnomaly(anomaly)}>Review</Button>
                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => dismissAnomaly(anomaly.id)}>Dismiss</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            ))}
          </Tabs>
        </Card>
      </div>

      {/* Review Dialog */}
      {reviewAnomaly && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setReviewAnomaly(null)}>
          <Card className="max-w-lg w-full p-6 space-y-4 border border-[var(--border)] rounded-[24px] bg-white dark:bg-[#1A1F2C] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Anomaly Review</h3>
              <Button size="sm" variant="ghost" onClick={() => setReviewAnomaly(null)}>✕</Button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{getAnomalyLabel(reviewAnomaly.type)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Severity</p>
                  {getSeverityBadge(reviewAnomaly.severity)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendor</p>
                  <p className="font-medium">{reviewAnomaly.vendor}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Invoice</p>
                  <p className="font-medium">{reviewAnomaly.invoiceNo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-semibold">{reviewAnomaly.amount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{reviewAnomaly.date}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="text-sm bg-muted p-3 rounded-lg">{reviewAnomaly.description}</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setReviewAnomaly(null)}>Close</Button>
              <Button variant="destructive" onClick={() => { dismissAnomaly(reviewAnomaly.id); setReviewAnomaly(null); }}>
                Dismiss Anomaly
              </Button>
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Anomalies;
