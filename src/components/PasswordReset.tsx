
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface PasswordResetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PasswordReset = ({ open, onOpenChange }: PasswordResetProps) => {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleRequestReset = async () => {
    if (!email) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('password-reset', {
        body: { action: 'request_reset', email }
      });

      if (error) throw error;

      toast({
        title: "Reset link sent",
        description: "If the email exists, you'll receive a reset token. Check the console for now.",
      });
      
      setStep('reset');
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

  const handleResetPassword = async () => {
    if (!token || !newPassword) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('password-reset', {
        body: { action: 'reset_password', token, newPassword }
      });

      if (error) throw error;

      toast({
        title: "Password reset successful",
        description: "Your password has been updated. You can now sign in.",
      });
      
      onOpenChange(false);
      setStep('request');
      setEmail('');
      setToken('');
      setNewPassword('');
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
          <DialogTitle>
            {step === 'request' ? 'Reset Password' : 'Enter New Password'}
          </DialogTitle>
        </DialogHeader>
        
        {step === 'request' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>
            <Button onClick={handleRequestReset} disabled={loading} className="w-full">
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Reset Token</Label>
              <Input
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter the reset token"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <Button onClick={handleResetPassword} disabled={loading} className="w-full">
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setStep('request')} 
              className="w-full"
            >
              Back to Email
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PasswordReset;
