import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload as UploadIcon, FileText, CheckCircle, AlertCircle, Clock, Calendar, Receipt, Building2, IndianRupee, FileCheck, ShieldAlert, BadgeInfo, Percent, ShieldCheck, Flame, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface UploadedFile {
  id: string;
  name: string;
  uploadTime: string;
  uploadedAt?: string;
  status: "processing" | "completed" | "error";
  accuracy: number;
  progress: number;
  extractedData?: {
    // Basic extraction
    invoiceNumber: string;
    vendorName: string;
    invoiceAmount: number;
    invoiceDate: string;
    gstNumbers: string[];
    gstRate?: string;
    hsnNumber?: string;
    ocrConfidence: number;

    // Enhanced extraction
    hsnSacCodes?: string[];
    itemDescriptions?: string[];
    quantities?: number[];

    // Compliance scoring
    complianceScore?: number;
    complianceStatus?: string;
    checksPassedCount?: number;
    totalChecksCount?: number;
    riskScore?: number;
    riskLevel?: string;

    // Validation results
    gstValidations?: Array<{ valid: boolean, status: string }>;
    hsnValidations?: Array<{ is_correct: boolean, hsn_code: string }>;
    duplicateCheck?: Array<any>;
    arithmeticCheck?: { overall_accurate: boolean };
    priceAnalysis?: Array<{
      item: string;
      billed_price: number;
      variance_percent: number;
      is_outlier: boolean;
    }>;

    // GST Verification (Government API)
    gstVerification?: Array<{
      success: boolean;
      is_valid: boolean;
      is_active: boolean;
      gst_number: string;
      legal_name?: string;
      trade_name?: string;
      status?: string;
      error?: string;
      vendor_name_match?: { match: boolean; matched_with?: string; reason?: string };
    }>;

    // ML results
    mlPrediction?: {
      is_anomaly: boolean;
      confidence: number;
    };

    // Anomalies summary
    anomaliesDetected?: string[];
  };
  error?: string;
}

