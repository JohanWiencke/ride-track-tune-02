
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, FileImage, Loader, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ReceiptUploadProps {
  onReceiptProcessed?: () => void;
}

export const ReceiptUpload = ({ onReceiptProcessed }: ReceiptUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [showDialog, setShowDialog] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setShowDialog(true);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const uploadAndAnalyzeReceipt = async () => {
    if (!uploadedFile || !user?.id) return;

    setIsUploading(true);
    try {
      // Upload image to storage
      const fileName = `${user.id}/${Date.now()}-${uploadedFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipt-images')
        .upload(fileName, uploadedFile);

      if (uploadError) throw uploadError;

      const imageUrl = `https://qpsuzitebosqylldefup.supabase.co/storage/v1/object/public/receipt-images/${fileName}`;

      // Create receipt record
      const { data: receiptData, error: receiptError } = await supabase
        .from('receipts')
        .insert({
          user_id: user.id,
          image_url: imageUrl,
          original_filename: uploadedFile.name,
          analysis_status: 'processing'
        })
        .select()
        .single();

      if (receiptError) throw receiptError;

      toast({
        title: "Receipt uploaded",
        description: "Starting analysis of your receipt...",
      });

      setIsUploading(false);
      setIsAnalyzing(true);

      // Analyze receipt using edge function
      const { data: analysisData, error: analysisError } = await supabase.functions
        .invoke('analyze-receipt', {
          body: { 
            receiptId: receiptData.id,
            imageUrl: imageUrl 
          }
        });

      if (analysisError) {
        console.error('Analysis error:', analysisError);
        toast({
          title: "Analysis failed",
          description: "Could not analyze the receipt. You can add items manually.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Receipt analyzed",
          description: "Parts have been added to your inventory!",
        });
        onReceiptProcessed?.();
      }

      setIsAnalyzing(false);
      setShowDialog(false);
      resetUpload();

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  const resetUpload = () => {
    setUploadedFile(null);
    setPreviewUrl('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  return (
    <>
      <Card className="glass-card">
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
              hover:border-primary hover:bg-primary/5
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Upload Receipt</h3>
            <p className="text-muted-foreground mb-2">
              {isDragActive
                ? "Drop the receipt here..."
                : "Drag & drop a receipt image, or click to browse"
              }
            </p>
            <p className="text-sm text-muted-foreground">
              Supports PNG, JPG, JPEG, GIF, BMP, WebP (max 10MB)
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Receipt Upload</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {previewUrl && (
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Receipt preview"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  resetUpload();
                }}
                disabled={isUploading || isAnalyzing}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={uploadAndAnalyzeReceipt}
                disabled={isUploading || isAnalyzing}
                className="flex-1"
              >
                {isUploading ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : isAnalyzing ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <FileImage className="h-4 w-4 mr-2" />
                    Upload & Analyze
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
