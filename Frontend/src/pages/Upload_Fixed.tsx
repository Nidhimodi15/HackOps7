import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Upload as UploadIcon,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface UploadedFile {
  id: string;
  name: string;
  uploadTime: string;
  status: "processing" | "completed" | "error";
  accuracy: number;
  progress: number;
  extractedData?: {
    invoiceNumber: string;
    vendorName: string;
    invoiceAmount: number;
    invoiceDate: string;
    gstNumbers: string[];
    ocrConfidence: number;
  };
  error?: string;
}

const Upload = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = async (uploadedFiles: File[]) => {
    const newFiles: UploadedFile[] = uploadedFiles.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      uploadTime: "Just now",
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
        setFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, progress: 50 } : f)),
        );

        // Call REAL FINTEL AI API
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(
          "http://localhost:8000/api/invoices/upload",
          {
            method: "POST",
            body: formData,
          },
        );

        const result = await response.json();

        if (result.success) {
          // Update with REAL extracted data
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? {
                    ...f,
                    progress: 100,
                    status: "completed",
                    accuracy: result.data.ocrConfidence, // REAL accuracy from OCR
                    extractedData: result.data, // REAL extracted data
                  }
                : f,
            ),
          );

          toast.success(`${file.name} processed successfully!`);
        } else {
          // Handle error
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? {
                    ...f,
                    progress: 100,
                    status: "error",
                    error: result.error || "Processing failed",
                  }
                : f,
            ),
          );

          toast.error(`Failed to process ${file.name}`);
        }
      } catch (error) {
        console.error("Upload error:", error);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  progress: 100,
                  status: "error",
                  error: "Network error",
                }
              : f,
          ),
        );

        toast.error(`Network error uploading ${file.name}`);
      }
    }
  };

  const getStatusIcon = (status: UploadedFile["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "processing":
        return <Clock className="h-5 w-5 text-blue-500" />;
    }
  };

  const showDetails = (file: UploadedFile) => {
    if (file.extractedData) {
      const data = file.extractedData;
      alert(`REAL EXTRACTED DATA:
      
Invoice Number: ${data.invoiceNumber}
Vendor: ${data.vendorName}
Amount: ₹${data.invoiceAmount.toLocaleString()}
Date: ${data.invoiceDate}
GST Numbers: ${data.gstNumbers.join(", ")}
OCR Confidence: ${data.ocrConfidence}%`);
    } else if (file.error) {
      alert(`Error: ${file.error}`);
    } else {
      alert("Still processing...");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Upload Invoices</h1>
          <p className="text-muted-foreground">
            Upload invoices for AI-powered extraction and anomaly detection
          </p>
        </div>

        {/* Upload Area */}
        <Card className="p-8">
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <UploadIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              Drop files here or click to browse
            </h3>
            <p className="text-muted-foreground mb-4">
              Supports PDF, JPG, PNG files up to 10MB
            </p>
            <Button>
              <FileText className="h-4 w-4 mr-2" />
              Choose Files
            </Button>
            <input
              id="file-input"
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>
        </Card>

        {/* File List */}
        {files.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Processing Queue</h3>
            <div className="space-y-4">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    {getStatusIcon(file.status)}
                    <div className="flex-1">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {file.uploadTime} •{" "}
                        {file.status === "completed" &&
                          `${file.accuracy}% accuracy`}
                      </p>
                      {file.status === "processing" && (
                        <Progress value={file.progress} className="mt-2" />
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => showDetails(file)}
                    disabled={file.status === "processing"}
                  >
                    View Details
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Upload;
