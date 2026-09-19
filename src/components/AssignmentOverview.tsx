import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, Download, FileSpreadsheet, File } from 'lucide-react';
import { Customer, Technician } from '../types/supabase';
import { shamsiMonths } from '../utils/dateConverter';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';
import { toast } from "@/components/ui/use-toast";

interface AssignmentOverviewProps {
  customers: Customer[];
  technicians: Technician[];
  assignments: Record<string, string>;
  serviceStatus: Record<string, boolean>;
  year: number;
  month: number;
  selectedTechnician?: string;
  selectedRegion?: string;
  searchQuery?: string;
}

const AssignmentOverview: React.FC<AssignmentOverviewProps> = ({
  customers,
  technicians,
  assignments,
  serviceStatus,
  year,
  month,
  selectedTechnician = 'all',
  selectedRegion = 'all',
  searchQuery = ''
}) => {
  // Group customers by technician
  const assignmentsByTechnician = useMemo(() => {
    const result: Record<string, {
      technician: Technician,
      customers: Array<{
        customer: Customer,
        isDone: boolean
      }>
    }> = {};
    
    // Initialize with all technicians (even those without assignments)
    technicians.forEach(tech => {
      result[tech.id] = {
        technician: tech,
        customers: []
      };
    });
    
    // Filter customers based on search query and region
    const filteredCustomers = customers.filter(customer => {
      // Filter by search query
      const matchesSearch = searchQuery === '' || 
        customer.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.region && customer.region.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (customer.service_day && customer.service_day.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Filter by region
      const matchesRegion = selectedRegion === 'all' || customer.region === selectedRegion;
      
      return matchesSearch && matchesRegion;
    });
    
    // Group customers by their assigned technician
    filteredCustomers.forEach(customer => {
      const key = `${customer.id}-${year}-${month}`;
      const techId = assignments[key];
      const isDone = serviceStatus[key] || false;
      
      // Filter by technician
      if (techId && 
          (selectedTechnician === 'all' || techId === selectedTechnician) && 
          result[techId]) {
        result[techId].customers.push({
          customer,
          isDone
        });
      }
    });
    
    return result;
  }, [customers, technicians, assignments, serviceStatus, year, month, selectedTechnician, selectedRegion, searchQuery]);

  // Filter technicians that should be displayed
  const filteredTechnicians = useMemo(() => {
    if (selectedTechnician === 'all') {
      return technicians;
    }
    return technicians.filter(tech => tech.id === selectedTechnician);
  }, [technicians, selectedTechnician]);

  // Prepare data for export
  const exportData = useMemo(() => {
    const data: Array<{
      technicianName: string;
      technicianColor: string;
      customerName: string;
      region: string;
      serviceDay: string;
      status: string;
    }> = [];

    Object.values(assignmentsByTechnician)
      .filter(item => filteredTechnicians.some(tech => tech.id === item.technician.id))
      .forEach(({ technician, customers }) => {
        if (customers.length === 0) {
          data.push({
            technicianName: technician.name,
            technicianColor: technician.color,
            customerName: "بدون مشتری",
            region: "-",
            serviceDay: "-",
            status: "-"
          });
        } else {
          customers.forEach(({ customer, isDone }) => {
            data.push({
              technicianName: technician.name,
              technicianColor: technician.color,
              customerName: customer.customer_name,
              region: customer.region || "-",
              serviceDay: customer.service_day || "-",
              status: isDone ? "انجام شده" : "در انتظار"
            });
          });
        }
      });

    return data;
  }, [assignmentsByTechnician, filteredTechnicians]);

  // Export to Excel
  const exportToExcel = () => {
    try {
      const excelData = exportData.map(item => ({
        'سرویسکار': item.technicianName,
        'نام مشتری': item.customerName,
        'منطقه': item.region,
        'روز سرویس': item.serviceDay,
        'وضعیت': item.status
      }));
      
      // Create workbook and add worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData, {header: [
        'سرویسکار', 'نام مشتری', 'منطقه', 'روز سرویس', 'وضعیت'
      ]});
      
      // Fix RTL issues
      ws['!cols'] = [
        { wch: 20 }, // سرویسکار
        { wch: 25 }, // نام مشتری
        { wch: 15 }, // منطقه
        { wch: 15 }, // روز سرویس
        { wch: 12 }, // وضعیت
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, "نمای کلی تخصیص");
      XLSX.writeFile(wb, `نمای-کلی-تخصیص-${year}-${shamsiMonths[month-1]}.xlsx`);
      
      toast({
        title: "خروجی اکسل",
        description: "فایل اکسل با موفقیت تولید شد.",
      });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast({
        title: "خطا",
        description: "خطایی در تولید فایل اکسل رخ داد.",
        variant: "destructive",
      });
    }
  };

  // Export to PDF - modified to not use jsPDF
  const exportToPDF = () => {
    toast({
      title: "خروجی PDF",
      description: "این قابلیت فعلا غیرفعال است.",
    });
    
    // Print functionality as alternative to PDF
    const printContent = () => {
      const printWindow = window.open('', '_blank');
      
      if (printWindow) {
        printWindow.document.write(`
          <html dir="rtl">
            <head>
              <title>نمای کلی تخصیص - ${shamsiMonths[month-1]} ${year}</title>
              <style>
                body { font-family: Tahoma, Arial, sans-serif; direction: rtl; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background-color: #4285f4; color: white; padding: 8px; text-align: right; }
                td { border: 1px solid #ddd; padding: 8px; }
                tr:nth-child(even) { background-color: #f2f2f2; }
                h1 { text-align: center; }
              </style>
            </head>
            <body>
              <h1>نمای کلی تخصیص - ${shamsiMonths[month-1]} ${year}</h1>
              <table>
                <thead>
                  <tr>
                    <th>سرویسکار</th>
                    <th>نام مشتری</th>
                    <th>منطقه</th>
                    <th>روز سرویس</th>
                    <th>وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  ${exportData.map(item => `
                    <tr>
                      <td>${item.technicianName}</td>
                      <td>${item.customerName}</td>
                      <td>${item.region}</td>
                      <td>${item.serviceDay}</td>
                      <td>${item.status}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </body>
          </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    };
    
    printContent();
  };

  return (
    <Card className="p-4 bg-white shadow-md mb-8 rounded-lg border-0">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-blue-800">
          نمای کلی تخصیص‌ها - {shamsiMonths[month-1]} {year}
        </h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center text-green-700 border-green-500 hover:bg-green-50"
            onClick={exportToExcel}
          >
            <FileSpreadsheet className="ml-1 h-4 w-4" />
            خروجی اکسل
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center text-red-700 border-red-500 hover:bg-red-50"
            onClick={exportToPDF}
          >
            <File className="ml-1 h-4 w-4" />
            چاپ گزارش
          </Button>
        </div>
      </div>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="border-collapse">
            <TableHeader>
              <TableRow className="bg-blue-50">
                <TableHead className="font-bold text-lg">سرویسکار</TableHead>
                <TableHead className="font-bold text-lg">تعداد مشتریان</TableHead>
                <TableHead className="font-bold text-lg">مشتریان تخصیص‌داده‌شده</TableHead>
                <TableHead className="font-bold text-lg">وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTechnicians.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    سرویسکاری یافت نشد
                  </TableCell>
                </TableRow>
              ) : Object.values(assignmentsByTechnician)
                  .filter(item => filteredTechnicians.some(tech => tech.id === item.technician.id))
                  .map(({ technician, customers }) => (
                <TableRow key={technician.id} className="border-b">
                  <TableCell className="align-top">
                    <div className="flex items-center">
                      <span 
                        className="ml-2" 
                        style={{ 
                          background: technician.color, 
                          width: '15px', 
                          height: '15px',
                          borderRadius: '50%', 
                          display: 'inline-block',
                          marginLeft: '8px'
                        }}
                      />
                      <span className="font-medium">{technician.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <span className="font-medium text-blue-700">{customers.length}</span>
                  </TableCell>
                  <TableCell className="align-top">
                    <ul className="list-disc pr-5 space-y-1 text-sm">
                      {customers.length === 0 ? (
                        <li className="text-gray-500">هیچ مشتری تخصیص داده نشده است</li>
                      ) : customers.map(({ customer }) => (
                        <li key={customer.id} className="text-gray-800">
                          <div className="flex flex-col">
                            <span>{customer.customer_name}</span>
                            <span className="text-xs text-gray-500">
                              {customer.region && `منطقه: ${customer.region}`}
                              {customer.service_day && ` - روز: ${customer.service_day}`}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex flex-col space-y-1">
                      {customers.length === 0 ? (
                        <span className="text-gray-500">-</span>
                      ) : (
                        <>
                          <div className="flex items-center mb-1">
                            <span className="font-medium ml-2">انجام شده:</span>
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                              {customers.filter(c => c.isDone).length}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <span className="font-medium ml-2">در انتظار:</span>
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">
                              {customers.filter(c => !c.isDone).length}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssignmentOverview;
