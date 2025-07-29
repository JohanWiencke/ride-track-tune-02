import React, { useState, useEffect } from 'react';
import { ImageUpload } from './ImageUpload';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const ProfilePictureUpload = () => {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('user_id', user.id)
      .single();

    if (!error && data) {
      setAvatarUrl(data.avatar_url || '');
    }
  };

  const handleImageUploaded = async (url: string) => {
    if (!user) return;

    setAvatarUrl(url);

    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: url })
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update profile picture",
        variant: "destructive",
      });
    }
  };

  if (!user) return null;

  return (
    <ImageUpload
      currentImageUrl={avatarUrl}
      onImageUploaded={handleImageUploaded}
      bucket="profile-pictures"
      folder={user.id}
      variant="profile"
    />
  );
};