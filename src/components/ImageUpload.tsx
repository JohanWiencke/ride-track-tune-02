import React, { useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from '@/hooks/useTranslation';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageUploaded: (url: string) => void;
  bucket: 'bike-images' | 'profile-pictures';
  folder: string;
  className?: string;
  variant?: 'bike' | 'profile';
}

export const ImageUpload = ({ 
  currentImageUrl, 
  onImageUploaded, 
  bucket, 
  folder, 
  className = '',
  variant = 'bike'
}: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${folder}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      onImageUploaded(data.publicUrl);
      
      toast({
        title: "Success",
        description: t('imageUploadedSuccess'),
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    onImageUploaded('');
  };

  if (variant === 'profile') {
    return (
      <div className={`relative ${className}`}>
        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-border">
          {currentImageUrl ? (
            <img src={currentImageUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        <input
          type="file"
          id="profile-upload"
          accept="image/*"
          onChange={uploadImage}
          disabled={uploading}
          className="hidden"
        />
        <label
          htmlFor="profile-upload"
          className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1 cursor-pointer hover:bg-primary/90 transition-colors"
        >
          <Camera className="w-3 h-3" />
        </label>
        {currentImageUrl && (
          <Button
            variant="destructive"
            size="sm"
            className="absolute -top-1 -right-1 rounded-full p-1 h-4 w-4"
            onClick={removeImage}
          >
            <X className="w-2 h-2" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="border-2 border-dashed border-border rounded-lg p-6">
        {currentImageUrl ? (
          <div className="relative">
            <img src={currentImageUrl} alt="Bike" className="w-full h-32 object-cover rounded-lg" />
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={removeImage}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <div className="mt-4">
              <label htmlFor="bike-upload" className="cursor-pointer">
                <span className="text-sm font-medium text-primary hover:text-primary/80">
                  {t('clickToUpload')}
                </span>
                <input
                  id="bike-upload"
                  name="bike-upload"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={uploadImage}
                  disabled={uploading}
                />
              </label>
              <p className="text-xs text-muted-foreground mt-1">{t('dragAndDrop')}</p>
            </div>
          </div>
        )}
      </div>
      {uploading && (
        <div className="text-center text-sm text-muted-foreground">
          {t('uploading')}
        </div>
      )}
    </div>
  );
};