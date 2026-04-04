import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, Key, Database, Building2, Save } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const handleSave = () => {
    toast.success("Settings saved successfully");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Configure FINTEL AI system preferences and integrations
          </p>
        </div>

        <Tabs defaultValue="company" className="space-y-6">
          <TabsList>
            <TabsTrigger value="company">Company Details</TabsTrigger>
            <TabsTrigger value="api">API Keys</TabsTrigger>
            <TabsTrigger value="hsn">HSN Mapping</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Company Information</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Manage your company details and GST registration information
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name *</Label>
                    <Input
                      id="company-name"
                      placeholder="Enter company name"
                      defaultValue="IIT Gandhinagar"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-gst">Company GST Number *</Label>
                    <Input
                      id="company-gst"
                      placeholder="e.g., 24AAACC1206D1ZM"
                      defaultValue=""
                      maxLength={15}
                    />
                    <p className="text-xs text-muted-foreground">
                      15-digit GST identification number
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-pan">PAN Number *</Label>
                    <Input
                      id="company-pan"
                      placeholder="e.g., AAACC1206D"
                      defaultValue=""
                      maxLength={10}
                    />
                    <p className="text-xs text-muted-foreground">
                      10-character PAN number
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-cin">CIN Number</Label>
                    <Input
                      id="company-cin"
                      placeholder="e.g., U72900MH2015PTC123456"
                      defaultValue=""
                    />
                    <p className="text-xs text-muted-foreground">
                      Corporate Identification Number (if applicable)
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-address">Registered Address *</Label>
                  <Input
                      id="company-address"
                      placeholder="Enter complete registered address"
                      defaultValue=""
                    />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-city">City *</Label>
                    <Input
                      id="company-city"
                      placeholder="City"
                      defaultValue="Gandhinagar"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-state">State *</Label>
                    <Input
                      id="company-state"
                      placeholder="State"
                      defaultValue="Gujarat"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-pincode">Pincode *</Label>
                    <Input
                      id="company-pincode"
                      placeholder="Pincode"
                      defaultValue=""
                      maxLength={6}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-email">Official Email *</Label>
                    <Input
                      id="company-email"
                      type="email"
                      placeholder="company@example.com"
                      defaultValue=""
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-phone">Contact Number *</Label>
                    <Input
                      id="company-phone"
                      type="tel"
                      placeholder="+91 XXXXXXXXXX"
                      defaultValue=""
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="financial-year">Financial Year</Label>
                  <Input
                      id="financial-year"
                      placeholder="e.g., 2024-2025"
                      defaultValue="2024-2025"
                    />
                  <p className="text-xs text-muted-foreground">
                    Current financial year for reporting
                  </p>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button onClick={handleSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Company Details
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Key className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">API Configuration</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Configure external service API keys for GST validation and document processing
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gst-api">GST Portal API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="gst-api"
                      type="password"
                      placeholder="Enter GST Portal API key"
                      defaultValue="••••••••••••••••"
                    />
                    <Button variant="outline">Test</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Used for real-time GST number validation
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doc-ai-api">Document AI API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="doc-ai-api"
                      type="password"
                      placeholder="Enter Document AI API key"
                      defaultValue="••••••••••••••••"
                    />
                    <Button variant="outline">Test</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Powers invoice data extraction and OCR
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email-api">Email Integration API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="email-api"
                      type="password"
                      placeholder="Enter email service API key"
                      defaultValue="••••••••••••••••"
                    />
                    <Button variant="outline">Test</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    For automatic invoice fetching from email
                  </p>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button onClick={handleSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save API Keys
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="hsn" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Database className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">HSN Code Management</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Upload and manage HSN to GST rate mappings for accurate validation
              </p>

              <div className="space-y-6">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="font-medium mb-2">Upload HSN Mapping File</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Supports CSV, XLSX formats
                  </p>
                  <input type="file" className="hidden" id="hsn-upload" accept=".csv,.xlsx" />
                  <label htmlFor="hsn-upload">
                    <Button variant="outline" asChild>
                      <span>Browse Files</span>
                    </Button>
                  </label>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">Current Mappings</h4>
                    <Badge variant="outline">1,245 HSN Codes</Badge>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-4 gap-4 p-4 bg-muted font-medium text-sm">
                      <div>HSN Code</div>
                      <div>Description</div>
                      <div>GST Rate</div>
                      <div>Last Updated</div>
                    </div>
                    <div className="divide-y">
                      {[
                        { hsn: "998312", desc: "IT Consulting Services", rate: "18%", date: "15-Oct-2025" },
                        { hsn: "998313", desc: "Software Development", rate: "18%", date: "15-Oct-2025" },
                        { hsn: "998314", desc: "Technical Support", rate: "12%", date: "10-Oct-2025" },
                      ].map((item, index) => (
                        <div key={index} className="grid grid-cols-4 gap-4 p-4 text-sm">
                          <div className="font-mono">{item.hsn}</div>
                          <div>{item.desc}</div>
                          <div className="font-semibold">{item.rate}</div>
                          <div className="text-muted-foreground">{item.date}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Configure when and how you receive alerts about anomalies and compliance issues
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium mb-1">High-Risk Anomalies</p>
                    <p className="text-sm text-muted-foreground">
                      Immediate alerts for critical compliance issues
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium mb-1">Daily Digest</p>
                    <p className="text-sm text-muted-foreground">
                      Summary of daily invoice processing and anomalies
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium mb-1">Weekly Reports</p>
                    <p className="text-sm text-muted-foreground">
                      Comprehensive weekly compliance summary
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium mb-1">Vendor Risk Changes</p>
                    <p className="text-sm text-muted-foreground">
                      Notify when vendor risk scores change significantly
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button onClick={handleSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Preferences
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
