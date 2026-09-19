import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { Customer } from '../types/supabase';
import { saveCustomer, deleteCustomer, updateCustomer } from '../utils/supabase';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CustomerManagementProps {
  customers: Customer[];
  onDataChange: () => void;
}

const CustomerManagement: React.FC<CustomerManagementProps> = ({ customers, onDataChange }) => {
  const queryClient = useQueryClient();
  const [showAdditionalFields, setShowAdditionalFields] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState('all');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [orderedCustomers, setOrderedCustomers] = useState<Customer[]>([]);
  
  // Initialize ordered customers
  useEffect(() => {
    setOrderedCustomers(customers);
  }, [customers]);

  const [newCustomer, setNewCustomer] = useState<Omit<Customer, "id" | "created_at">>({
    contract_number: '',
    customer_name: '',
    building_name: '',
    phone: '',
    region: '',
    start_date: '',
    end_date: '',
    service_day: '',
    monthly_service: '',
    contract_amount: '',
    address: ''
  });

  const addCustomerMutation = useMutation({
    mutationFn: saveCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onDataChange();
      toast({
        title: "موفقیت",
        description: "مشتری با موفقیت اضافه شد"
      });
      
      // Reset form
      setNewCustomer({
        contract_number: '',
        customer_name: '',
        building_name: '',
        phone: '',
        region: '',
        start_date: '',
        end_date: '',
        service_day: '',
        monthly_service: '',
        contract_amount: '',
        address: ''
      });
    },
    onError: (error) => {
      toast({
        title: "خطا",
        description: "مشکل در اضافه کردن مشتری",
        variant: "destructive"
      });
      console.error("Error adding customer:", error);
    }
  });

  const updateCustomerMutation = useMutation({
    mutationFn: updateCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onDataChange();
      toast({
        title: "موفقیت",
        description: "مشتری با موفقیت بروزرسانی شد"
      });
      setIsEditDialogOpen(false);
      setEditingCustomer(null);
    },
    onError: (error) => {
      toast({
        title: "خطا",
        description: "مشکل در بروزرسانی مشتری",
        variant: "destructive"
      });
      console.error("Error updating customer:", error);
    }
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onDataChange();
      toast({
        title: "موفقیت",
        description: "مشتری با موفقیت حذف شد"
      });
    },
    onError: (error) => {
      toast({
        title: "خطا",
        description: "مشکل در حذف مشتری",
        variant: "destructive"
      });
      console.error("Error deleting customer:", error);
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    const fieldName = id.replace('manual', '') as keyof typeof newCustomer;
    const camelFieldName = fieldName.charAt(0).toLowerCase() + fieldName.slice(1) as keyof typeof newCustomer;
    
    setNewCustomer(prev => ({
      ...prev,
      [camelFieldName]: value
    }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingCustomer) return;

    const { id, value } = e.target;
    const fieldName = id.replace('edit', '') as keyof Customer;
    const camelFieldName = fieldName.charAt(0).toLowerCase() + fieldName.slice(1) as keyof Customer;
    
    setEditingCustomer(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [camelFieldName]: value
      };
    });
  };

  const addCustomer = () => {
    if (!newCustomer.customer_name || !newCustomer.service_day) {
      toast({
        title: "خطا",
        description: "نام مشتری و روز سرویس الزامی است",
        variant: "destructive"
      });
      return;
    }

    addCustomerMutation.mutate(newCustomer);
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer({...customer});
    setIsEditDialogOpen(true);
  };

  const saveEditedCustomer = () => {
    if (!editingCustomer) return;
    
    if (!editingCustomer.customer_name || !editingCustomer.service_day) {
      toast({
        title: "خطا",
        description: "نام مشتری و روز سرویس الزامی است",
        variant: "destructive"
      });
      return;
    }

    updateCustomerMutation.mutate(editingCustomer);
  };

  const removeCustomer = (id: string) => {
    if (window.confirm('آیا از حذف این مشتری اطمینان دارید؟')) {
      deleteCustomerMutation.mutate(id);
    }
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        
        // بارگذاری همه مشتری‌ها از فایل اکسل
        for (const row of rows as Record<string, string>[]) {
          const customer = {
            contract_number: row["شماره قرارداد"] || "",
            customer_name: row["نام مشتری"] || "",
            building_name: row["نام ساختمان"] || "",
            phone: row["همراه"] || "",
            region: row["منطقه"] || "",
            start_date: row["تاریخ شروع"] || "",
            end_date: row["تاریخ پایان"] || "",
            service_day: row["روز سرویس"] || "",
            monthly_service: row["سرویس ماهیانه"] || "",
            contract_amount: row["مبلغ قرارداد"] || "",
            address: row["آدرس"] || ""
          };
          
          if (customer.customer_name && customer.service_day) {
            await saveCustomer(customer);
          }
        }
        
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        onDataChange();
        toast({ title: "موفقیت", description: "اطلاعات با موفقیت بارگذاری شد" });
      } catch (error) {
        console.error(error);
        toast({
          title: "خطا",
          description: "مشکلی در خواندن فایل اکسل به وجود آمد",
          variant: "destructive"
        });
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset input
    e.target.value = '';
  };

  const createSampleExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["شماره قرارداد", "نام مشتری", "نام ساختمان", "همراه", "منطقه", "تاریخ شروع", "تاریخ پایان", "روز سرویس", "سرویس ماهیانه", "مبلغ قرارداد", "آدرس"],
      ["1234", "شرکت الف", "برج آ", "09120000000", "1", "1402/01/01", "1402/12/29", "15", "1", "50000000", "تهران، خیابان ..."],
      ["5678", "شرکت ب", "برج ب", "09121111111", "2", "1402/02/01", "1402/12/29", "10", "1", "30000000", "تهران، خیابان ..."]
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, "نمونه-مشتریان.xlsx");
  };

  // Handle drag-and-drop reordering
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const items = Array.from(orderedCustomers);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setOrderedCustomers(items);
  };

  // Get unique regions for filter dropdown
  const uniqueRegions = Array.from(new Set(customers.map(c => c.region).filter(Boolean)));

  // Filter customers by search term and field
  const filteredCustomers = orderedCustomers.filter(customer => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    switch (searchField) {
      case 'customer_name':
        return customer.customer_name.toLowerCase().includes(searchLower);
      case 'region':
        return customer.region?.toLowerCase().includes(searchLower);
      case 'address':
        return customer.address?.toLowerCase().includes(searchLower);
      case 'contract_number':
        return customer.contract_number?.toLowerCase().includes(searchLower);
      case 'phone':
        return customer.phone?.toLowerCase().includes(searchLower);
      case 'all':
      default:
        return (
          customer.customer_name.toLowerCase().includes(searchLower) ||
          (customer.contract_number?.toLowerCase().includes(searchLower)) ||
          (customer.building_name?.toLowerCase().includes(searchLower)) ||
          (customer.phone?.toLowerCase().includes(searchLower)) ||
          (customer.region?.toLowerCase().includes(searchLower)) ||
          (customer.address?.toLowerCase().includes(searchLower))
        );
    }
  });

  return (
    <Card className="p-4 bg-white shadow-md mb-8">
      <div className="mb-6">
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <div>
            <h3 className="block text-sm font-bold mb-1">فایل اکسل مشتریان</h3>
            <Input 
              id="excelFile" 
              type="file" 
              accept=".xlsx,.xls"
              className="w-auto inline-block"
              onChange={handleExcelUpload}
            />
            <Button 
              variant="default"
              size="sm"
              className="mr-2"
              onClick={() => document.getElementById('excelFile')?.click()}
            >
              بارگذاری
            </Button>
            <Button 
              variant="outline"
              size="sm"
              className="bg-green-500 text-white hover:bg-green-600"
              onClick={createSampleExcel}
            >
              دانلود نمونه
            </Button>
          </div>
        </div>

        <Card className="bg-blue-50 p-4 rounded mb-4">
          <h3 className="font-bold text-blue-700 mb-2">افزودن دستی مشتری</h3>
          
          {!showAdditionalFields && (
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => setShowAdditionalFields(true)}
                className="w-full"
              >
                نمایش فرم افزودن مشتری
              </Button>
            </div>
          )}

          {showAdditionalFields && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                <Input
                  id="manualContractNumber"
                  value={newCustomer.contract_number}
                  onChange={handleInputChange}
                  placeholder="شماره قرارداد"
                />
                <Input
                  id="manualCustomerName"
                  value={newCustomer.customer_name}
                  onChange={handleInputChange}
                  placeholder="نام مشتری"
                />
                <Input
                  id="manualServiceDay"
                  type="number"
                  value={newCustomer.service_day}
                  onChange={handleInputChange}
                  placeholder="روز سرویس"
                />
              
                <Input
                  id="manualBuildingName"
                  value={newCustomer.building_name}
                  onChange={handleInputChange}
                  placeholder="نام ساختمان"
                />
                <Input
                  id="manualPhone"
                  value={newCustomer.phone}
                  onChange={handleInputChange}
                  placeholder="همراه"
                />
                <Input
                  id="manualRegion"
                  value={newCustomer.region}
                  onChange={handleInputChange}
                  placeholder="منطقه"
                />
                <Input
                  id="manualStartDate"
                  value={newCustomer.start_date}
                  onChange={handleInputChange}
                  placeholder="تاریخ شروع"
                />
                <Input
                  id="manualEndDate"
                  value={newCustomer.end_date}
                  onChange={handleInputChange}
                  placeholder="تاریخ پایان"
                />
                <Input
                  id="manualMonthlyService"
                  type="number"
                  value={newCustomer.monthly_service}
                  onChange={handleInputChange}
                  placeholder="سرویس ماهیانه"
                />
                <Input
                  id="manualContractAmount"
                  type="number"
                  value={newCustomer.contract_amount}
                  onChange={handleInputChange}
                  placeholder="مبلغ قرارداد"
                />
                <Input
                  id="manualAddress"
                  value={newCustomer.address}
                  onChange={handleInputChange}
                  placeholder="آدرس"
                  className="md:col-span-2"
                />
              </div>

              <div className="flex gap-2 mt-3">
                <Button 
                  onClick={addCustomer}
                  disabled={addCustomerMutation.isPending}
                >
                  {addCustomerMutation.isPending ? 'در حال ثبت...' : 'افزودن مشتری'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAdditionalFields(false)}
                >
                  مخفی کردن فرم
                </Button>
              </div>
            </>
          )}
        </Card>

        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-2">
          <h3 className="font-bold text-gray-700">لیست مشتریان</h3>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-grow md:w-64">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="جستجوی مشتری..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-3 pr-10"
              />
            </div>
            <Select value={searchField} onValueChange={setSearchField}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="فیلتر جستجو" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه فیلدها</SelectItem>
                <SelectItem value="customer_name">نام مشتری</SelectItem>
                <SelectItem value="region">منطقه</SelectItem>
                <SelectItem value="address">آدرس</SelectItem>
                <SelectItem value="contract_number">شماره قرارداد</SelectItem>
                <SelectItem value="phone">تلفن</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="customers">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ردیف</TableHead>
                        <TableHead>شماره قرارداد</TableHead>
                        <TableHead>نام مشتری</TableHead>
                        <TableHead>نام ساختمان</TableHead>
                        <TableHead>همراه</TableHead>
                        <TableHead>منطقه</TableHead>
                        <TableHead>تاریخ شروع</TableHead>
                        <TableHead>تاریخ پایان</TableHead>
                        <TableHead>روز سرویس</TableHead>
                        <TableHead>سرویس ماهیانه</TableHead>
                        <TableHead>مبلغ قرارداد</TableHead>
                        <TableHead>آدرس</TableHead>
                        <TableHead>عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer, index) => (
                        <Draggable 
                          key={customer.id} 
                          draggableId={customer.id} 
                          index={index}
                        >
                          {(provided) => (
                            <TableRow 
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="cursor-move"
                            >
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{customer.contract_number}</TableCell>
                              <TableCell>{customer.customer_name}</TableCell>
                              <TableCell>{customer.building_name}</TableCell>
                              <TableCell>{customer.phone}</TableCell>
                              <TableCell>{customer.region}</TableCell>
                              <TableCell>{customer.start_date}</TableCell>
                              <TableCell>{customer.end_date}</TableCell>
                              <TableCell>{customer.service_day}</TableCell>
                              <TableCell>{customer.monthly_service}</TableCell>
                              <TableCell>{customer.contract_amount}</TableCell>
                              <TableCell>{customer.address}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => openEditDialog(customer)}
                                  >
                                    ویرایش
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => removeCustomer(customer.id)}
                                    disabled={deleteCustomerMutation.isPending}
                                  >
                                    حذف
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </div>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ویرایش مشتری</DialogTitle>
          </DialogHeader>
          {editingCustomer && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
              <Input
                id="editContractNumber"
                value={editingCustomer.contract_number || ''}
                onChange={handleEditInputChange}
                placeholder="شماره قرارداد"
              />
              <Input
                id="editCustomerName"
                value={editingCustomer.customer_name}
                onChange={handleEditInputChange}
                placeholder="نام مشتری"
              />
              <Input
                id="editBuildingName"
                value={editingCustomer.building_name || ''}
                onChange={handleEditInputChange}
                placeholder="نام ساختمان"
              />
              <Input
                id="editPhone"
                value={editingCustomer.phone || ''}
                onChange={handleEditInputChange}
                placeholder="همراه"
              />
              <Input
                id="editRegion"
                value={editingCustomer.region || ''}
                onChange={handleEditInputChange}
                placeholder="منطقه"
              />
              <Input
                id="editStartDate"
                value={editingCustomer.start_date || ''}
                onChange={handleEditInputChange}
                placeholder="تاریخ شروع"
              />
              <Input
                id="editEndDate"
                value={editingCustomer.end_date || ''}
                onChange={handleEditInputChange}
                placeholder="تاریخ پایان"
              />
              <Input
                id="editServiceDay"
                value={editingCustomer.service_day}
                onChange={handleEditInputChange}
                placeholder="روز سرویس"
              />
              <Input
                id="editMonthlyService"
                value={editingCustomer.monthly_service || ''}
                onChange={handleEditInputChange}
                placeholder="سرویس ماهیانه"
              />
              <Input
                id="editContractAmount"
                value={editingCustomer.contract_amount || ''}
                onChange={handleEditInputChange}
                placeholder="مبلغ قرارداد"
              />
              <Input
                id="editAddress"
                value={editingCustomer.address || ''}
                onChange={handleEditInputChange}
                placeholder="آدرس"
                className="md:col-span-2"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              انصراف
            </Button>
            <Button onClick={saveEditedCustomer}>
              ذخیره تغییرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CustomerManagement;