const Upload = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);

  // Load past invoices from MongoDB on component mount
  useEffect(() => {
    loadInvoiceHistory();
  }, []);

  const loadInvoiceHistory = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/invoices/history?limit=20');
      const data = await response.json();

      if (data.success && data.invoices) {
        const historicalFiles: UploadedFile[] = data.invoices.map((inv: any) => ({
          id: inv._id || inv.id,
          name: inv.filename || inv.fileName || 'invoice.pdf',
          uploadTime: inv.uploadDate ? new Date(inv.uploadDate).toLocaleString('en-IN') : 'Unknown',
          uploadedAt: inv.uploadDate,
          status: "completed",
          accuracy: inv.ocrConfidence || inv.ocr_confidence || 0,
          progress: 100,
          extractedData: {
            invoiceNumber: inv.invoiceNumber || inv.invoice_number || 'Unknown',
            vendorName: inv.vendorName || inv.vendor_name || 'Unknown',
            invoiceAmount: inv.totalAmount || inv.total_amount || 0,
            invoiceDate: inv.invoiceDate || inv.invoice_date || 'Unknown',
            gstNumbers: inv.allGstNumbers || inv.all_gst_numbers || inv.gst_numbers || [],
            gstRate: inv.gstRate || inv.gst_rate || 'Unknown',
            hsnNumber: inv.hsnNumber || inv.hsn_number || 'Unknown',
            ocrConfidence: inv.ocrConfidence || inv.ocr_confidence || 0,
            // Load validation results from compliance data
            gstValidations: inv.complianceResults?.gst_validations || inv.compliance_results?.gst_validations || [],
            hsnValidations: inv.complianceResults?.hsn_validations || inv.compliance_results?.hsn_validations || [],
            duplicateCheck: inv.complianceResults?.duplicate_check || inv.compliance_results?.duplicate_check || [],
            arithmeticCheck: inv.complianceResults?.arithmetic_check || inv.compliance_results?.arithmetic_check || { overall_accurate: false },
            complianceScore: inv.complianceResults?.compliance_score || inv.compliance_results?.compliance_score || 0,
            complianceStatus: inv.complianceResults?.compliance_status || inv.compliance_results?.compliance_status || 'Unknown',
            riskScore: inv.complianceResults?.risk_score || inv.compliance_results?.risk_score || 0,
            riskLevel: inv.complianceResults?.risk_level || inv.compliance_results?.risk_level || 'Unknown',
            // Add GST verification results
            gstVerification: inv.gstVerification || inv.gst_verification || [],
            // Add anomalies
            anomaliesDetected: inv.anomalies?.map((a: any) => a.anomaly_type || a.anomalyType) || [],
          }
        }));
        console.log('📥 Loaded invoice history:', historicalFiles.length, 'invoices');
        setFiles(historicalFiles);
      } else {
        console.log('⚠️ No invoices found in response');
      }
    } catch (error) {
      console.error('❌ Failed to load invoice history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
      // Reset file input to allow uploading the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFiles = async (uploadedFiles: File[]) => {
    const newFiles: UploadedFile[] = uploadedFiles.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      uploadTime: "Just now",
      uploadedAt: new Date().toISOString(),
      status: "processing",
      accuracy: 0,
      progress: 0,
    }));

    setFiles([...newFiles, ...files]);
    toast.success(`${uploadedFiles.length} file(s) uploaded successfully`);

    // REAL API CALL instead of simulation
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const fileId = newFiles[i].id;

      try {
        // Update progress to show processing
        setFiles(prev => prev.map(f =>
          f.id === fileId ? { ...f, progress: 50 } : f
        ));

        // Call REAL FINTEL AI API
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('http://localhost:8000/api/invoices/upload', {
          method: 'POST',
          body: formData,
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('API Response:', result);

        if (result.success) {
          // Update with COMPLETE extracted data including all compliance features
          setFiles(prev => prev.map(f =>
            f.id === fileId ? {
              ...f,
              progress: 100,
              status: "completed",
              accuracy: result.data.ocrConfidence || 0, // REAL accuracy from OCR
              extractedData: {
                // Basic extraction
                invoiceNumber: result.data.invoiceNumber || 'Unknown',
                vendorName: result.data.vendorName || 'Unknown',
                invoiceAmount: result.data.invoiceAmount || 0,
                invoiceDate: result.data.invoiceDate || 'Unknown',
                gstNumbers: result.data.gstNumbers || [],
                gstRate: result.data.gstRate || result.data.gst_rate || 'Unknown',
                hsnNumber: result.data.hsnNumber || result.data.hsn_number || 'Unknown',
                ocrConfidence: result.data.ocrConfidence || 0,

                // Enhanced extraction
                hsnSacCodes: result.data.hsnSacCodes || [],
                itemDescriptions: result.data.itemDescriptions || [],
                quantities: result.data.quantities || [],

                // Compliance scoring
                complianceScore: result.data.complianceScore || 0,
                complianceStatus: result.data.complianceStatus || 'Unknown',
                checksPassedCount: result.data.checksPassedCount || 0,
                totalChecksCount: result.data.totalChecksCount || 12,
                riskScore: result.data.riskScore || 0,
                riskLevel: result.data.riskLevel || 'Unknown',

                // Validation results
                gstValidations: result.data.gstValidations || [],
                gstVerification: result.data.gstVerification || [],
                hsnValidations: result.data.hsnValidations || [],
                duplicateCheck: result.data.duplicateCheck || [],
                arithmeticCheck: result.data.arithmeticCheck || { overall_accurate: false },
                priceAnalysis: result.data.priceAnalysis || [],

                // ML results
                mlPrediction: result.data.mlPrediction || { is_anomaly: false, confidence: 0 },

                // Anomalies summary
                anomaliesDetected: result.data.anomaliesDetected || []
              }
            } : f
          ));

          toast.success(`${file.name} processed successfully!`);
        } else {
          // Handle error
          setFiles(prev => prev.map(f =>
            f.id === fileId ? {
              ...f,
              progress: 100,
              status: "error",
              error: result.error || "Processing failed"
            } : f
          ));

          toast.error(`Failed to process ${file.name}`);
        }

      } catch (error) {
        console.error('Upload error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));

        setFiles(prev => prev.map(f =>
          f.id === fileId ? {
            ...f,
            progress: 100,
            status: "error",
            error: `Network error: ${error.message || 'Unknown error'}`
          } : f
        ));

        toast.error(`Network error uploading ${file.name}: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const getStatusIcon = (status: UploadedFile["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-[var(--color-success)]" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-[var(--color-danger)]" />;
      case "processing":
        return <Clock className="h-5 w-5 text-[var(--anomaly-hsn)]" />;
    }
  };

  const showDetails = (file: UploadedFile) => {
    if (file.extractedData) {
      setSelectedFile(file);
    } else if (file.error) {
      toast.error(`Processing Error: ${file.error}`);
    } else {
      toast.info("⏳ Still processing... Please wait.");
    }
  };

  const getStatusText = (status: UploadedFile["status"]) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "error":
        return "Error";
      case "processing":
        return "Processing";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Upload Invoices</h1>
          <p className="text-muted-foreground">
            Upload PDF, PNG, or JPEG invoices for AI-powered extraction and compliance validation
          </p>
        </div>

        {/* Upload Zone with Latest Result */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Upload Box */}
          <Card className="p-12 border-2 border-dashed border-[var(--border)] hover:border-primary transition-colors bg-white/50 dark:bg-white/5 rounded-[24px]">
            <div
              className="flex flex-col items-center justify-center space-y-4"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <div className="p-6 rounded-full bg-primary/10">
                <UploadIcon className="h-12 w-12 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">
                  Drop invoices here or click to browse
                </h3>
                <p className="text-sm text-muted-foreground">
                  Supports PDF, PNG, JPEG • Max 20MB per file
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                id="file-upload"
                onChange={handleFileInput}
              />
              <label htmlFor="file-upload">
                <Button asChild>
                  <span>Browse Files</span>
                </Button>
              </label>
            </div>
          </Card>

          {/* Right: Latest Invoice Summary */}
          <Card className="p-6 border border-[var(--border)] rounded-[24px] bg-white/50 dark:bg-white/5">
            {files.length > 0 && files[0].status === "completed" && files[0].extractedData ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Latest Invoice</h3>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Processed
                  </Badge>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{files[0].name}</span>
                  </div>

                  <Card className="p-4 border border-[var(--border)] border-l-4 border-l-primary rounded-[16px] bg-white dark:bg-white/5">
                    <h4 className="font-semibold text-base mb-3">Invoice Summary</h4>
                    <div className="space-y-2.5">
                      {/* Vendor */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground min-w-[80px]">Vendor</span>
                          <span className="font-semibold text-sm">{files[0].extractedData.vendorName}</span>
                        </div>
                        {files[0].extractedData.vendorName !== 'Unknown' ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Valid
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Missing
                          </Badge>
                        )}
                      </div>

                      {/* Invoice Number */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground min-w-[80px]">Invoice #</span>
                          <span className="font-semibold text-sm">{files[0].extractedData.invoiceNumber}</span>
                        </div>
                        {files[0].extractedData.invoiceNumber !== 'Unknown' ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Valid
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Verify
                          </Badge>
                        )}
                      </div>

                      {/* Amount */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground min-w-[80px]">Amount</span>
                          <span className="font-semibold text-sm">
                            {String(files[0].extractedData.invoiceAmount) !== 'Unknown' && files[0].extractedData.invoiceAmount !== 0
                              ? `₹${files[0].extractedData.invoiceAmount}`
                              : '—'}
                          </span>
                        </div>
                        {String(files[0].extractedData.invoiceAmount) !== 'Unknown' && files[0].extractedData.invoiceAmount !== 0 ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Valid
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Missing
                          </Badge>
                        )}
                      </div>

                      {/* Date */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground min-w-[80px]">Date</span>
                          <span className="font-semibold text-sm">{files[0].extractedData.invoiceDate !== 'Unknown' ? files[0].extractedData.invoiceDate : '—'}</span>
                        </div>
                        {files[0].extractedData.invoiceDate !== 'Unknown' ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Valid
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Missing
                          </Badge>
                        )}
                      </div>

                      {/* GST Number */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground min-w-[80px]">GST</span>
                          <span className="font-semibold text-sm">
                            {files[0].extractedData.gstNumbers && files[0].extractedData.gstNumbers.length > 0
                              ? files[0].extractedData.gstNumbers[0]
                              : '—'}
                          </span>
                        </div>
                        {files[0].extractedData.gstNumbers && files[0].extractedData.gstNumbers.length > 0 ? (
                          files[0].extractedData.gstVerification && files[0].extractedData.gstVerification[0]?.is_active ? (
                            <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Unverified
                            </Badge>
                          )
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Missing
                          </Badge>
                        )}
                      </div>

                      {/* Vendor Name Match */}
                      {files[0].extractedData.gstVerification && files[0].extractedData.gstVerification[0]?.success && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground min-w-[80px]">Owner</span>
                            <span className="font-semibold text-xs text-primary truncate max-w-[120px]">
                              {files[0].extractedData.gstVerification[0]?.legal_name}
                            </span>
                          </div>
                          {files[0].extractedData.gstVerification[0]?.vendor_name_match?.match ? (
                            <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" /> Matched
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-red-100 text-red-800 text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" /> Mismatch
                            </Badge>
                          )}
                        </div>
                      )}

                    </div>
                  </Card>

                  <Button
                    className="w-full"
                    onClick={() => showDetails(files[0])}
                  >
                    View Full Details
                  </Button>
                </div>
              </div>
            ) : files.length > 0 && files[0].status === "processing" ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <Clock className="h-12 w-12 text-primary animate-spin" />
                <div className="text-center">
                  <h3 className="text-lg font-semibold">Processing Invoice...</h3>
                  <p className="text-sm text-muted-foreground mt-2">{files[0].name}</p>
                  <Progress value={files[0].progress} className="h-2 mt-4" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="p-6 rounded-full bg-muted">
                  <FileText className="h-12 w-12 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">No Invoice Uploaded</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Upload an invoice to see the summary here
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>


        {/* Past Uploads History */}
        <Card className="p-6 border border-[var(--border)] rounded-[24px] bg-white/50 dark:bg-white/5">
          <h3 className="text-lg font-semibold mb-4">Past Uploads</h3>
          {isLoadingHistory ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 animate-spin" />
              Loading invoice history...
            </div>
          ) : files.length > 0 ? (
            <div className="space-y-3">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-[16px] border border-[var(--border)] bg-white dark:bg-white/5 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          }) : file.uploadTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {file.uploadedAt ? new Date(file.uploadedAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={file.status === "completed" ? "default" : "secondary"}
                      className={file.status === "completed" ? "bg-green-100 text-green-800" : ""}
                    >
                      {file.status === "completed" ? "Processed" : "Processing"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => showDetails(file)}
                      disabled={file.status === "processing"}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No invoices uploaded yet. Upload your first invoice above!
            </div>
          )}
        </Card>

      </div>

      {/* Modern Invoice Details Modal */}
      <Dialog open={!!selectedFile} onOpenChange={(open) => !open && setSelectedFile(null)}>
        <DialogContent className="max-w-2xl bg-[#F5F5F7] dark:bg-[#161616] p-0 overflow-hidden border-[#E5E5E5] dark:border-white/10 shadow-2xl rounded-xl gap-0">
          {selectedFile?.extractedData && (
            <div className="flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="flex items-center justify-between p-5 bg-[#F5F5F7] dark:bg-[#161616]">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex items-center justify-center shrink-0 w-12 h-12 rounded-xl bg-primary text-primary-foreground shadow-inner">
                    <Receipt size={28} />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-lg font-bold text-[#1A1A1A] dark:text-[#ededed] truncate pb-1">
                      {selectedFile.extractedData.vendorName}
                    </DialogTitle>
                    <p className="text-sm font-medium text-muted-foreground truncate">
                      Invoice #{selectedFile.extractedData.invoiceNumber}
                    </p>
                  </div>
                </div>

              </div>

              {/* Scrollable Expanded Content */}
              <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1c1c1c] border-t border-[#E9E8EF] dark:border-white/5 rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] p-6 space-y-6">
                
                {/* Core Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DataRow icon={<IndianRupee size={16} />} label="Total Amount">
                    <span className="text-[15px] font-bold text-[#107F3E] dark:text-green-400 bg-[#EBF9EC] dark:bg-green-500/10 border border-[#D1F0DB] dark:border-green-500/20 px-3 py-1 rounded-full">
                      ₹{selectedFile.extractedData.invoiceAmount?.toLocaleString() || '0'}
                    </span>
                  </DataRow>
                  
                  <DataRow icon={<Calendar size={16} />} label="Invoice Date">
                    <span className="text-[14px] font-semibold text-[#464646] dark:text-[#d4d4d4]">
                      {selectedFile.extractedData.invoiceDate}
                    </span>
                  </DataRow>

                  <DataRow icon={<Building2 size={16} />} label="GST Number">
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-muted rounded-full border border-border text-[13px] font-medium text-foreground">
                      {selectedFile.extractedData.gstNumbers?.[0] || 'Unknown'}
                    </span>
                  </DataRow>

                  <DataRow icon={<Percent size={16} />} label="GST Rate">
                    <span className="text-[14px] font-semibold text-[#464646] dark:text-[#d4d4d4]">
                      {selectedFile.extractedData.gstRate || 'Not found'}
                    </span>
                  </DataRow>
                </div>

                <Separator className="dark:bg-white/10" />

                {/* Validation & Risk Details */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Verification Metrics</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DataRow icon={<ShieldCheck size={16} />} label="GST Verified">
                      {selectedFile.extractedData.gstNumbers && selectedFile.extractedData.gstNumbers.length > 0 ? (
                        selectedFile.extractedData.gstVerification && selectedFile.extractedData.gstVerification[0]?.is_active ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100"><CheckCircle size={12} className="mr-1"/> Verified</Badge>
                        ) : selectedFile.extractedData.gstVerification && selectedFile.extractedData.gstVerification[0]?.is_valid === false ? (
                          <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100"><AlertCircle size={12} className="mr-1"/> Invalid</Badge>
                        ) : selectedFile.extractedData.gstVerification && selectedFile.extractedData.gstVerification[0]?.success === false ? (
                          <Badge variant="secondary" className="text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400"><AlertCircle size={12} className="mr-1"/> Not Found</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400"><AlertCircle size={12} className="mr-1"/> Not Found</Badge>
                        )
                      ) : (
                        <Badge variant="secondary" className="text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400"><AlertCircle size={12} className="mr-1"/> Missing</Badge>
                      )}
                    </DataRow>
                    
                  </div>
                </div>

                {/* Anomalies section if exist */}
                {(selectedFile.extractedData.anomaliesDetected && selectedFile.extractedData.anomaliesDetected.length > 0) && (
                  <>
                    <Separator className="dark:bg-white/10" />
                    <div>
                      <h4 className="text-sm font-bold text-red-500 uppercase tracking-wider mb-3">Detected Anomalies</h4>
                      <div className="flex flex-col gap-2">
                        {selectedFile.extractedData.anomaliesDetected.map((anomaly, idx) => (
                           <div key={idx} className="flex items-start gap-2 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-3 rounded-lg border border-red-100 dark:border-red-900/30 text-sm">
                             <AlertCircle size={16} className="shrink-0 mt-0.5" />
                             <span className="font-medium">{anomaly}</span>
                           </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

const DataRow = ({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-4 py-1.5">
    <div className="flex shrink-0 items-center gap-3 text-[#A1A1A1]">
      {icon}
      <span className="text-[13px] font-medium whitespace-nowrap text-[#71717A] dark:text-gray-400">
        {label}
      </span>
    </div>
    <div className="flex min-w-0 flex-1 justify-end">{children}</div>
  </div>
);

export default Upload;
