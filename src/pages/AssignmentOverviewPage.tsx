import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { fetchCustomers, fetchTechnicians, getAssignments, getServiceStatuses } from '../utils/supabase';
import AssignmentOverview from '../components/AssignmentOverview';
import { getTodayJalali, shamsiMonths } from '../utils/dateConverter';

const AssignmentOverviewPage: React.FC = () => {
  const today = getTodayJalali();
  
  // Overview tab state
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const saved = localStorage.getItem("overview_selectedYear");
    return saved ? parseInt(saved) : today.jy;
  });
  
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    const saved = localStorage.getItem("overview_selectedMonth");
    return saved ? parseInt(saved) : today.jm;
  });
  
  // Overview filtering state
  const [selectedOverviewTechnician, setSelectedOverviewTechnician] = useState<string>("all");
  const [selectedOverviewRegion, setSelectedOverviewRegion] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Save overview settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("overview_selectedYear", selectedYear.toString());
    localStorage.setItem("overview_selectedMonth", selectedMonth.toString());
  }, [selectedYear, selectedMonth]);
  
  const { 
    data: customers = [], 
    isLoading: isLoadingCustomers 
  } = useQuery({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const {
    data: technicians = [],
    isLoading: isLoadingTechs
  } = useQuery({
    queryKey: ['technicians'],
    queryFn: fetchTechnicians,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const {
    data: assignments = {},
    isLoading: isLoadingAssignments
  } = useQuery({
    queryKey: ['assignments', selectedYear, selectedMonth],
    queryFn: () => getAssignments(selectedYear, selectedMonth),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const {
    data: serviceStatus = {},
    isLoading: isLoadingServiceStatus
  } = useQuery({
    queryKey: ['serviceStatus', selectedYear, selectedMonth],
    queryFn: () => getServiceStatuses(selectedYear, selectedMonth),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const isLoading = isLoadingCustomers || isLoadingTechs || isLoadingAssignments || isLoadingServiceStatus;
  
  // Generate years array for selection (current year ± 5 years)
  const years = Array.from({ length: 11 }, (_, i) => selectedYear - 5 + i);
  
  // Extract unique regions from customers
  const regions = useMemo(() => {
    const uniqueRegions = new Set<string>();
    customers.forEach(customer => {
      if (customer.region) {
        uniqueRegions.add(customer.region);
      }
    });
    return Array.from(uniqueRegions).sort();
  }, [customers]);

  return (
    <div dir="rtl" className="container mx-auto p-4">
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center">
          <Link to="/">
            <Button variant="ghost" size="sm" className="mr-2">
              <ChevronRight className="h-4 w-4 ml-1" />
              بازگشت به صفحه اصلی
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-blue-800">نمای کلی تخصیص‌ها</h1>
        </div>
      </div>
      
      {/* Filtering Card for Overview */}
      <Card className="p-4 bg-white shadow-md mb-6">
        <CardContent className="p-2">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1 text-gray-700">سال</label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="انتخاب سال" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1 text-gray-700">ماه</label>
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="انتخاب ماه" />
                </SelectTrigger>
                <SelectContent>
                  {shamsiMonths.map((month, index) => (
                    <SelectItem key={index} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1 text-gray-700">سرویسکار</label>
              <Select value={selectedOverviewTechnician} onValueChange={setSelectedOverviewTechnician}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="همه سرویسکاران" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه سرویسکاران</SelectItem>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      <div className="flex items-center">
                        <span 
                          className="inline-block w-3 h-3 rounded-full ml-2" 
                          style={{ backgroundColor: tech.color }}
                        ></span>
                        {tech.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1 text-gray-700">منطقه</label>
              <Select value={selectedOverviewRegion} onValueChange={setSelectedOverviewRegion}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="همه مناطق" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه مناطق</SelectItem>
                  {regions.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col md:col-span-2">
              <label className="text-sm font-medium mb-1 text-gray-700">جستجو</label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="جستجو بر اساس نام، منطقه یا روز سرویس..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab content */}
      <div className="mt-4">
        {isLoading ? (
          <div className="text-center p-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
            <p className="mt-2">در حال بارگذاری...</p>
          </div>
        ) : (
          <AssignmentOverview
            customers={customers}
            technicians={technicians}
            assignments={assignments}
            serviceStatus={serviceStatus}
            year={selectedYear}
            month={selectedMonth}
            selectedTechnician={selectedOverviewTechnician}
            selectedRegion={selectedOverviewRegion}
            searchQuery={searchQuery}
          />
        )}
      </div>
    </div>
  );
};

export default AssignmentOverviewPage;
