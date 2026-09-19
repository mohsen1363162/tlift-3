
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from 'lucide-react';
import { toast } from "@/components/ui/use-toast";
import { 
  jalaliToGregorian, 
  gregorianToJalali, 
  shamsiMonths, 
  getTodayJalali,
  getShamsiDaysInMonth,
  getShamsiFirstDayOfWeek
} from '../utils/dateConverter';
import { getServiceReports } from '../utils/supabase';
import { Customer, Technician, ServiceReportItem } from '../types/supabase';
import { cn } from "@/lib/utils";

interface ServiceReportsProps {
  customers: Customer[];
  technicians: Technician[];
}

interface ReportDateRange {
  startDateJalali: { jy: number; jm: number; jd: number } | null;
  endDateJalali: { jy: number; jm: number; jd: number } | null;
  startDate: Date | null;
  endDate: Date | null;
}

const ServiceReports: React.FC<ServiceReportsProps> = ({
  customers,
  technicians
}) => {
  const today = getTodayJalali();
  
  // Initialize state from localStorage if available
  const [selectedTech, setSelectedTech] = useState<string>(() => {
    const saved = localStorage.getItem("reports_selectedTech");
    return saved || "all";
  });
  
  const [selectedRegion, setSelectedRegion] = useState<string>(() => {
    const saved = localStorage.getItem("reports_selectedRegion");
    return saved || "all";
  });
  
  const [dateRange, setDateRange] = useState<ReportDateRange>(() => {
    try {
      // Try to restore from localStorage
      const savedDateRange = localStorage.getItem("reports_dateRange");
      if (savedDateRange) {
        const parsed = JSON.parse(savedDateRange);
        
        // Convert date strings back to Date objects
        if (parsed.startDate) parsed.startDate = new Date(parsed.startDate);
        if (parsed.endDate) parsed.endDate = new Date(parsed.endDate);
        
        return parsed;
      }
    } catch (error) {
      console.error("Error restoring date range from localStorage:", error);
    }
    
    // Default values if nothing is in localStorage
    const currentYear = today.jy;
    const currentMonth = today.jm;
    
    // Default to current month (1st to last day)
    const startJalali = { jy: currentYear, jm: currentMonth, jd: 1 };
    const endJalali = { jy: currentYear, jm: currentMonth, jd: getShamsiDaysInMonth(currentYear, currentMonth) };
    
    // Convert to Gregorian
    const [startGY, startGM, startGD] = jalaliToGregorian(startJalali.jy, startJalali.jm, startJalali.jd);
    const [endGY, endGM, endGD] = jalaliToGregorian(endJalali.jy, endJalali.jm, endJalali.jd);
    
    return {
      startDateJalali: startJalali,
      endDateJalali: endJalali,
      startDate: new Date(startGY, startGM - 1, startGD),
      endDate: new Date(endGY, endGM - 1, endGD)
    };
  });
  
  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("reports_selectedTech", selectedTech);
    localStorage.setItem("reports_selectedRegion", selectedRegion);
    
    // Create a copy of dateRange that's safe to stringify
    const dateRangeForStorage = {
      ...dateRange,
      startDate: dateRange.startDate ? dateRange.startDate.toISOString() : null,
      endDate: dateRange.endDate ? dateRange.endDate.toISOString() : null
    };
    
    localStorage.setItem("reports_dateRange", JSON.stringify(dateRangeForStorage));
  }, [selectedTech, selectedRegion, dateRange]);
  
  // Debug the date range values
  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) {
      console.log('Current date range for reports:', {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        startDateJalali: dateRange.startDateJalali,
        endDateJalali: dateRange.endDateJalali
      });
    }
  }, [dateRange]);
  
  // Convert Jalali date to Gregorian for the Date object
  const setJalaliDate = (date: { jy: number; jm: number; jd: number }, isStart: boolean) => {
    if (!date) return;
    
    // Convert Jalali to Gregorian
    const [gy, gm, gd] = jalaliToGregorian(date.jy, date.jm, date.jd);
    const gregorianDate = new Date(gy, gm - 1, gd);
    
    if (isStart) {
      setDateRange({
        ...dateRange,
        startDateJalali: date,
        startDate: gregorianDate
      });
    } else {
      setDateRange({
        ...dateRange,
        endDateJalali: date,
        endDate: gregorianDate
      });
    }
  };
  
  // Format Jalali date for display
  const formatJalaliDate = (jalaliDate: { jy: number; jm: number; jd: number } | null) => {
    if (!jalaliDate) return "انتخاب تاریخ";
    return `${jalaliDate.jd} ${shamsiMonths[jalaliDate.jm-1]} ${jalaliDate.jy}`;
  };
  
  // Get unique regions from customers
  const regions = Array.from(new Set(customers.map(c => c.region).filter(r => r)));
  
  // Sort technicians alphabetically
  const sortedTechnicians = [...technicians].sort((a, b) => 
    a.name.localeCompare(b.name)
  );
  
  // Query for fetching service reports data - refactored with better error handling and debugging
  const { 
    data: reportData = [], 
    isLoading, 
    refetch, 
    isError,
    error 
  } = useQuery({
    queryKey: ['serviceReports', dateRange.startDate?.toISOString(), dateRange.endDate?.toISOString(), selectedTech, selectedRegion],
    queryFn: async () => {
      if (!dateRange.startDate || !dateRange.endDate) {
        console.log('Date range not set, skipping report fetch');
        return [];
      }
      
      try {
        console.log('Fetching service reports with params:', {
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
          technicianId: selectedTech !== "all" ? selectedTech : undefined,
          region: selectedRegion !== "all" ? selectedRegion : undefined
        });
        
        const results = await getServiceReports(
          dateRange.startDate,
          dateRange.endDate,
          selectedTech !== "all" ? selectedTech : undefined,
          selectedRegion !== "all" ? selectedRegion : undefined
        );
        
        console.log("Service report results:", results);
        if (!results || results.length === 0) {
          console.log("No results returned from getServiceReports");
        }
        
        return results || [];
      } catch (e) {
        console.error("Error fetching service reports:", e);
        throw e;
      }
    },
    enabled: !!(dateRange.startDate && dateRange.endDate),
    staleTime: 0, // Don't cache, always fetch fresh data
    refetchOnWindowFocus: false
  });
  
  useEffect(() => {
    if (error) {
      console.error("Error in reports query:", error);
      toast({
        title: "خطا",
        description: "خطا در دریافت گزارش. لطفا دوباره تلاش کنید.",
        variant: "destructive"
      });
    }
  }, [error]);
  
  const generateReport = () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      toast({
        title: "خطا",
        description: "لطفا بازه زمانی را انتخاب کنید",
        variant: "destructive"
      });
      return;
    }
    
    refetch();
    
    toast({
      title: "گزارش‌گیری",
      description: "گزارش با موفقیت تولید شد"
    });
  };

  // Function to handle month change in the calendar
  const changeMonth = (isStart: boolean, increment: boolean) => {
    const currentDate = isStart ? 
      (dateRange.startDateJalali || { jy: today.jy, jm: today.jm, jd: 1 }) : 
      (dateRange.endDateJalali || { jy: today.jy, jm: today.jm, jd: 1 });
    
    let newMonth = currentDate.jm;
    let newYear = currentDate.jy;
    
    if (increment) {
      if (newMonth === 12) {
        newMonth = 1;
        newYear += 1;
      } else {
        newMonth += 1;
      }
    } else {
      if (newMonth === 1) {
        newMonth = 12;
        newYear -= 1;
      } else {
        newMonth -= 1;
      }
    }
    
    return { jy: newYear, jm: newMonth, jd: currentDate.jd };
  };

  // Function to handle year change in the calendar
  const changeYear = (isStart: boolean, year: number) => {
    const currentDate = isStart ? 
      (dateRange.startDateJalali || { jy: today.jy, jm: today.jm, jd: 1 }) : 
      (dateRange.endDateJalali || { jy: today.jy, jm: today.jm, jd: 1 });
    
    return { ...currentDate, jy: year };
  };
  
  // Function to set the current view of the calendar
  const setCalendarView = (isStart: boolean, year: number, month: number) => {
    if (isStart) {
      setDateRange({
        ...dateRange,
        startDateJalali: { 
          ...(dateRange.startDateJalali || { jd: 1 }),
          jy: year,
          jm: month
        }
      });
    } else {
      setDateRange({
        ...dateRange,
        endDateJalali: {
          ...(dateRange.endDateJalali || { jd: 1 }),
          jy: year,
          jm: month
        }
      });
    }
  };

  // Function to handle date selection from Persian calendar
  const handleDateSelect = (isStart: boolean, day: number, year: number, month: number) => {
    const selectedDate = { jy: year, jm: month, jd: day };
    setJalaliDate(selectedDate, isStart);
  };

  // Function to render calendar rows
  const renderCalendarRows = (year: number, month: number, isStart: boolean) => {
    const daysInMonth = getShamsiDaysInMonth(year, month);
    const firstDay = getShamsiFirstDayOfWeek(year, month);
    
    const rows = [];
    let day = 1;
    let finished = false;
    
    for (let row = 0; row < 6 && !finished; row++) {
      const cells = [];
      for (let col = 6; col >= 0; col--) { // Reverse direction for RTL (right to left)
        const cellIdx = row * 7 + (6 - col); // Adjust index for RTL
        
        if (cellIdx < firstDay) {
          cells.push(<td key={`empty-${cellIdx}`} className="py-1 text-center text-gray-300">-</td>);
        } else if (day > daysInMonth) {
          cells.push(<td key={`empty-end-${cellIdx}`} className="py-1 text-center text-gray-300">-</td>);
          finished = true;
        } else {
          const currentDay = day;
          
          const cellClassName = "text-center cursor-pointer";
          let dayClassName = "h-8 w-8 rounded-full flex items-center justify-center mx-auto text-sm";
          
          if (year === today.jy && month === today.jm && day === today.jd) {
            dayClassName += " bg-red-600 text-white";
          } else {
            dayClassName += " hover:bg-blue-100";
          }
          
          cells.push(
            <td key={`day-${day}`} className={cellClassName} onClick={() => handleDateSelect(isStart, currentDay, year, month)}>
              <div className={dayClassName}>
                {currentDay}
              </div>
            </td>
          );
          day++;
        }
      }
      
      rows.push(<tr key={`row-${row}`} className="border-b border-gray-100">{cells}</tr>);
      if (finished && row < 5) {
        break;
      }
    }
    
    return rows;
  };
  
  return (
    <Card className="p-4 bg-white shadow-md mb-8 rounded-lg border-0">
      <h2 className="text-xl font-bold mb-4 text-blue-800">گزارش سرویس‌های انجام شده</h2>
      
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date Range Selector - Start Date */}
        <div className="flex flex-col space-y-1">
          <label className="font-medium text-blue-700">از تاریخ:</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-right font-vazir bg-white",
                  !dateRange.startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatJalaliDate(dateRange.startDateJalali)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3 bg-white" align="start">
              {/* Calendar rendering for start date */}
              <div className="font-vazir p-2">
                <div className="flex justify-between items-center mb-2 bg-blue-50 p-2 rounded">
                  <button 
                    onClick={() => {
                      const newDate = changeMonth(true, false);
                      setCalendarView(true, newDate.jy, newDate.jm);
                    }}
                    className="text-blue-700 hover:bg-blue-100 rounded-full p-1"
                  >
                    &lt;
                  </button>
                  
                  <div className="flex gap-2">
                    <Select 
                      value={dateRange.startDateJalali?.jm.toString() || today.jm.toString()} 
                      onValueChange={(v) => setCalendarView(true, dateRange.startDateJalali?.jy || today.jy, parseInt(v))}
                    >
                      <SelectTrigger className="w-24 bg-white">
                        <SelectValue placeholder="ماه" />
                      </SelectTrigger>
                      <SelectContent>
                        {shamsiMonths.map((m, i) => (
                          <SelectItem key={`start-month-${i}`} value={(i+1).toString()}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select 
                      value={(dateRange.startDateJalali?.jy || today.jy).toString()} 
                      onValueChange={(v) => setCalendarView(true, parseInt(v), dateRange.startDateJalali?.jm || today.jm)}
                    >
                      <SelectTrigger className="w-20 bg-white">
                        <SelectValue placeholder="سال" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 11 }, (_, i) => (dateRange.startDateJalali?.jy || today.jy) - 5 + i).map((y) => (
                          <SelectItem key={`start-year-${y}`} value={y.toString()}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <button 
                    onClick={() => {
                      const newDate = changeMonth(true, true);
                      setCalendarView(true, newDate.jy, newDate.jm);
                    }}
                    className="text-blue-700 hover:bg-blue-100 rounded-full p-1"
                  >
                    &gt;
                  </button>
                </div>
                
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-blue-50 text-blue-800">
                      <th className="py-2 text-center">جمعه</th>
                      <th className="py-2 text-center">پنج‌شنبه</th>
                      <th className="py-2 text-center">چهارشنبه</th>
                      <th className="py-2 text-center">سه‌شنبه</th>
                      <th className="py-2 text-center">دوشنبه</th>
                      <th className="py-2 text-center">یک‌شنبه</th>
                      <th className="py-2 text-center">شنبه</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderCalendarRows(
                      dateRange.startDateJalali?.jy || today.jy,
                      dateRange.startDateJalali?.jm || today.jm,
                      true
                    )}
                  </tbody>
                </table>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Date Range Selector - End Date */}
        <div className="flex flex-col space-y-1">
          <label className="font-medium text-blue-700">تا تاریخ:</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-right font-vazir bg-white",
                  !dateRange.endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatJalaliDate(dateRange.endDateJalali)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3 bg-white" align="start">
              {/* Calendar rendering for end date */}
              <div className="font-vazir p-2">
                <div className="flex justify-between items-center mb-2 bg-blue-50 p-2 rounded">
                  <button 
                    onClick={() => {
                      const newDate = changeMonth(false, false);
                      setCalendarView(false, newDate.jy, newDate.jm);
                    }}
                    className="text-blue-700 hover:bg-blue-100 rounded-full p-1"
                  >
                    &lt;
                  </button>
                  
                  <div className="flex gap-2">
                    <Select 
                      value={dateRange.endDateJalali?.jm.toString() || today.jm.toString()} 
                      onValueChange={(v) => setCalendarView(false, dateRange.endDateJalali?.jy || today.jy, parseInt(v))}
                    >
                      <SelectTrigger className="w-24 bg-white">
                        <SelectValue placeholder="ماه" />
                      </SelectTrigger>
                      <SelectContent>
                        {shamsiMonths.map((m, i) => (
                          <SelectItem key={`end-month-${i}`} value={(i+1).toString()}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select 
                      value={(dateRange.endDateJalali?.jy || today.jy).toString()} 
                      onValueChange={(v) => setCalendarView(false, parseInt(v), dateRange.endDateJalali?.jm || today.jm)}
                    >
                      <SelectTrigger className="w-20 bg-white">
                        <SelectValue placeholder="سال" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 11 }, (_, i) => (dateRange.endDateJalali?.jy || today.jy) - 5 + i).map((y) => (
                          <SelectItem key={`end-year-${y}`} value={y.toString()}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <button 
                    onClick={() => {
                      const newDate = changeMonth(false, true);
                      setCalendarView(false, newDate.jy, newDate.jm);
                    }}
                    className="text-blue-700 hover:bg-blue-100 rounded-full p-1"
                  >
                    &gt;
                  </button>
                </div>
                
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-blue-50 text-blue-800">
                      <th className="py-2 text-center">جمعه</th>
                      <th className="py-2 text-center">پنج‌شنبه</th>
                      <th className="py-2 text-center">چهارشنبه</th>
                      <th className="py-2 text-center">سه‌شنبه</th>
                      <th className="py-2 text-center">دوشنبه</th>
                      <th className="py-2 text-center">یک‌شنبه</th>
                      <th className="py-2 text-center">شنبه</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderCalendarRows(
                      dateRange.endDateJalali?.jy || today.jy,
                      dateRange.endDateJalali?.jm || today.jm,
                      false
                    )}
                  </tbody>
                </table>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Technician Filter */}
        <div className="flex flex-col space-y-1">
          <label className="font-medium text-blue-700">سرویسکار:</label>
          <Select value={selectedTech} onValueChange={setSelectedTech}>
            <SelectTrigger className="w-full bg-white">
              <SelectValue placeholder="همه سرویسکاران" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem key="all-techs" value="all">همه سرویسکاران</SelectItem>
              {sortedTechnicians.map((tech) => (
                <SelectItem key={tech.id} value={tech.id}>
                  <div className="flex items-center">
                    <span 
                      className="color-circle ml-2" 
                      style={{ 
                        background: tech.color, 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '50%', 
                        display: 'inline-block' 
                      }}
                    />
                    {tech.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Region Filter */}
        <div className="flex flex-col space-y-1">
          <label className="font-medium text-blue-700">منطقه:</label>
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-full bg-white">
              <SelectValue placeholder="همه مناطق" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem key="all-regions" value="all">همه مناطق</SelectItem>
              {regions.map(region => (
                <SelectItem key={region} value={region}>{region}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Generate Report Button */}
      <div className="mb-6">
        <Button 
          onClick={generateReport}
          className="bg-blue-600 hover:bg-blue-700"
          disabled={!dateRange.startDate || !dateRange.endDate}
        >
          تولید گزارش
        </Button>
      </div>
      
      {/* Results Table */}
      <div className="overflow-x-auto">
        <Table className="border-collapse">
          <TableHeader>
            <TableRow className="bg-blue-50">
              <TableHead className="font-bold">نام مشتری</TableHead>
              <TableHead className="font-bold">منطقه</TableHead>
              <TableHead className="font-bold">سرویسکار</TableHead>
              <TableHead className="font-bold">تاریخ انجام</TableHead>
              <TableHead className="font-bold">روز سرویس</TableHead>
              <TableHead className="font-bold">وضعیت</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
                  <p className="mt-2">در حال بارگذاری...</p>
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-red-600">
                  خطا در دریافت اطلاعات. لطفا مجددا تلاش کنید.
                </TableCell>
              </TableRow>
            ) : reportData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  {dateRange.startDate && dateRange.endDate 
                    ? "هیچ داده‌ای برای نمایش وجود ندارد. لطفا در این بازه زمانی تخصیص‌ها را بررسی کنید."
                    : "برای مشاهده گزارش، ابتدا بازه زمانی را انتخاب کنید و دکمه 'تولید گزارش' را بفشارید."
                  }
                </TableCell>
              </TableRow>
            ) : (
              reportData.map((item: ServiceReportItem, index) => (
                <TableRow key={index} className={index % 2 === 0 ? "bg-blue-50" : ""}>
                  <TableCell className="font-medium">{item.customerName}</TableCell>
                  <TableCell>{item.region}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <span 
                        className="color-circle ml-2" 
                        style={{ 
                          background: item.techColor || '#CCCCCC', 
                          width: '10px', 
                          height: '10px', 
                          borderRadius: '50%', 
                          display: 'inline-block' 
                        }}
                      />
                      {item.techName}
                    </div>
                  </TableCell>
                  <TableCell>{item.date}</TableCell>
                  <TableCell>{item.serviceDay}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-md text-sm ${item.isDone 
                      ? "bg-green-100 text-green-800" 
                      : "bg-yellow-100 text-yellow-800"}`}
                    >
                      {item.isDone ? "انجام شده" : "در انتظار"}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

export default ServiceReports;
