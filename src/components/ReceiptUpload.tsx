
import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText } from 'lucide-react';

interface ReceiptUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const ReceiptUpload = ({ open, onOpenChange, onSuccess }: ReceiptUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('receipt-images')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data } = supabase.storage
        .from('receipt-images')
        .getPublicUrl(fileName);

      // Create receipt record
      const { data: receiptData, error: receiptError } = await supabase
        .from('receipts')
        .insert({
          user_id: user.id,
          image_url: data.publicUrl,
          original_filename: file.name,
          analysis_status: 'pending'
        })
        .select()
        .single();

      if (receiptError) {
        console.error('Receipt creation error:', receiptError);
        throw new Error(`Failed to create receipt record: ${receiptError.message}`);
      }

      toast({
        title: "Receipt uploaded",
        description: "Starting analysis...",
      });

      // Convert file to base64 for analysis
      const reader = new FileReader();
      reader.onloadend = async () => {
        setAnalyzing(true);
        try {
          const base64 = (reader.result as string).split(',')[1];
          
          console.log('Calling analyze-receipt function...');
          const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-receipt', {
            body: { 
              receiptId: receiptData.id, 
              imageBase64: base64 
            }
          });

          if (analysisError) {
            console.error('Analysis error:', analysisError);
            throw new Error(`Analysis failed: ${analysisError.message}`);
          }

          console.log('Analysis response:', analysisData);

          if (analysisData?.extractedParts && analysisData.extractedParts.length > 0) {
            toast({
              title: "Analysis complete",
              description: `Found ${analysisData.extractedParts.length} bike parts. Added to inventory.`,
            });
          } else {
            toast({
              title: "Analysis complete",
              description: "No bike parts were found in this receipt.",
            });
          }

          onSuccess();
          onOpenChange(false);
        } catch (error: any) {
          console.error('Analysis error:', error);
          toast({
            title: "Analysis failed",
            description: error.message || "An unknown error occurred during analysis.",
            variant: "destructive",
          });
          
          // Update receipt status to failed
          await supabase
            .from('receipts')
            .update({ analysis_status: 'failed', processing_status: 'failed' })
            .eq('id', receiptData.id);
        } finally {
          setAnalyzing(false);
        }
      };
      
      reader.onerror = () => {
        toast({
          title: "File reading failed",
          description: "Could not read the uploaded file.",
          variant: "destructive",
        });
        setAnalyzing(false);
      };
      
      reader.readAsDataURL(file);

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "An unknown error occurred during upload.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Receipt</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Upload your bike parts receipt and our AI will automatically analyze it and add the parts to your inventory. 
            Supports German, French, English, and Italian receipts.
          </div>
          
          <div 
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading || analyzing ? (
              <div className="space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground">
                  {uploading ? "Uploading..." : "Analyzing receipt..."}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm font-medium">Click to upload receipt</p>
                <p className="text-xs text-muted-foreground">PNG, JPG, JPEG up to 10MB</p>
              </div>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading || analyzing}
          />
          
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="w-full"
            disabled={uploading || analyzing}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptUpload;
