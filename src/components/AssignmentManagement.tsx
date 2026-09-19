
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Customer, Technician } from '../types/supabase';
import RotationSuggestions from './RotationSuggestions';
import AssignmentFilters from './AssignmentFilters';
import TechnicianLegend from './TechnicianLegend';
import CustomerTable from './CustomerTable';
import { useAssignmentData } from '../hooks/useAssignmentData';
import { generatePrintOutput } from '../utils/AssignmentPrintUtils';

interface AssignmentManagementProps {
  customers: Customer[];
  technicians: Technician[];
  assignments: Record<string, string>;
  serviceStatus: Record<string, boolean>;
  onDataChange: () => void;
}

const AssignmentManagement: React.FC<AssignmentManagementProps> = ({
  customers,
  technicians,
  onDataChange
}) => {
  const {
    selectedTech,
    setSelectedTech,
    selectedRegion,
    setSelectedRegion,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    refreshInterval,
    setRefreshInterval,
    lastSelectedCustomerId,
    assignments,
    serviceStatus,
    handleManualRefresh,
    toggleAssignment,
    toggleServiceDone,
    updateStatusMutation
  } = useAssignmentData(onDataChange);
  
  const [assignmentOutput, setAssignmentOutput] = useState<string>("");
  const [showPrintView, setShowPrintView] = useState<boolean>(false);

  const regions = Array.from(new Set(customers.map(c => c.region).filter(r => r)));

  useEffect(() => {
    if (technicians.length > 0 && !selectedTech) {
      setSelectedTech(technicians[0].id);
    }
  }, [technicians, selectedTech, setSelectedTech]);

  const handleTechnicianSelect = (techId: string) => {
    setSelectedTech(techId);
    localStorage.setItem("selectedTech", techId);
  };

  const handleGeneratePrintOutput = (forAll: boolean = false) => {
    setShowPrintView(true);
    
    const output = generatePrintOutput(
      customers,
      technicians,
      assignments,
      serviceStatus,
      selectedTech,
      selectedRegion,
      selectedYear,
      selectedMonth,
      forAll
    );
    
    setAssignmentOutput(output);
    
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleUpdateStatus = (customerId: string, isDone: boolean) => {
    updateStatusMutation.mutate({ customerId, isDone });
  };

  return (
    <>
      <Card className="p-4 bg-white shadow-md mb-8">
        <AssignmentFilters
          technicians={technicians}
          selectedTech={selectedTech}
          onTechChange={handleTechnicianSelect}
          selectedRegion={selectedRegion}
          onRegionChange={setSelectedRegion}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          refreshInterval={refreshInterval}
          onRefreshIntervalChange={setRefreshInterval}
          onManualRefresh={handleManualRefresh}
          regions={regions}
        />
        
        <div className="flex flex-wrap gap-2 mb-4">
          <Button 
            variant="outline" 
            className="bg-green-500 text-white hover:bg-green-600"
            onClick={() => handleGeneratePrintOutput(false)}
          >
            چاپ سرویس‌های انتخاب‌شده
          </Button>
          <Button 
            variant="outline"
            className="bg-purple-500 text-white hover:bg-purple-600"
            onClick={() => handleGeneratePrintOutput(true)}
          >
            چاپ همه سرویسکاران
          </Button>
        </div>
        
        <TechnicianLegend
          technicians={technicians}
          selectedTech={selectedTech}
          onTechnicianSelect={handleTechnicianSelect}
        />
        
        <CustomerTable
          customers={customers}
          technicians={technicians}
          assignments={assignments}
          serviceStatus={serviceStatus}
          selectedTech={selectedTech}
          selectedRegion={selectedRegion}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          lastSelectedCustomerId={lastSelectedCustomerId}
          onToggleAssignment={toggleAssignment}
          onUpdateStatus={handleUpdateStatus}
        />
      </Card>
      
      <RotationSuggestions 
        customers={customers}
        technicians={technicians}
        currentAssignments={assignments}
        year={selectedYear}
        month={selectedMonth}
        onAssign={onDataChange}
      />
      
      {!showPrintView && (
        <Card className="p-4 bg-white shadow-md mb-8 no-print rounded-lg border-0">
          <h3 className="font-bold mb-2 text-gray-700">خروجی تخصیص برای چاپ</h3>
          <div 
            className="border p-4 rounded min-h-[100px] bg-gray-50"
            dangerouslySetInnerHTML={{ __html: assignmentOutput || '<div class="text-gray-500 text-center">برای نمایش خروجی، ابتدا تخصیص را انجام دهید</div>' }}
          />
        </Card>
      )}
      
      {showPrintView && (
        <div className="p-4">
          <Button 
            className="no-print mb-4 bg-blue-600 hover:bg-blue-700" 
            onClick={() => setShowPrintView(false)}
          >
            بازگشت به نمای عادی
          </Button>
          <div className="print-content" dangerouslySetInnerHTML={{ __html: assignmentOutput }} />
        </div>
      )}
      
      <style>
        {`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-content {
            display: block !important;
          }
        }
        .done-row {
          color: #16a34a;
        }
        .done-cell {
          color: #16a34a;
          font-weight: bold;
        }
        .system-reset-dialog {
          background-color: white !important;
        }
        .system-reset-dialog p {
          color: #333;
        }
        `}
      </style>
    </>
  );
};

export default AssignmentManagement;
