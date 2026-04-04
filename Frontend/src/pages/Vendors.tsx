import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";

interface Vendor {
  _id: string;
  gstNumber: string;
  vendorName: string;
  totalInvoices: number;
  totalAmount: number;
  firstInvoiceDate: string;
  lastInvoiceDate: string;
}

const Vendors = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVendors();
    // Refresh every 30 seconds
    const interval = setInterval(loadVendors, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadVendors = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/vendors');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Vendors loaded:', data);
      
      if (data.success && data.vendors) {
        setVendors(data.vendors);
      }
    } catch (error) {
      console.error('Failed to load vendors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalSpend = vendors.reduce((sum, v) => sum + v.totalAmount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Vendor Analytics</h1>
          <p className="text-muted-foreground">
            Monitor vendor performance, spending patterns, and compliance trends
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Total Vendors</p>
            <p className="text-3xl font-bold">{isLoading ? "..." : vendors.length}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Total Spend</p>
            <p className="text-3xl font-bold">{isLoading ? "..." : `₹${(totalSpend / 100000).toFixed(2)}L`}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Total Invoices</p>
            <p className="text-3xl font-bold">{isLoading ? "..." : vendors.reduce((sum, v) => sum + v.totalInvoices, 0)}</p>
          </Card>
        </div>

        {/* Spending Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">Vendor Spending Distribution</h3>
          {isLoading ? (
            <p className="text-center text-muted-foreground">Loading...</p>
          ) : vendors.length === 0 ? (
            <p className="text-center text-muted-foreground">No vendors yet</p>
          ) : (
            <div className="space-y-4">
              {vendors.map((vendor) => {
                const percentage = totalSpend > 0 ? Math.round((vendor.totalAmount / totalSpend) * 100) : 0;
                return (
                  <div key={vendor._id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{vendor.vendorName}</span>
                      <span className="text-muted-foreground">₹{vendor.totalAmount.toLocaleString()} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Vendor Table */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Vendor Performance</h3>
            <Button variant="outline">Export Report</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor Name</TableHead>
                <TableHead>GST Number</TableHead>
                <TableHead>Total Invoices</TableHead>
                <TableHead>Total Spend</TableHead>
                <TableHead>First Invoice</TableHead>
                <TableHead>Last Invoice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : vendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">No vendors yet. Upload invoices to see vendor data.</TableCell>
                </TableRow>
              ) : (
                vendors.map((vendor) => (
                  <TableRow key={vendor._id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{vendor.vendorName}</TableCell>
                    <TableCell className="font-mono text-xs">{vendor.gstNumber}</TableCell>
                    <TableCell>{vendor.totalInvoices}</TableCell>
                    <TableCell className="font-semibold">₹{vendor.totalAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{new Date(vendor.firstInvoiceDate).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell className="text-sm">{new Date(vendor.lastInvoiceDate).toLocaleDateString('en-IN')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Vendors;
