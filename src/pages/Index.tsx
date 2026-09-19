import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCustomers, fetchTechnicians, getAssignments, getServiceStatuses } from '../utils/supabase';
import { Customer, Technician } from '../types/supabase';
import Navigation from '../components/Navigation';
import CustomerManagement from '../components/CustomerManagement';
import TechnicianManagement from '../components/TechnicianManagement';
import AssignmentManagement from '../components/AssignmentManagement';
import ShamsiCalendar from '../components/ShamsiCalendar';
import SystemReset from '../components/SystemReset';
import { getTodayJalali } from '../utils/dateConverter';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export default function Index() {
  const [activeTab, setActiveTab] = useState<string>(() => {
    // Restore active tab from localStorage if available
    const savedTab = localStorage.getItem("activeTab");
    return savedTab || "customers";
  });
  
  const today = getTodayJalali();

  // Save active tab to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("activeTab", activeTab);
  }, [activeTab]);

  const { 
    data: customers = [], 
    refetch: refetchCustomers,
    isLoading: isLoadingCustomers
  } = useQuery({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const {
    data: technicians = [],
    refetch: refetchTechnicians,
    isLoading: isLoadingTechs
  } = useQuery({
    queryKey: ['technicians'],
    queryFn: fetchTechnicians,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const {
    data: assignments = {},
    refetch: refetchAssignments,
    isLoading: isLoadingAssignments
  } = useQuery({
    queryKey: ['assignments', today.jy, today.jm],
    queryFn: () => getAssignments(today.jy, today.jm),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const {
    data: serviceStatus = {},
    refetch: refetchServiceStatus,
    isLoading: isLoadingServiceStatus
  } = useQuery({
    queryKey: ['serviceStatus', today.jy, today.jm],
    queryFn: () => getServiceStatuses(today.jy, today.jm),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const isLoading = isLoadingCustomers || isLoadingTechs || isLoadingAssignments || isLoadingServiceStatus;

  const handleDataChange = useCallback(() => {
    refetchCustomers();
    refetchTechnicians();
    refetchAssignments();
    refetchServiceStatus();
  }, [refetchCustomers, refetchTechnicians, refetchAssignments, refetchServiceStatus]);

  // System reset function
  const handleSystemReset = async () => {
    try {
      // Delete all data in the tables
      await supabase.from('service_status').delete().not('id', 'is', null);
      await supabase.from('assignments').delete().not('id', 'is', null);
      await supabase.from('customers').delete().not('id', 'is', null);
      await supabase.from('technicians').delete().not('id', 'is', null);
      
      // Clear local storage
      localStorage.clear();
      
      // Refresh all data
      handleDataChange();
      
      return Promise.resolve();
    } catch (error) {
      console.error("Error during system reset:", error);
      return Promise.reject(error);
    }
  };

  return (
    <div dir="rtl" className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <SystemReset onReset={handleSystemReset} />
      </div>
      
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {isLoading ? (
        <div className="text-center p-12">در حال بارگذاری...</div>
      ) : (
        <>
          {activeTab === "customers" && (
            <CustomerManagement customers={customers} onDataChange={handleDataChange} />
          )}
          
          {activeTab === "techs" && (
            <TechnicianManagement 
              technicians={technicians} 
              assignments={assignments} 
              onDataChange={handleDataChange} 
            />
          )}
          
          {activeTab === "assign" && (
            <AssignmentManagement 
              customers={customers}
              technicians={technicians}
              assignments={assignments}
              serviceStatus={serviceStatus}
              onDataChange={handleDataChange}
            />
          )}
          
          {activeTab === "calendar" && (
            <ShamsiCalendar
              customers={customers}
              technicians={technicians}
              onDataChange={handleDataChange}
            />
          )}
        </>
      )}
    </div>
  );
}
