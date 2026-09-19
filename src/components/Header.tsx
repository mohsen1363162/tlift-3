
import React from 'react';
import { Button } from "@/components/ui/button";
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Shield } from 'lucide-react';

const Header: React.FC = () => {
  const { user, profile, signOut, isAdmin } = useAuth();

  if (!user) return null;

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-800">
          سیستم مدیریت سرویس‌دهی
        </h1>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="h-4 w-4" />
            <span>{profile?.full_name || profile?.email}</span>
            {isAdmin && (
              <div className="flex items-center gap-1 bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
                <Shield className="h-3 w-3" />
                <span>مدیر</span>
              </div>
            )}
            {profile?.role === 'operator' && (
              <div className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                <span>اپراتور</span>
              </div>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={signOut}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            خروج
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
