
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Trash2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AccountDeletionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AccountDeletion = ({ open, onOpenChange }: AccountDeletionProps) => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'confirm' | 'final'>('confirm');

  const handleRequestDeletion = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account', {
        body: { action: 'request_deletion' }
      });

      if (error) throw error;

      toast({
        title: "Deletion request created",
        description: "Your account deletion request has been created.",
      });
      
      setStep('final');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDeletion = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account', {
        body: { action: 'confirm_deletion' }
      });

      if (error) throw error;

      toast({
        title: "Account deleted",
        description: "Your account and all data have been permanently deleted.",
      });
      
      await signOut();
      navigate('/auth');
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Account
          </DialogTitle>
        </DialogHeader>
        
        {step === 'confirm' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This action will permanently delete your account and all associated data including:
              </p>
              <ul className="text-sm text-muted-foreground ml-4 list-disc space-y-1">
                <li>All bike records and components</li>
                <li>Parts inventory</li>
                <li>Maintenance records</li>
                <li>Receipts and spending data</li>
                <li>Profile information</li>
              </ul>
              <p className="text-sm font-medium text-destructive">
                This action cannot be undone!
              </p>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)} 
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRequestDeletion}
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Processing..." : "Continue"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <Trash2 className="h-12 w-12 text-destructive mx-auto" />
              <p className="text-sm font-medium">
                Final confirmation required
              </p>
              <p className="text-sm text-muted-foreground">
                Click the button below to permanently delete your account. 
                After deletion, your email address can be used to create a new account.
              </p>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setStep('confirm')} 
                className="flex-1"
              >
                Go Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDeletion}
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Deleting..." : "Delete Account"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AccountDeletion;
