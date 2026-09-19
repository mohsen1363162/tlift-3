import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";
import { saveTechnician, deleteTechnician, updateTechnician } from '../utils/supabase';
import { Technician } from '../types/supabase';
import { CirclePlus, Edit, Trash } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TechnicianManagementProps {
  technicians: Technician[];
  assignments?: Record<string, string>;
  onDataChange: () => void;
}

const TechnicianManagement: React.FC<TechnicianManagementProps> = ({ 
  technicians, 
  assignments,
  onDataChange
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [color, setColor] = useState('#e53935');
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const techColors = [
    { value: '#e53935', label: 'قرمز' },
    { value: '#1e88e5', label: 'آبی' },
    { value: '#fdd835', label: 'زرد' },
    { value: '#43a047', label: 'سبز' },
    { value: '#8e24aa', label: 'بنفش' },
    { value: '#ff6f00', label: 'نارنجی' },
    { value: '#ff69b4', label: 'صورتی' }
  ];

  const addTechnicianMutation = useMutation({
    mutationFn: (tech: { name: string; phone: string; color: string }) => saveTechnician(tech),
    onSuccess: () => {
      toast({
        title: "موفقیت",
        description: "سرویسکار با موفقیت اضافه شد"
      });
      setName('');
      setPhone('');
      onDataChange();
    },
    onError: (error) => {
      toast({
        title: "خطا",
        description: "مشکل در اضافه کردن سرویسکار",
        variant: "destructive"
      });
      console.error("Error adding technician:", error);
    }
  });

  const updateTechnicianMutation = useMutation({
    mutationFn: (tech: Technician) => updateTechnician(tech),
    onSuccess: () => {
      toast({
        title: "موفقیت",
        description: "سرویسکار با موفقیت بروزرسانی شد"
      });
      setIsEditDialogOpen(false);
      onDataChange();
    },
    onError: (error) => {
      toast({
        title: "خطا",
        description: "مشکل در بروزرسانی سرویسکار",
        variant: "destructive"
      });
      console.error("Error updating technician:", error);
    }
  });

  const deleteTechnicianMutation = useMutation({
    mutationFn: deleteTechnician,
    onSuccess: () => {
      toast({
        title: "موفقیت",
        description: "سرویسکار با موفقیت حذف شد"
      });
      onDataChange();
    },
    onError: (error) => {
      toast({
        title: "خطا",
        description: "مشکل در حذف سرویسکار",
        variant: "destructive"
      });
      console.error("Error deleting technician:", error);
    }
  });

  const handleAddTechnician = () => {
    if (!name.trim()) {
      toast({
        title: "خطا",
        description: "نام سرویسکار الزامی است",
        variant: "destructive"
      });
      return;
    }
    
    addTechnicianMutation.mutate({ name, phone, color });
  };

  const openEditDialog = (technician: Technician) => {
    setEditingTechnician({...technician});
    setIsEditDialogOpen(true);
  };

  const saveEditedTechnician = () => {
    if (!editingTechnician) return;
    
    if (!editingTechnician.name.trim()) {
      toast({
        title: "خطا",
        description: "نام سرویسکار الزامی است",
        variant: "destructive"
      });
      return;
    }

    updateTechnicianMutation.mutate(editingTechnician);
  };

  const removeTechnician = (id: string) => {
    if (!window.confirm('آیا از حذف این سرویسکار اطمینان دارید؟')) {
      return;
    }

    deleteTechnicianMutation.mutate(id);
  };

  return (
    <Card className="p-4 bg-white shadow-md mb-8">
      <Card className="bg-blue-50 p-4 rounded mb-4">
        <h3 className="font-bold text-blue-700 mb-2">افزودن سرویسکار جدید</h3>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="نام سرویسکار"
            className="w-auto"
          />
          <Input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="شماره تماس"
            className="w-auto"
          />
          
          <Select value={color} onValueChange={setColor}>
            <SelectTrigger className="w-[150px]">
              <div className="flex items-center">
                <span className="color-circle ml-2" style={{ background: color }}></span>
                <SelectValue placeholder="انتخاب رنگ" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {techColors.map(c => (
                <SelectItem key={c.value} value={c.value}>
                  <div className="flex items-center">
                    <span className="color-circle ml-2" style={{ background: c.value }}></span>
                    {c.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            onClick={handleAddTechnician}
            disabled={addTechnicianMutation.isPending}
          >
            {addTechnicianMutation.isPending ? 'در حال ثبت...' : 'افزودن'}
          </Button>
        </div>
      </Card>

      <h3 className="font-bold mb-2 text-gray-700">لیست سرویسکاران</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ردیف</TableHead>
              <TableHead>نام</TableHead>
              <TableHead>شماره تماس</TableHead>
              <TableHead>رنگ</TableHead>
              <TableHead>عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {technicians.map((technician, index) => (
              <TableRow key={technician.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{technician.name}</TableCell>
                <TableCell>{technician.phone}</TableCell>
                <TableCell>
                  <span className="color-circle" style={{ background: technician.color }}></span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openEditDialog(technician)}
                    >
                      ویرایش
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeTechnician(technician.id)}
                      disabled={deleteTechnicianMutation.isPending}
                    >
                      حذف
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ویرایش سرویسکار</DialogTitle>
          </DialogHeader>
          {editingTechnician && (
            <div className="grid grid-cols-1 gap-4 my-4">
              <div className="grid gap-2">
                <Label htmlFor="editName">نام سرویسکار</Label>
                <Input
                  id="editName"
                  value={editingTechnician.name}
                  onChange={(e) => setEditingTechnician({...editingTechnician, name: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editPhone">شماره تماس</Label>
                <Input
                  id="editPhone"
                  value={editingTechnician.phone || ''}
                  onChange={(e) => setEditingTechnician({...editingTechnician, phone: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label>رنگ</Label>
                <Select 
                  value={editingTechnician.color} 
                  onValueChange={(value) => setEditingTechnician({...editingTechnician, color: value})}
                >
                  <SelectTrigger>
                    <div className="flex items-center">
                      <span className="color-circle ml-2" style={{ background: editingTechnician.color }}></span>
                      <SelectValue placeholder="انتخاب رنگ" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {techColors.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center">
                          <span className="color-circle ml-2" style={{ background: c.value }}></span>
                          {c.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              انصراف
            </Button>
            <Button onClick={saveEditedTechnician}>
              ذخیره تغییرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TechnicianManagement;