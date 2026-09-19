
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Trash2, Shield } from "lucide-react";
import { useAuth } from '../contexts/AuthContext';

interface SystemResetProps {
  onReset: () => Promise<void>;
}

const SystemReset: React.FC<SystemResetProps> = ({ onReset }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const { isAdmin, profile } = useAuth();

  // Only show to admin users
  if (!isAdmin) {
    return null;
  }

  const handleReset = async () => {
    if (confirmText !== 'RESET' || adminPassword !== 'AdminReset123!') {
      toast({
        title: "خطا",
        description: "تایید یا رمز عبور اشتباه است",
        variant: "destructive"
      });
      return;
    }

    setIsResetting(true);
    try {
      await onReset();
      toast({
        title: "موفقیت",
        description: "سیستم با موفقیت بازنشانی شد",
      });
      setIsOpen(false);
      setConfirmText('');
      setAdminPassword('');
    } catch (error) {
      toast({
        title: "خطا",
        description: "خطا در بازنشانی سیستم",
        variant: "destructive"
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="destructive" 
          size="sm"
          className="flex items-center gap-2"
        >
          <Shield className="h-4 w-4" />
          <Trash2 className="h-4 w-4" />
          بازنشانی سیستم
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="system-reset-dialog max-w-md" dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600 flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            بازنشانی کامل سیستم
          </AlertDialogTitle>
          <AlertDialogDescription className="text-right">
            <strong className="text-red-600">هشدار:</strong> این عمل تمام اطلاعات را از سیستم حذف می‌کند:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>تمام مشتریان</li>
              <li>تمام سرویسکاران</li>
              <li>تمام تخصیص‌ها</li>
              <li>تمام وضعیت‌های سرویس</li>
              <li>تنظیمات محلی</li>
            </ul>
            <p className="mt-3 text-sm text-gray-600">
              کاربر فعلی: {profile?.full_name} ({profile?.email})
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="confirm-text">
              برای تایید، کلمه "RESET" را تایپ کنید:
            </Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RESET"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="admin-password">
              رمز عبور مدیریت:
            </Label>
            <Input
              id="admin-password"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="رمز عبور مدیریت را وارد کنید"
              className="mt-1"
            />
          </div>
        </div>

        <AlertDialogFooter className="flex-row-reverse">
          <AlertDialogCancel 
            onClick={() => {
              setConfirmText('');
              setAdminPassword('');
            }}
          >
            انصراف
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReset}
            disabled={confirmText !== 'RESET' || !adminPassword || isResetting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isResetting ? 'در حال بازنشانی...' : 'بازنشانی سیستم'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SystemReset;
