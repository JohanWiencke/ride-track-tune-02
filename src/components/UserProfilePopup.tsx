import React from 'react';
import { User, Bike, Package, Euro, Calendar, Activity, TrendingUp } from 'lucide-react';
import { ProfilePictureUpload } from '@/components/ProfilePictureUpload';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/hooks/useTranslation';

interface UserProfilePopupProps {
  children: React.ReactNode;
  userEmail: string;
  fullName?: string;
  bikeCount: number;
  garageValue: number;
  partInventoryCount: number;
  partInventoryValue: number;
  stravaStats?: {
    totalDistance: number;
    totalActivities: number;
  };
}

export const UserProfilePopup = ({
  children,
  userEmail,
  fullName,
  bikeCount,
  garageValue,
  partInventoryCount,
  partInventoryValue,
  stravaStats,
}: UserProfilePopupProps) => {
  const { t } = useTranslation();
  const username = userEmail?.split('@')[0] || 'User';
  const joinDate = new Date().toLocaleDateString(); // You can pass actual join date

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md relative overflow-hidden border-0 p-0">
        {/* Liquid Glass Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-glass-blue/20 via-glass-purple/15 to-glass-indigo/20 backdrop-blur-xl"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5"></div>
        <div className="absolute inset-0 border border-white/20 rounded-lg"></div>
        
        {/* Animated Orbs */}
        <div className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-br from-glass-blue/30 to-glass-purple/30 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-4 left-4 w-12 h-12 bg-gradient-to-br from-glass-success/30 to-glass-warning/30 rounded-full blur-lg animate-float"></div>
        
        <div className="relative z-10 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-white via-glass-blue to-glass-purple bg-clip-text text-transparent">
              {t('userProfile')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-6 space-y-6">
            {/* Profile Picture Section */}
            <div className="relative group text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-glass-primary/20 to-glass-secondary/20 rounded-lg blur-sm group-hover:blur-none transition-all duration-300"></div>
              <div className="relative p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg">
                <div className="flex flex-col items-center gap-3">
                  <ProfilePictureUpload />
                  <div>
                    <p className="font-semibold text-white">{fullName || username}</p>
                    <p className="text-sm text-white/70">{userEmail}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Strava Stats Section */}
              {stravaStats && (
                <>
                  {/* Total Distance */}
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-400/30 to-red-500/30 rounded-lg blur-sm group-hover:blur-none transition-all duration-300"></div>
                    <div className="relative p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-center">
                      <div className="p-2 bg-gradient-to-br from-orange-400/30 to-red-500/30 rounded-lg mx-auto w-fit mb-2">
                        <TrendingUp className="h-5 w-5 text-white" />
                      </div>
                      <p className="text-2xl font-bold bg-gradient-to-r from-white via-orange-400 to-red-400 bg-clip-text text-transparent">
                        {(stravaStats.totalDistance / 1000).toFixed(0)}km
                      </p>
                      <p className="text-xs text-white/70">{t('totalDistance')}</p>
                    </div>
                  </div>

                  {/* Total Activities */}
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-400/30 to-pink-500/30 rounded-lg blur-sm group-hover:blur-none transition-all duration-300"></div>
                    <div className="relative p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-center">
                      <div className="p-2 bg-gradient-to-br from-purple-400/30 to-pink-500/30 rounded-lg mx-auto w-fit mb-2">
                        <Activity className="h-5 w-5 text-white" />
                      </div>
                      <p className="text-2xl font-bold bg-gradient-to-r from-white via-purple-400 to-pink-400 bg-clip-text text-transparent">
                        {stravaStats.totalActivities}
                      </p>
                      <p className="text-xs text-white/70">{t('activities')}</p>
                    </div>
                  </div>
                </>
              )}
              {/* Bikes Count */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-glass-blue/30 to-glass-purple/30 rounded-lg blur-sm group-hover:blur-none transition-all duration-300"></div>
                <div className="relative p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-center">
                  <div className="p-2 bg-gradient-to-br from-glass-blue/30 to-glass-purple/30 rounded-lg mx-auto w-fit mb-2">
                    <Bike className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-2xl font-bold bg-gradient-to-r from-white via-glass-blue to-glass-purple bg-clip-text text-transparent">
                    {bikeCount}
                  </p>
                  <p className="text-xs text-white/70">{t('bikes')}</p>
                </div>
              </div>

              {/* Garage Value */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400/30 to-blue-500/30 rounded-lg blur-sm group-hover:blur-none transition-all duration-300"></div>
                <div className="relative p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-center">
                  <div className="p-2 bg-gradient-to-br from-green-400/30 to-blue-500/30 rounded-lg mx-auto w-fit mb-2">
                    <Euro className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-2xl font-bold bg-gradient-to-r from-white via-green-400 to-blue-400 bg-clip-text text-transparent">
                    €{garageValue.toFixed(0)}
                  </p>
                  <p className="text-xs text-white/70">{t('garageValue')}</p>
                </div>
              </div>

              {/* Parts Count */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-glass-success/30 to-glass-primary/30 rounded-lg blur-sm group-hover:blur-none transition-all duration-300"></div>
                <div className="relative p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-center">
                  <div className="p-2 bg-gradient-to-br from-glass-success/30 to-glass-primary/30 rounded-lg mx-auto w-fit mb-2">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-2xl font-bold bg-gradient-to-r from-white via-glass-success to-glass-primary bg-clip-text text-transparent">
                    {partInventoryCount}
                  </p>
                  <p className="text-xs text-white/70">{t('parts')}</p>
                </div>
              </div>

              {/* Parts Value */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-glass-warning/30 to-yellow-400/30 rounded-lg blur-sm group-hover:blur-none transition-all duration-300"></div>
                <div className="relative p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-center">
                  <div className="p-2 bg-gradient-to-br from-glass-warning/30 to-yellow-400/30 rounded-lg mx-auto w-fit mb-2">
                    <Euro className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-2xl font-bold bg-gradient-to-r from-white via-glass-warning to-yellow-400 bg-clip-text text-transparent">
                    €{partInventoryValue.toFixed(0)}
                  </p>
                  <p className="text-xs text-white/70">{t('partsValue')}</p>
                </div>
              </div>
            </div>

            {/* Member Since */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-glass-accent/20 to-glass-secondary/20 rounded-lg blur-sm group-hover:blur-none transition-all duration-300"></div>
              <div className="relative p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-center">
                <div className="flex items-center justify-center gap-2">
                  <Calendar className="h-4 w-4 text-white/70" />
                  <p className="text-sm text-white/70">{t('memberSince')}: {joinDate}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};