import React, { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Customer, Technician } from '../types/supabase';
import { shamsiMonths, getTodayJalali, getShamsiDaysInMonth, getShamsiFirstDayOfWeek } from '../utils/dateConverter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAssignments, getServiceStatuses, updateServiceStatus, saveAssignment } from '../utils/supabase';
import { toast } from "@/components/ui/use-toast";

interface ShamsiCalendarProps {
  customers: Customer[];
  technicians: Technician[];
  onDataChange: () => void;
}

const ShamsiCalendar: React.FC<ShamsiCalendarProps> = ({ customers, technicians, onDataChange }) => {
  const today = getTodayJalali();
  const [selectedYear, setSelectedYear] = useState<number>(today.jy);
  const [selectedMonth, setSelectedMonth] = useState<number>(today.jm);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Fetch assignments and service status
  const { data: assignments = {}, refetch: refetchAssignments } = useQuery({
    queryKey: ['assignments', selectedYear, selectedMonth],
    queryFn: () => getAssignments(selectedYear, selectedMonth),
    staleTime: 5 * 60 * 1000,
  });

  const { data: serviceStatus = {}, refetch: refetchServiceStatus } = useQuery({
    queryKey: ['serviceStatus', selectedYear, selectedMonth],
    queryFn: () => getServiceStatuses(selectedYear, selectedMonth),
    staleTime: 5 * 60 * 1000,
  });

  const years = Array.from({ length: 10 }, (_, i) => today.jy - 2 + i);

  // Filter customers by selected day service_day
  const filteredCustomers = selectedDay 
    ? customers.filter(customer => {
        // Extract date from service_day if it's just a number
        const dayNumber = parseInt(customer.service_day);
        if (!isNaN(dayNumber)) {
          return dayNumber === selectedDay;
        }
        // Otherwise, try to match the day name (like "شنبه")
        return false;
      })
    : [];

  // Navigate to previous month
  const goToPrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear(selectedYear - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
    setSelectedDay(null);
  };

  // Navigate to next month
  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear(selectedYear + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
    setSelectedDay(null);
  };

  // Toggle service status mutation
  const toggleServiceStatusMutation = useMutation({
    mutationFn: ({ customerId, isDone }: { customerId: string, isDone: boolean }) => 
      updateServiceStatus(customerId, selectedYear, selectedMonth, isDone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceStatus', selectedYear, selectedMonth] });
      onDataChange();
      toast({
        title: "موفقیت",
        description: "وضعیت سرویس با موفقیت به‌روز شد",
      });
    }
  });

  // Add new mutation for assigning technicians from the calendar
  const assignTechnicianMutation = useMutation({
    mutationFn: ({ customerId, technicianId }: { customerId: string, technicianId: string }) => 
      saveAssignment(customerId, technicianId, selectedYear, selectedMonth),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', selectedYear, selectedMonth] });
      queryClient.invalidateQueries({ queryKey: ['serviceStatus', selectedYear, selectedMonth] });
      onDataChange();
      toast({
        title: "موفقیت",
        description: "سرویسکار با موفقیت تخصیص داده شد",
      });
    }
  });

  // Handle service status toggle
  const toggleServiceStatus = (customerId: string, isDone: boolean) => {
    toggleServiceStatusMutation.mutate({ customerId, isDone });
  };

  // Handle technician assignment
  const assignTechnician = (customerId: string, technicianId: string) => {
    assignTechnicianMutation.mutate({ customerId, technicianId });
  };

  // Render Shamsi calendar
  const renderCalendar = () => {
    const daysInMonth = getShamsiDaysInMonth(selectedYear, selectedMonth);
    const firstDay = getShamsiFirstDayOfWeek(selectedYear, selectedMonth);
    
    const rows = [];
    let day = 1;
    let finished = false;
    
    for (let row = 0; row < 6 && !finished; row++) {
      const cells = [];
      for (let col = 0; col < 7; col++) {
        const cellIdx = row * 7 + col;
        
        if (cellIdx < firstDay) {
          cells.push(<td key={`empty-${cellIdx}`} className="py-1 text-gray-300 text-center">-</td>);
        } else if (day > daysInMonth) {
          cells.push(<td key={`empty-end-${cellIdx}`} className="py-1 text-gray-300 text-center">-</td>);
          finished = true;
        } else {
          const isCurrent = (selectedYear === today.jy && selectedMonth === today.jm && day === today.jd);
          
          // Check for customers with service on this day
          const dayCustomers = customers.filter(c => {
            // Extract date from service_day if it's just a number
            const dayNumber = parseInt(c.service_day);
            if (!isNaN(dayNumber)) {
              return dayNumber === day;
            }
            // Otherwise, try to match the day name (like "شنبه")
            return false;
          });

          // Check for completed services
          const doneCustomers = dayCustomers.filter(customer => {
            const key = `${customer.id}-${selectedYear}-${selectedMonth}`;
            return serviceStatus[key];
          });
          
          const hasUndoneCustomers = doneCustomers.length < dayCustomers.length && dayCustomers.length > 0;
          const hasAllDoneCustomers = doneCustomers.length === dayCustomers.length && dayCustomers.length > 0;
          
          let cellClassName = "text-center h-10 w-10 mx-auto flex items-center justify-center rounded-full text-lg font-bold cursor-pointer";
          
          if (isCurrent) {
            cellClassName += " bg-red-600 text-white";
          } else if (hasAllDoneCustomers) {
            cellClassName += " bg-green-200 text-black border-2 border-green-500";
          } else if (hasUndoneCustomers) {
            cellClassName += " bg-yellow-300 text-black hover:bg-yellow-400 border-2 border-yellow-600";
          } else if (dayCustomers.length > 0) {
            cellClassName += " bg-yellow-300 text-black border-2 border-yellow-500";
          } else {
            cellClassName += " hover:bg-green-50";
          }
          
          const currentDay = day;
          cells.push(
            <td key={`day-${day}`} className="p-1 text-center">
              <div 
                className={cellClassName}
                onClick={() => setSelectedDay(currentDay)}
              >
                {currentDay}
              </div>
            </td>
          );
          day++;
        }
      }
      
      rows.push(<tr key={`row-${row}`}>{cells}</tr>);
      if (finished && row < 5) {
        // Add empty row for better spacing
        const emptyCells = [];
        for (let col = 0; col < 7; col++) {
          emptyCells.push(<td key={`empty-final-${col}`} className="py-1 text-transparent">-</td>);
        }
        rows.push(<tr key="empty-final-row">{emptyCells}</tr>);
      }
    }
    
    return (
      <table className="w-full mt-2 text-center border-collapse">
        <thead>
          <tr className="bg-green-100 text-green-800">
            <th className="py-2 border">شنبه</th>
            <th className="py-2 border">یک‌شنبه</th>
            <th className="py-2 border">دوشنبه</th>
            <th className="py-2 border">سه‌شنبه</th>
            <th className="py-2 border">چهارشنبه</th>
            <th className="py-2 border">پنج‌شنبه</th>
            <th className="py-2 border">جمعه</th>
          </tr>
        </thead>
        <tbody className="bg-white border">{rows}</tbody>
      </table>
    );
  };

  // Render customer list for selected day
  const renderDayCustomers = () => {
    if (!selectedDay || filteredCustomers.length === 0) {
      return (
        <div className="bg-yellow-50 p-4 rounded text-gray-600 text-center">
          {selectedDay ? "سرویسی در این روز وجود ندارد" : "لطفا یک روز را انتخاب کنید"}
        </div>
      );
    }

    return (
      <div className="bg-yellow-100 rounded-lg p-4 shadow">
        <h4 className="font-bold mb-2 text-yellow-900">
          سرویس‌های روز {selectedDay} {shamsiMonths[selectedMonth-1]}
        </h4>
        <ul className="list-disc pr-5 space-y-4">
          {filteredCustomers.map(customer => {
            const key = `${customer.id}-${selectedYear}-${selectedMonth}`;
            const isDone = serviceStatus[key];
            const techId = assignments[key];
            const technician = technicians.find(t => t.id === techId);

            return (
              <li key={customer.id} className="text-yellow-900 font-semibold">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <span className="text-blue-800">{customer.customer_name}</span>
                    {technician && (
                      <span 
                        className="mr-2 px-2 py-1 rounded text-white text-xs" 
                        style={{ backgroundColor: technician.color }}
                      >
                        {technician.name}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex-grow">
                      <Select 
                        value={techId || ""}
                        onValueChange={(value) => assignTechnician(customer.id, value)}
                      >
                        <SelectTrigger className="w-full md:w-40">
                          <SelectValue placeholder="انتخاب سرویسکار" />
                        </SelectTrigger>
                        <SelectContent>
                          {technicians.map(tech => (
                            <SelectItem 
                              key={tech.id} 
                              value={tech.id}
                              className="flex items-center"
                            >
                              <span
                                className="inline-block w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: tech.color }}
                              ></span>
                              {tech.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      {isDone ? 
                        <Button onClick={() => toggleServiceStatus(customer.id, false)} size="sm" variant="destructive">
                          لغو انجام شد
                        </Button> : null
                      }
                    </div>
                  </div>
                </div>
                {customer.address && <div className="text-sm text-gray-600 mt-1">{customer.address}</div>}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <Card className="p-4 bg-white shadow-md rounded-lg border-0">
      <div className="w-full mb-7">
        <div className="bg-green-600 flex flex-col md:flex-row md:justify-between items-center rounded-lg px-4 py-3 text-white">
          <div className="flex items-center">
            <span className="text-2xl font-bold">
              {selectedDay ? `${selectedDay} ` : ''}
              {shamsiMonths[selectedMonth-1]} {selectedYear}
            </span>
          </div>
          <div className="flex items-center mt-3 md:mt-0 gap-3">
            <Button onClick={goToPrevMonth} variant="outline" className="bg-white text-gray-800">
              ماه قبل
            </Button>
            
            <Select value={selectedYear.toString()} onValueChange={v => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="text-lg py-2 px-4 rounded-md border border-gray-400 bg-white text-gray-800 font-bold focus:outline-none focus:ring-2 focus:ring-green-400 w-24">
                <SelectValue placeholder="سال" />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedMonth.toString()} onValueChange={v => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="text-lg py-2 px-4 rounded-md border border-gray-400 bg-white text-gray-800 font-bold focus:outline-none focus:ring-2 focus:ring-green-400 w-32">
                <SelectValue placeholder="ماه" />
              </SelectTrigger>
              <SelectContent>
                {shamsiMonths.map((month, index) => (
                  <SelectItem key={index+1} value={(index+1).toString()}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button onClick={goToNextMonth} variant="outline" className="bg-white text-gray-800">
              ماه بعد
            </Button>
          </div>
        </div>
        <div className="mt-3">
          {renderCalendar()}
        </div>
        <div className="mt-4">
          {renderDayCustomers()}
        </div>
      </div>
    </Card>
  );
};

export default ShamsiCalendar;
