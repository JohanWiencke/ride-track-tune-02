
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import AccountDeletion from './AccountDeletion';

const Footer = () => {
  const [showAccountDeletion, setShowAccountDeletion] = useState(false);

  return (
    <>
      <footer className="border-t glass-card mt-auto">
        <div className="container py-4">
          <div className="flex justify-center">
            <Button 
              variant="link" 
              size="sm" 
              onClick={() => setShowAccountDeletion(true)}
              className="text-muted-foreground hover:text-destructive gap-1"
            >
              <Trash2 className="h-3 w-3" />
              Delete Account
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-2">
            © 2024 Bike Maintenance Tracker. All rights reserved.
          </p>
        </div>
      </footer>

      <AccountDeletion
        open={showAccountDeletion}
        onOpenChange={setShowAccountDeletion}
      />
    </>
  );
};

export default Footer;
