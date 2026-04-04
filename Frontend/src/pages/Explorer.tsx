import { API_BASE_URL, BACKEND_URL } from '../config/api';
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Filter, Download, Eye, CheckCircle, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Invoice {
  id: string;
  invoiceNo: string;
  vendor: string;
  date: string;
  amount: string;
  gstinVendor: string;
  gstinCompany: string;
  accuracy: number;
  riskScore: number;
  flags: string[];
  status: "compliant" | "warning" | "error";
}


const Explorer = () => {
  const [searchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [vendorFilter, setVendorFilter] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/invoices/history`);
      const data = await response.json();

      if (data.success && data.invoices) {
        // Transform backend data to frontend format
        const transformedInvoices = data.invoices.map((invoice: any) => {
          // Determine status based on compliance and anomalies
          let status: Invoice['status'] = 'compliant';
          const flags: string[] = [];

          // Check for missing invoice number
          const invoiceNumber = invoice.invoiceNumber || invoice.invoice_number || '';
          if (!invoiceNumber || invoiceNumber === 'Unknown' || invoiceNumber === 'N/A') {
            flags.push('Missing Invoice #');
            status = 'warning';
          }

          // Check for missing date
          const invoiceDate = invoice.invoiceDate || invoice.invoice_date || '';
          if (!invoiceDate || invoiceDate === 'Unknown' || invoiceDate === 'N/A') {
            flags.push('Missing Date');
            status = 'warning';
          }

          // Check for missing or invalid GST
          const gstNumbers = invoice.allGstNumbers || invoice.gst_numbers || invoice.gstNumber;
          if (!gstNumbers || gstNumbers.length === 0 || gstNumbers[0] === 'N/A') {
            flags.push('Missing GST');
            status = 'error';
          }

          // Check GST verification status
          const gstVerification = invoice.gstVerification || invoice.gst_verification;
          if (gstVerification && gstVerification.length > 0) {
            const gstVerif = gstVerification[0];
            if (gstVerif.success === false || gstVerif.is_valid === false) {
              flags.push('GST Not Found');
              status = 'error';
            } else if (gstVerif.success && !gstVerif.is_active) {
              flags.push('Inactive GST');
              status = 'warning';
            }
            // Check vendor name mismatch
            if (gstVerif.vendor_name_match && gstVerif.vendor_name_match.match === false) {
              flags.push('Name Mismatch');
              status = 'warning';
            }
          }

          // Check for missing HSN
          const hsnNumber = invoice.hsnNumber || invoice.hsn_number || '';
          const hsnCodes = invoice.hsnSacCodes || invoice.hsn_sac_codes || [];
          if ((!hsnNumber || hsnNumber === 'Unknown') && hsnCodes.length === 0) {
            flags.push('Missing HSN');
            if (status === 'compliant') status = 'warning';
          }

          // Check for anomalies from DB
          if (invoice.anomalies && invoice.anomalies.length > 0) {
            invoice.anomalies.forEach((anomaly: any) => {
              const type = anomaly.anomaly_type || anomaly.anomalyType;
              if (type === 'DUPLICATE_INVOICE' && !flags.includes('Duplicate')) flags.push('Duplicate');
              if (type === 'INVALID_GST' && !flags.includes('GST Not Found')) flags.push('Invalid GST');
              if (type === 'MISSING_GST' && !flags.includes('Missing GST')) flags.push('Missing GST');
              if (type === 'GST_VENDOR_MISMATCH' && !flags.includes('Name Mismatch')) flags.push('GST Mismatch');
              if (type === 'INVALID_HSN_SAC') flags.push('Invalid HSN');
              if (type === 'HSN_GST_RATE_MISMATCH') flags.push('Rate Mismatch');
              if (type === 'UNUSUAL_AMOUNT') flags.push('Price Outlier');
              if (type === 'HSN_PRICE_DEVIATION') flags.push('HSN Mismatch');
            });
            if (flags.length > 0 && status === 'compliant') status = 'warning';
          }

          // Determine status based on compliance and anomalies
          const complianceResults = invoice.complianceResults || invoice.compliance_results;
          if (complianceResults) {
            const complianceScore = complianceResults.compliance_score || 0;
            if (complianceScore < 50) {
              status = 'error';
            } else if (complianceScore < 80) {
              status = 'warning';
            }
          }

          return {
            id: invoice._id || invoice.id,
            invoiceNo: invoice.invoiceNumber || invoice.invoice_number || 'N/A',
            vendor: invoice.vendorName || invoice.vendor_name || 'Unknown',
            date: invoice.invoiceDate || invoice.invoice_date || 'N/A',
            amount: `₹${(invoice.totalAmount || invoice.total_amount || 0).toLocaleString('en-IN')}`,
            gstinVendor: invoice.allGstNumbers?.[0] || invoice.gst_numbers?.[0] || invoice.gstNumber || 'N/A',
            gstinCompany: 'N/A',
            accuracy: invoice.ocrConfidence || invoice.ocr_confidence || 0,
            riskScore: invoice.complianceResults?.risk_score || invoice.compliance_results?.risk_score || 0,
            flags,
            status,
            _rawDate: invoice.uploadDate || invoice.invoiceDate || invoice.invoice_date || '',
            _rawAmount: invoice.totalAmount || invoice.total_amount || 0,
          };
        });

        setInvoices(transformedInvoices);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: Invoice["status"]) => {
    const variants = {
      compliant: { variant: "default" as const, label: "Compliant", icon: CheckCircle },
      warning: { variant: "secondary" as const, label: "Warning", icon: AlertTriangle },
      error: { variant: "destructive" as const, label: "Error", icon: XCircle },
    };
    const config = variants[status];
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getRiskColor = (score: number) => {
    if (score < 0.3) return "text-success";
    if (score < 0.6) return "text-warning";
    return "text-destructive";
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading invoices...</span>
        </div>
      </DashboardLayout>
    );
  }

  const filteredInvoices = invoices.filter((invoice: any) => {
    // Search filter — matches invoice number, vendor, or GST
    const matchesSearch = searchQuery === "" ||
      invoice.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.gstinVendor.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;

    // Date range filter
    let matchesDate = true;
    if (dateRange !== "all" && invoice._rawDate) {
      const days = parseInt(dateRange);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const invoiceDate = new Date(invoice._rawDate);
      matchesDate = invoiceDate >= cutoff;
    }

    // Vendor filter (from More Filters)
    const matchesVendor = vendorFilter === "" ||
      invoice.vendor.toLowerCase().includes(vendorFilter.toLowerCase());

    // Amount filter (from More Filters)
    let matchesAmount = true;
    if (amountMin !== "") {
      matchesAmount = matchesAmount && invoice._rawAmount >= parseFloat(amountMin);
    }
    if (amountMax !== "") {
      matchesAmount = matchesAmount && invoice._rawAmount <= parseFloat(amountMax);
    }

    return matchesSearch && matchesStatus && matchesDate && matchesVendor && matchesAmount;
  });

  // Get unique vendors for filter suggestions
  const uniqueVendors = [...new Set(invoices.map(inv => inv.vendor))].filter(v => v !== 'Unknown');

  const exportToExcel = async () => {
    try {
      const XLSX = await import('xlsx');

      const exportData = filteredInvoices.map(inv => ({
        'Invoice No': inv.invoiceNo,
        'Vendor': inv.vendor,
        'Date': inv.date,
        'Amount': inv.amount,
        'Vendor GSTIN': inv.gstinVendor,
        'Status': inv.status,
        'Issues': inv.flags.join(', ') || 'None',
        'Risk Score': inv.riskScore,
        'Accuracy': `${inv.accuracy}%`
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Invoices');

      const fileName = `invoice_explorer_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDateRange("all");
    setVendorFilter("");
    setAmountMin("");
    setAmountMax("");
  };

  const hasActiveFilters = searchQuery !== "" || statusFilter !== "all" || dateRange !== "all" || vendorFilter !== "" || amountMin !== "" || amountMax !== "";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Invoice Explorer</h1>
            <p className="text-muted-foreground">
              Search, filter, and manage all processed invoices with compliance issues
            </p>
          </div>
          <Button className="gap-2" onClick={exportToExcel}>
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="compliant">Compliant</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="180">Last 6 months</SelectItem>
                <SelectItem value="365">Last 1 year</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={showMoreFilters ? "default" : "outline"}
              className="gap-2"
              onClick={() => setShowMoreFilters(!showMoreFilters)}
            >
              <Filter className="h-4 w-4" />
              More Filters
            </Button>
          </div>

          {/* More Filters Panel */}
          {showMoreFilters && (
            <div className="mt-4 pt-4 border-t grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Vendor Name</label>
                <Input
                  placeholder="Filter by vendor..."
                  value={vendorFilter}
                  onChange={(e) => setVendorFilter(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Min Amount (₹)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Max Amount (₹)</label>
                <Input
                  type="number"
                  placeholder="No limit"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Active filters & result count */}
          <div className="flex items-center justify-between mt-3">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredInvoices.length}</span> of {invoices.length} invoices
            </p>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={clearAllFilters}>
                Clear all filters
              </Button>
            )}
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Invoice No</TableHead>
                <TableHead className="font-semibold">Vendor</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold text-right">Amount</TableHead>
                <TableHead className="font-semibold">GSTIN</TableHead>
                <TableHead className="font-semibold">Issues / Flags</TableHead>
                <TableHead className="font-semibold text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow 
                  key={invoice.id} 
                  className={`cursor-pointer hover:bg-muted/50 transition-colors border-l-4 ${
                    invoice.status === 'error' ? 'border-l-red-400' : 
                    invoice.status === 'warning' ? 'border-l-amber-400' : 
                    'border-l-emerald-400'
                  }`}
                >
                  <TableCell>
                    <div className={`flex items-center gap-2`}>
                      <div className={`h-2.5 w-2.5 rounded-full ${
                        invoice.status === 'error' ? 'bg-red-500' : 
                        invoice.status === 'warning' ? 'bg-amber-500' : 
                        'bg-emerald-500'
                      }`} />
                      <span className={`text-xs font-medium capitalize ${
                        invoice.status === 'error' ? 'text-red-600' : 
                        invoice.status === 'warning' ? 'text-amber-600' : 
                        'text-emerald-600'
                      }`}>
                        {invoice.status === 'error' ? 'Error' : invoice.status === 'warning' ? 'Warning' : 'Clean'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{invoice.invoiceNo}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{invoice.vendor}</TableCell>
                  <TableCell className="text-muted-foreground">{invoice.date}</TableCell>
                  <TableCell className="font-semibold text-right">{invoice.amount}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{invoice.gstinVendor}</code>
                  </TableCell>
                  <TableCell>
                    {invoice.flags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {invoice.flags.map((flag, idx) => {
                          // Color-code by severity
                          const isError = ['Missing GST', 'GST Not Found', 'Invalid GST', 'Inactive GST', 'Name Mismatch'].includes(flag);
                          const isDuplicate = flag === 'Duplicate';
                          return (
                            <Badge 
                              key={idx} 
                              variant="secondary"
                              className={`text-xs font-medium ${
                                isDuplicate ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                                isError ? 'bg-red-50 text-red-600 border border-red-200' :
                                'bg-amber-50 text-amber-600 border border-amber-200'
                              }`}
                            >
                              {isError ? '⚠' : isDuplicate ? '🔁' : '⚡'} {flag}
                            </Badge>
                          );
                        })}
                      </div>
                    ) : (
                      <Badge variant="secondary" className="text-xs gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle className="h-3 w-3" />
                        Compliant
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Invoice Details</SheetTitle>
            <SheetDescription>
              {selectedInvoice?.invoiceNo} • {selectedInvoice?.vendor}
            </SheetDescription>
          </SheetHeader>

          {selectedInvoice && (
            <Tabs defaultValue="extracted" className="mt-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="extracted">Extracted Data</TabsTrigger>
                <TabsTrigger value="compliance">Compliance</TabsTrigger>
                <TabsTrigger value="audit">Audit Trail</TabsTrigger>
              </TabsList>

              <TabsContent value="extracted" className="space-y-4 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Invoice Number</p>
                    <p className="font-medium">{selectedInvoice.invoiceNo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Invoice Date</p>
                    <p className="font-medium">{selectedInvoice.date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Invoice Amount</p>
                    <p className="font-medium text-lg">{selectedInvoice.amount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Extraction Accuracy</p>
                    <p className="font-medium">{selectedInvoice.accuracy}%</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground mb-1">Vendor GSTIN</p>
                    <p className="font-mono text-sm">{selectedInvoice.gstinVendor}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground mb-1">Company GSTIN</p>
                    <p className="font-mono text-sm">{selectedInvoice.gstinCompany}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="compliance" className="space-y-4 mt-6">
                {selectedInvoice.flags.map((flag, index) => (
                  <Card key={index} className="p-4 border-l-4 border-l-warning">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                      <div>
                        <h4 className="font-semibold mb-1">{flag}</h4>
                        <p className="text-sm text-muted-foreground">
                          This invoice has been flagged for manual review
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
                {selectedInvoice.flags.length === 0 && (
                  <Card className="p-6 border-l-4 border-l-success">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-6 w-6 text-success" />
                      <p className="font-medium">All compliance checks passed</p>
                    </div>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="audit" className="space-y-3 mt-6">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-2 bg-success rounded-full" />
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium mb-1">File Uploaded</p>
                      <p className="text-xs text-muted-foreground">by Finance Team • 10:20 AM</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-2 bg-primary rounded-full" />
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium mb-1">Data Extracted</p>
                      <p className="text-xs text-muted-foreground">Accuracy: {selectedInvoice.accuracy}% • 10:21 AM</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-2 bg-primary rounded-full" />
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium mb-1">GST Validated</p>
                      <p className="text-xs text-muted-foreground">10:22 AM</p>
                    </div>
                  </div>
                  {selectedInvoice.flags.length > 0 && (
                    <div className="flex gap-3">
                      <div className="w-2 bg-warning rounded-full" />
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-1">Anomalies Detected</p>
                        <p className="text-xs text-muted-foreground">10:23 AM</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
};

export default Explorer;
