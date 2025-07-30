
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { UserProfile } from '@/components/UserProfile';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-glass-blue/10 via-background to-glass-purple/10">
      <header className="border-b glass-card">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <img src="/lovable-uploads/4ff90988-aa97-4e30-a9cc-2d87ae0687bd.png" alt="BMT" className="h-6 w-6" />
            <h1 className="text-lg font-semibold">Profile</h1>
          </div>
        </div>
      </header>

      <div className="container py-6">
        <div className="max-w-2xl mx-auto">
          <UserProfile />
        </div>
      </div>
    </div>
  );
};

export default Profile;
