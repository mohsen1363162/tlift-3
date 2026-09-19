
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from "@/components/ui/use-toast";
import { saveAssignment, removeAssignment, updateServiceStatus, getAssignments, getServiceStatuses } from '../utils/supabase';
import { getTodayJalali } from '../utils/dateConverter';

export const useAssignmentData = (onDataChange: () => void) => {
  const today = getTodayJalali();
  const queryClient = useQueryClient();
  
  const [selectedTech, setSelectedTech] = useState<string>(() => {
    const saved = localStorage.getItem("selectedTech");
    return saved || "";
  });
  
  const [selectedRegion, setSelectedRegion] = useState<string>(() => {
    const saved = localStorage.getItem("selectedRegion");
    return saved || "all";
  });
  
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const saved = localStorage.getItem("selectedYear");
    return saved ? parseInt(saved) : today.jy;
  });
  
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    const saved = localStorage.getItem("selectedMonth");
    return saved ? parseInt(saved) : today.jm;
  });
  
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    const saved = localStorage.getItem("refreshInterval");
    return saved ? parseInt(saved) : 5;
  });
  
  const [lastSelectedCustomerId, setLastSelectedCustomerId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("selectedTech", selectedTech);
    localStorage.setItem("selectedRegion", selectedRegion);
    localStorage.setItem("selectedYear", selectedYear.toString());
    localStorage.setItem("selectedMonth", selectedMonth.toString());
    localStorage.setItem("refreshInterval", refreshInterval.toString());
  }, [selectedTech, selectedRegion, selectedYear, selectedMonth, refreshInterval]);

  const { data: assignments = {}, refetch: refetchAssignments } = useQuery({
    queryKey: ['assignments', selectedYear, selectedMonth],
    queryFn: () => getAssignments(selectedYear, selectedMonth),
    staleTime: refreshInterval * 60 * 1000,
  });

  const { data: serviceStatus = {}, refetch: refetchServiceStatus } = useQuery({
    queryKey: ['serviceStatus', selectedYear, selectedMonth],
    queryFn: () => getServiceStatuses(selectedYear, selectedMonth),
    staleTime: refreshInterval * 60 * 1000,
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      refetchAssignments();
      refetchServiceStatus();
    }, refreshInterval * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [refetchAssignments, refetchServiceStatus, refreshInterval]);

  const assignMutation = useMutation({
    mutationFn: ({ customerId, technicianId }: { customerId: string, technicianId: string }) => 
      saveAssignment(customerId, technicianId, selectedYear, selectedMonth),
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: ['assignments', selectedYear, selectedMonth] });
      queryClient.invalidateQueries({ queryKey: ['serviceStatus', selectedYear, selectedMonth] });
      
      onDataChange();
      toast({
        title: "موفقیت",
        description: "تخصیص با موفقیت انجام شد",
      });
      
      setLastSelectedCustomerId(customerId);
    }
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: (customerId: string) => removeAssignment(customerId, selectedYear, selectedMonth),
    onSuccess: (_, customerId) => {
      queryClient.invalidateQueries({ queryKey: ['assignments', selectedYear, selectedMonth] });
      onDataChange();
      toast({
        title: "موفقیت",
        description: "تخصیص با موفقیت حذف شد",
      });
      
      if (lastSelectedCustomerId === customerId) {
        setLastSelectedCustomerId(null);
      }
    }
  });

  const updateStatusMutation = useMutation({
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

  const handleManualRefresh = useCallback(() => {
    refetchAssignments();
    refetchServiceStatus();
    toast({
      title: "به‌روزرسانی",
      description: "اطلاعات با موفقیت به‌روز شدند"
    });
  }, [refetchAssignments, refetchServiceStatus]);

  const toggleAssignment = useCallback((customerId: string) => {
    const key = `${customerId}-${selectedYear}-${selectedMonth}`;
    
    if (assignments[key] === selectedTech) {
      removeAssignmentMutation.mutate(customerId);
    } else {
      assignMutation.mutate({ customerId, technicianId: selectedTech });
    }
  }, [assignments, selectedTech, selectedYear, selectedMonth, assignMutation, removeAssignmentMutation]);

  const toggleServiceDone = useCallback((customerId: string) => {
    const key = `${customerId}-${selectedYear}-${selectedMonth}`;
    const isDone = !serviceStatus[key];
    
    updateStatusMutation.mutate({ customerId, isDone });
  }, [serviceStatus, selectedYear, selectedMonth, updateStatusMutation]);

  return {
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
    setLastSelectedCustomerId,
    assignments,
    serviceStatus,
    handleManualRefresh,
    toggleAssignment,
    toggleServiceDone,
    updateStatusMutation
  };
};
