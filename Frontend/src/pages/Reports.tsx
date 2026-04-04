import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Download, Calendar, TrendingUp, CheckCircle, Mail } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Report {
  id: string;
  title: string;
  description: string;
  type: "summary" | "detailed" | "audit";
  date: string;
  status: "completed" | "generating" | "ready";
}

const Reports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalAnomalies: 0,
    highSeverityAnomalies: 0,
    totalVendors: 0,
    totalAmountProcessed: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [emailRecipient, setEmailRecipient] = useState('');

  useEffect(() => {
    loadStats();
    generateDynamicReports();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/dashboard/stats');
      if (!response.ok) throw new Error('Failed to load stats');
      const data = await response.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateDynamicReports = async () => {
    try {
      // Fetch real data from APIs
      const [invoicesRes, anomaliesRes, vendorsRes] = await Promise.all([
        fetch('http://localhost:8000/api/invoices/history'),
        fetch('http://localhost:8000/api/anomalies'),
        fetch('http://localhost:8000/api/vendors')
      ]);

      const invoicesData = await invoicesRes.json();
      const anomaliesData = await anomaliesRes.json();
      const vendorsData = await vendorsRes.json();

      const now = new Date();
      const currentMonth = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      const currentWeek = 'This Week';

      // Generate dynamic reports based on real data
      const dynamicReports: Report[] = [];

      // 1. Monthly Compliance Summary
      if (invoicesData.success && invoicesData.invoices.length > 0) {
        dynamicReports.push({
          id: "monthly-compliance",
          title: `Monthly Compliance Summary - ${currentMonth}`,
          description: `Overview of ${invoicesData.invoices.length} invoices, compliance checks, and vendor risk scores`,
          type: "summary",
          date: now.toLocaleDateString('en-IN'),
          status: "ready",
        });
      }

      // 2. Anomaly Report - REMOVED

      // 3. Vendor Audit Trail
      if (vendorsData.success && vendorsData.vendors.length > 0) {
        dynamicReports.push({
          id: "vendor-audit",
          title: `Vendor Audit Trail - ${currentMonth}`,
          description: `Complete audit trail for ${vendorsData.vendors.length} vendors with transaction history`,
          type: "audit",
          date: now.toLocaleDateString('en-IN'),
          status: "ready",
        });
      }

      // 4. Weekly Compliance Report
      dynamicReports.push({
        id: "weekly-compliance",
        title: "Weekly Compliance Report",
        description: "Current week's compliance status and flagged invoices",
        type: "summary",
        date: "Just now",
        status: "ready",
      });

      console.log('📊 Generated dynamic reports:', dynamicReports.length, 'reports');
      setReports(dynamicReports);
    } catch (error) {
      console.error('❌ Failed to generate reports:', error);
      // Fallback to empty array
      setReports([]);
    }
  };
  const exportToExcel = async () => {
    try {
      // Fetch invoice history
      const response = await fetch('http://localhost:8000/api/invoices/history?limit=100');
      const data = await response.json();
      
      if (!data.success || !data.invoices) {
        toast.error('No data to export');
        return;
      }

      // Prepare data for Excel
      const excelData = data.invoices.map((inv: any) => ({
        'Invoice Number': inv.invoiceNumber,
        'Vendor Name': inv.vendorName,
        'Amount': inv.totalAmount,
        'Date': inv.invoiceDate,
        'GST Number': inv.gstNumber || 'N/A',
        'Upload Date': new Date(inv.uploadDate).toLocaleDateString('en-IN'),
        'OCR Confidence': `${inv.ocrConfidence}%`,
      }));

      // Create workbook
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Invoices');

      // Download
      XLSX.writeFile(wb, `FINTEL_AI_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel report downloaded successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  const exportToPDF = async (reportType?: string, reportTitle?: string) => {
    try {
      // Fetch data based on report type
      let data: any;
      let title = reportTitle || 'FINTEL AI - Invoice Report';
      
      if (reportType === 'anomaly') {
        // Anomaly Detection Report
        const response = await fetch('http://localhost:8000/api/anomalies');
        data = await response.json();
        
        if (!data.success || !data.anomalies) {
          toast.error('No anomaly data to export');
          return;
        }

        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('FINTEL AI - Anomaly Detection Report', 14, 20);
        doc.setFontSize(11);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 28);
        doc.text(`Total Anomalies: ${data.anomalies.length}`, 14, 34);

        const tableData = data.anomalies.map((anomaly: any) => [
          anomaly.invoiceNumber || 'N/A',
          anomaly.anomalyType,
          anomaly.severity,
          anomaly.description.substring(0, 50) + '...',
          new Date(anomaly.detectedAt).toLocaleDateString('en-IN'),
        ]);

        autoTable(doc, {
          head: [['Invoice #', 'Type', 'Severity', 'Description', 'Detected']],
          body: tableData,
          startY: 40,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [239, 68, 68] },
        });

        doc.save(`Anomaly_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        toast.success('Anomaly report downloaded!');
        
      } else if (reportType === 'vendor') {
        // Vendor Audit Trail
        const response = await fetch('http://localhost:8000/api/invoices/history?limit=100');
        data = await response.json();
        
        if (!data.success || !data.invoices) {
          toast.error('No data to export');
          return;
        }

        // Group by vendor
        const vendorMap = new Map();
        data.invoices.forEach((inv: any) => {
          const vendor = inv.vendorName;
          if (!vendorMap.has(vendor)) {
            vendorMap.set(vendor, { count: 0, total: 0, invoices: [] });
          }
          const vendorData = vendorMap.get(vendor);
          vendorData.count++;
          vendorData.total += inv.totalAmount;
          vendorData.invoices.push(inv);
        });

        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('FINTEL AI - Vendor Audit Trail', 14, 20);
        doc.setFontSize(11);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 28);
        doc.text(`Total Vendors: ${vendorMap.size}`, 14, 34);

        const tableData = Array.from(vendorMap.entries()).map(([vendor, data]: any) => [
          vendor,
          data.count,
          `₹${data.total.toLocaleString()}`,
          `₹${(data.total / data.count).toLocaleString()}`,
        ]);

        autoTable(doc, {
          head: [['Vendor Name', 'Invoices', 'Total Amount', 'Avg Amount']],
          body: tableData,
          startY: 40,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [34, 197, 94] },
        });

        doc.save(`Vendor_Audit_${new Date().toISOString().split('T')[0]}.pdf`);
        toast.success('Vendor audit report downloaded!');
        
      } else if (reportType === 'monthly') {
        // Monthly Compliance Summary
        const response = await fetch('http://localhost:8000/api/invoices/history?limit=100');
        data = await response.json();
        
        if (!data.success || !data.invoices) {
          toast.error('No data to export');
          return;
        }

        // Filter current month
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyInvoices = data.invoices.filter((inv: any) => {
          const invDate = new Date(inv.uploadDate);
          return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
        });

        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('FINTEL AI - Monthly Compliance Summary', 14, 20);
        doc.setFontSize(11);
        doc.text(`Month: ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`, 14, 28);
        doc.text(`Total Invoices: ${monthlyInvoices.length}`, 14, 34);

        const tableData = monthlyInvoices.map((inv: any) => [
          inv.invoiceNumber,
          inv.vendorName,
          `₹${inv.totalAmount.toLocaleString()}`,
          inv.gstNumber || 'Missing',
          new Date(inv.uploadDate).toLocaleDateString('en-IN'),
        ]);

        autoTable(doc, {
          head: [['Invoice #', 'Vendor', 'Amount', 'GST', 'Upload Date']],
          body: tableData,
          startY: 40,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [59, 130, 246] },
        });

        doc.save(`Monthly_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        toast.success('Monthly report downloaded!');
        
      } else {
        // Default: All Invoices Report
        const response = await fetch('http://localhost:8000/api/invoices/history?limit=100');
        data = await response.json();
        
        if (!data.success || !data.invoices) {
          toast.error('No data to export');
          return;
        }

        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(title, 14, 20);
        doc.setFontSize(11);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 28);
        doc.text(`Total Invoices: ${data.invoices.length}`, 14, 34);

        const tableData = data.invoices.map((inv: any) => [
          inv.invoiceNumber,
          inv.vendorName,
          `₹${inv.totalAmount.toLocaleString()}`,
          inv.invoiceDate,
          inv.gstNumber || 'N/A',
        ]);

        autoTable(doc, {
          head: [['Invoice #', 'Vendor', 'Amount', 'Date', 'GST']],
          body: tableData,
          startY: 40,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [59, 130, 246] },
        });

        doc.save(`FINTEL_AI_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        toast.success('PDF report downloaded successfully!');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  const handleDownload = (format: string, reportType?: string) => {
    if (format === 'xlsx') {
      exportToExcel();
    } else if (format === 'pdf') {
      exportToPDF(reportType);
    }
  };

  const sendReportByEmail = async (email?: string) => {
    const recipientEmail = email || emailRecipient;
    
    if (!recipientEmail || !recipientEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      const loadingToast = toast.loading('Sending report via email...');

      // Fetch anomaly counts
      const anomaliesRes = await fetch('http://localhost:8000/api/anomalies');
      const anomaliesData = await anomaliesRes.json();

      const anomalyCounts = {
        duplicates: 0,
        invalidGst: 0,
        gstMismatches: 0,
        missingGst: 0,
        total: 0
      };

      if (anomaliesData.success && anomaliesData.anomalies) {
        anomaliesData.anomalies.forEach((anomaly: any) => {
          if (anomaly.anomalyType === 'DUPLICATE_INVOICE') anomalyCounts.duplicates++;
          if (anomaly.anomalyType === 'INVALID_GST') anomalyCounts.invalidGst++;
          if (anomaly.anomalyType === 'MISSING_GST') anomalyCounts.missingGst++;
          if (anomaly.anomalyType === 'GST_VENDOR_MISMATCH') anomalyCounts.gstMismatches++;
        });
        anomalyCounts.total = anomaliesData.anomalies.length;
      }

      const reportData = {
        totalAnomalies: anomalyCounts.total,
        duplicates: anomalyCounts.duplicates,
        invalidGst: anomalyCounts.invalidGst,
        gstMismatches: anomalyCounts.gstMismatches,
        missingGst: anomalyCounts.missingGst,
        period: 'Current Status',
        invoiceCount: stats.totalInvoices
      };

      // Send email
      const response = await fetch('http://localhost:5000/api/email/send-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: recipientEmail,
          reportData: reportData
        })
      });

      const result = await response.json();

      toast.dismiss(loadingToast);

      if (result.success) {
        toast.success(`Report sent successfully to ${recipientEmail}!`);
        setEmailRecipient('');
      } else {
        toast.error('Failed to send email: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Email error:', error);
      toast.error('Failed to send email. Please try again.');
    }
  };

  const handleGenerate = async () => {
    try {
      // Show loading toast
      const loadingToast = toast.loading("Generating report...");
      
      // Simulate report generation (you can replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate a new report
      const newReport: Report = {
        id: `report-${Date.now()}`,
        title: `Compliance Report - ${new Date().toLocaleDateString()}`,
        type: "summary",
        date: new Date().toISOString().split('T')[0],
        status: "ready",
        description: `Generated compliance report with ${stats.totalInvoices} invoices and ${stats.totalAnomalies} anomalies detected.`,
      };
      
      // Add to reports list
      setReports(prev => [newReport, ...prev]);
      
      // Dismiss loading and show success
      toast.dismiss(loadingToast);
      toast.success("Report generated successfully!");
    } catch (error) {
      console.error('Report generation failed:', error);
      toast.error("Failed to generate report. Please try again.");
    }
  };

  const getReportIcon = (type: Report["type"]) => {
    return FileText;
  };

  const getTypeBadge = (type: Report["type"]) => {
    const labels = {
      summary: "Summary",
      detailed: "Detailed",
      audit: "Audit Trail",
    };
    return <Badge variant="outline">{labels[type]}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Reports & Analytics</h1>
            <p className="text-muted-foreground">
              Generate and download compliance reports for audit and analysis
            </p>
          </div>
        </div>

        {/* Email Report Section */}
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500 text-white">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Email Report</h3>
                <p className="text-sm text-muted-foreground">
                  Send the latest anomaly report to finance team
                </p>
              </div>
            </div>
            <Button 
              onClick={() => sendReportByEmail('parth.hindiya@gmail.com')}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <Mail className="h-5 w-5" />
              Send Report
            </Button>
          </div>
        </Card>

        {/* Generate New Report */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Generate New Report</h3>
          <div className="grid gap-4 md:grid-cols-5">
            <Select defaultValue="summary">
              <SelectTrigger>
                <SelectValue placeholder="Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="summary">Summary Report</SelectItem>
                <SelectItem value="detailed">Detailed Analysis</SelectItem>
                <SelectItem value="audit">Audit Trail</SelectItem>
                <SelectItem value="vendor">Vendor Report</SelectItem>
                <SelectItem value="anomaly">Anomaly Report</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="30">
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="all">
              <SelectTrigger>
                <SelectValue placeholder="Vendors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                <SelectItem value="high-risk">High Risk Only</SelectItem>
                <SelectItem value="select">Select Vendors</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="all">
              <SelectTrigger>
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="low">Low Risk</SelectItem>
              </SelectContent>
            </Select>

            <Button className="gap-2" onClick={handleGenerate}>
              <FileText className="h-4 w-4" />
              Generate Report
            </Button>
          </div>
        </Card>

        {/* Key Insights */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="p-6 border-l-4 border-l-primary">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Invoices Processed</p>
                <p className="text-2xl font-bold mb-1">{isLoading ? "..." : stats.totalInvoices}</p>
                <p className="text-xs text-muted-foreground">All time</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-l-warning">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-warning/10">
                <TrendingUp className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Amount Processed</p>
                <p className="text-2xl font-bold mb-1">{isLoading ? "..." : `₹${(stats.totalAmountProcessed / 100000).toFixed(2)}L`}</p>
                <p className="text-xs text-muted-foreground">All invoices combined</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-l-destructive">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-destructive/10">
                <CheckCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Anomalies Detected</p>
                <p className="text-2xl font-bold mb-1">{isLoading ? "..." : stats.totalAnomalies}</p>
                <p className="text-xs text-destructive">{stats.highSeverityAnomalies} high severity</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Reports */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">Recent Reports</h3>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading reports...
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No reports available. Upload invoices to generate reports.
              </div>
            ) : (
              reports.map((report) => {
              const Icon = getReportIcon(report.type);
              return (
                <div
                  key={report.id}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="p-3 rounded-lg bg-primary/10 flex-shrink-0">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{report.title}</h4>
                      {getTypeBadge(report.type)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {report.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Generated: {report.date}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {report.status === "generating" ? (
                      <Badge variant="secondary" className="animate-pulse">
                        Generating...
                      </Badge>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => {
                            const reportType = report.id.includes('anomaly') ? 'anomaly' 
                              : report.id.includes('vendor') ? 'vendor'
                              : report.id.includes('monthly') ? 'monthly'
                              : 'weekly';
                            handleDownload("pdf", reportType);
                          }}
                        >
                          <Download className="h-4 w-4" />
                          PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload("xlsx")}
                        >
                          XLSX
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => sendReportByEmail('parth.hindiya@gmail.com')}
                        >
                          <Mail className="h-4 w-4" />
                          Email
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
