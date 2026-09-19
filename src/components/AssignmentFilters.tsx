
import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw } from "lucide-react";
import { shamsiMonths } from '../utils/dateConverter';
import { Technician } from '../types/supabase';

interface AssignmentFiltersProps {
  technicians: Technician[];
  selectedTech: string;
  onTechChange: (techId: string) => void;
  selectedRegion: string;
  onRegionChange: (region: string) => void;
  selectedYear: number;
  onYearChange: (year: number) => void;
  selectedMonth: number;
  onMonthChange: (month: number) => void;
  refreshInterval: number;
  onRefreshIntervalChange: (interval: number) => void;
  onManualRefresh: () => void;
  regions: string[];
}

const AssignmentFilters: React.FC<AssignmentFiltersProps> = ({
  technicians,
  selectedTech,
  onTechChange,
  selectedRegion,
  onRegionChange,
  selectedYear,
  onYearChange,
  selectedMonth,
  onMonthChange,
  refreshInterval,
  onRefreshIntervalChange,
  onManualRefresh,
  regions
}) => {
  const years = [1402, 1403, 1404, 1405];

  return (
    <div className="mb-4 flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="font-medium">انتخاب سرویسکار:</label>
        <Select value={selectedTech} onValueChange={onTechChange}>
          <SelectTrigger className="w-[200px] bg-white">
            <SelectValue placeholder="انتخاب سرویسکار" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            {technicians.map((tech) => (
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
      
      <div className="flex items-center gap-2">
        <label className="font-medium">فیلتر منطقه:</label>
        <Select value={selectedRegion} onValueChange={onRegionChange}>
          <SelectTrigger className="w-[150px] bg-white">
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
      
      <div className="flex items-center gap-2">
        <label className="font-medium">سال:</label>
        <Select value={selectedYear.toString()} onValueChange={v => onYearChange(Number(v))}>
          <SelectTrigger className="w-[100px] bg-white">
            <SelectValue placeholder="سال" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            {years.map(year => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center gap-2">
        <label className="font-medium">ماه:</label>
        <Select value={selectedMonth.toString()} onValueChange={v => onMonthChange(Number(v))}>
          <SelectTrigger className="w-[120px] bg-white">
            <SelectValue placeholder="ماه" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            {shamsiMonths.map((month, index) => (
              <SelectItem key={index} value={(index + 1).toString()}>{month}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center gap-2">
        <label className="font-medium">بازه به‌روزرسانی (دقیقه):</label>
        <Select value={refreshInterval.toString()} onValueChange={v => onRefreshIntervalChange(Number(v))}>
          <SelectTrigger className="w-[100px] bg-white">
            <SelectValue placeholder="زمان" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem key="1min" value="1">1</SelectItem>
            <SelectItem key="5min" value="5">5</SelectItem>
            <SelectItem key="10min" value="10">10</SelectItem>
            <SelectItem key="30min" value="30">30</SelectItem>
            <SelectItem key="60min" value="60">60</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Button 
        variant="outline" 
        size="icon"
        onClick={onManualRefresh}
        className="h-10 w-10 rounded-full"
        title="به‌روزرسانی"
      >
        <RefreshCw className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default AssignmentFilters;
