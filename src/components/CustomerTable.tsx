
import React, { useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, XCircle } from "lucide-react";
import { Customer, Technician } from '../types/supabase';

interface CustomerTableProps {
  customers: Customer[];
  technicians: Technician[];
  assignments: Record<string, string>;
  serviceStatus: Record<string, boolean>;
  selectedTech: string;
  selectedRegion: string;
  selectedYear: number;
  selectedMonth: number;
  lastSelectedCustomerId: string | null;
  onToggleAssignment: (customerId: string) => void;
  onUpdateStatus: (customerId: string, isDone: boolean) => void;
}

const CustomerTable: React.FC<CustomerTableProps> = ({
  customers,
  technicians,
  assignments,
  serviceStatus,
  selectedTech,
  selectedRegion,
  selectedYear,
  selectedMonth,
  lastSelectedCustomerId,
  onToggleAssignment,
  onUpdateStatus
}) => {
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lastSelectedCustomerId && tableRef.current) {
      const selectedRow = document.getElementById(`customer-row-${lastSelectedCustomerId}`);
      if (selectedRow) {
        tableRef.current.scrollTop = selectedRow.offsetTop - tableRef.current.offsetTop;
      }
    }
  }, [lastSelectedCustomerId]);

  const filteredCustomers = customers.filter(customer => {
    return !selectedRegion || selectedRegion === "all" || customer.region === selectedRegion;
  });

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    const keyA = `${a.id}-${selectedYear}-${selectedMonth}`;
    const keyB = `${b.id}-${selectedYear}-${selectedMonth}`;
    
    const isAAssignedToCurrent = assignments[keyA] === selectedTech;
    const isBAssignedToCurrent = assignments[keyB] === selectedTech;
    
    const isAAssignedToAny = Boolean(assignments[keyA]);
    const isBAssignedToAny = Boolean(assignments[keyB]);
    
    if (isAAssignedToCurrent !== isBAssignedToCurrent) {
      return isAAssignedToCurrent ? 1 : -1;
    }
    
    if (isAAssignedToAny !== isBAssignedToAny) {
      return isAAssignedToAny ? 1 : -1;
    }
    
    return 0;
  });

  if (selectedTech === "") {
    return null;
  }

  return (
    <>
      <h3 className="font-bold mb-2 text-gray-700">مشتریان این سرویسکار</h3>
      <div ref={tableRef} className="overflow-x-auto max-h-[60vh] overflow-y-auto">
        <Table className="border-collapse">
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-bold">انتخاب</TableHead>
              <TableHead className="font-bold">نام مشتری</TableHead>
              <TableHead className="font-bold">منطقه</TableHead>
              <TableHead className="font-bold">روز سرویس</TableHead>
              <TableHead className="font-bold">وضعیت</TableHead>
              <TableHead className="font-bold">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCustomers.map((customer) => {
              const key = `${customer.id}-${selectedYear}-${selectedMonth}`;
              const isAssigned = assignments[key] === selectedTech;
              const isDone = serviceStatus[key];
              const assignedTechId = assignments[key];
              const assignedTech = technicians.find(t => t.id === assignedTechId);
              
              let rowStyle = "";
              let bgStyle = {};
              
              if (isDone) {
                rowStyle = "done-row";
                bgStyle = { backgroundColor: "rgba(220, 252, 231, 0.8)" };
              } else if (isAssigned) {
                rowStyle = "assigned-row";
                if (assignedTech?.color) {
                  bgStyle = { backgroundColor: `${assignedTech.color}40` };
                }
              } else if (assignedTechId) {
                rowStyle = "other-assigned-row";
                if (assignedTech?.color) {
                  bgStyle = { backgroundColor: `${assignedTech.color}20` };
                }
              }
              
              const isSelected = lastSelectedCustomerId === customer.id;
              
              const displayName = assignedTechId ? 
                `${customer.customer_name} (${assignedTech?.name || 'نامشخص'})` : 
                customer.customer_name;
              
              return (
                <TableRow 
                  id={`customer-row-${customer.id}`}
                  key={customer.id} 
                  className={`${rowStyle} ${isSelected ? 'ring-2 ring-blue-500' : ''} hover:bg-gray-50 cursor-pointer transition-colors`}
                  style={bgStyle}
                  onClick={() => onToggleAssignment(customer.id)}
                >
                  <TableCell>
                    <Checkbox
                      checked={isAssigned}
                      onCheckedChange={() => onToggleAssignment(customer.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {displayName}
                  </TableCell>
                  <TableCell>{customer.region}</TableCell>
                  <TableCell>{customer.service_day}</TableCell>
                  <TableCell>
                    {isAssigned && (
                      <div className="flex items-center">
                        <span className={`font-bold ${isDone ? "text-green-700" : "text-gray-500"}`}>
                          {isDone ? 'انجام شد' : ''}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {assignedTechId && (
                      <div className="flex gap-2">
                        {!isDone ? (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-green-500 text-white hover:bg-green-600 h-8 px-2 py-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateStatus(customer.id, true);
                            }}
                            title="ثبت انجام سرویس"
                          >
                            <CheckCircle2 className="w-4 h-4 ml-1" />
                            انجام شد
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="bg-amber-500 text-white hover:bg-amber-600 h-8 px-2 py-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateStatus(customer.id, false);
                            }}
                            title="لغو انجام سرویس"
                          >
                            <XCircle className="w-4 h-4 ml-1" />
                            لغو انجام شد
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default CustomerTable;
