import { supabase } from '@/integrations/supabase/client';
import { Customer, Technician, Assignment, ServiceStatus, ServiceReportItem } from '../types/supabase';

export async function fetchCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('customer_name', { ascending: true });
  
  if (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
  
  return data || [];
}

export async function saveCustomer(customer: Omit<Customer, 'id' | 'created_at'>): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .insert([customer])
    .select()
    .single();
  
  if (error) {
    console.error('Error saving customer:', error);
    return null;
  }
  
  return data;
}

export async function updateCustomer(customer: Customer): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .update(customer)
    .eq('id', customer.id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating customer:', error);
    return null;
  }
  
  return data;
}

export async function deleteCustomer(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting customer:', error);
    return false;
  }
  
  return true;
}

export async function fetchTechnicians(): Promise<Technician[]> {
  const { data, error } = await supabase
    .from('technicians')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) {
    console.error('Error fetching technicians:', error);
    return [];
  }
  
  return data || [];
}

export async function saveTechnician(technician: Omit<Technician, 'id' | 'created_at'>): Promise<Technician | null> {
  const { data, error } = await supabase
    .from('technicians')
    .insert([technician])
    .select()
    .single();
  
  if (error) {
    console.error('Error saving technician:', error);
    return null;
  }
  
  return data;
}

export async function updateTechnician(technician: Technician): Promise<Technician | null> {
  const { data, error } = await supabase
    .from('technicians')
    .update(technician)
    .eq('id', technician.id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating technician:', error);
    return null;
  }
  
  return data;
}

export async function deleteTechnician(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('technicians')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting technician:', error);
    return false;
  }
  
  return true;
}

export async function getAssignments(year: number, month: number): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('year', year)
    .eq('month', month);
  
  if (error) {
    console.error('Error fetching assignments:', error);
    return {};
  }
  
  // Convert to the format expected by the app
  const assignments: Record<string, string> = {};
  data.forEach(assignment => {
    assignments[`${assignment.customer_id}-${year}-${month}`] = assignment.technician_id;
  });
  
  return assignments;
}

export async function saveAssignment(customerId: string, technicianId: string, year: number, month: number): Promise<boolean> {
  // Check if exists already
  const { data: existing } = await supabase
    .from('assignments')
    .select('id')
    .eq('customer_id', customerId)
    .eq('year', year)
    .eq('month', month)
    .single();
  
  if (existing) {
    // Update
    const { error } = await supabase
      .from('assignments')
      .update({ technician_id: technicianId })
      .eq('id', existing.id);
    
    if (error) {
      console.error('Error updating assignment:', error);
      return false;
    }
  } else {
    // Insert
    const { error } = await supabase
      .from('assignments')
      .insert([{
        customer_id: customerId,
        technician_id: technicianId,
        year,
        month
      }]);
    
    if (error) {
      console.error('Error saving assignment:', error);
      return false;
    }
  }
  
  // Automatically mark as done when assigned
  await updateServiceStatus(customerId, year, month, true);
  
  return true;
}

export async function removeAssignment(customerId: string, year: number, month: number): Promise<boolean> {
  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('customer_id', customerId)
    .eq('year', year)
    .eq('month', month);
  
  if (error) {
    console.error('Error removing assignment:', error);
    return false;
  }
  
  return true;
}

export async function getServiceStatuses(year: number, month: number): Promise<Record<string, boolean>> {
  const { data, error } = await supabase
    .from('service_status')
    .select('*')
    .eq('year', year)
    .eq('month', month);
  
  if (error) {
    console.error('Error fetching service statuses:', error);
    return {};
  }
  
  // Convert to the format expected by the app
  const statuses: Record<string, boolean> = {};
  data.forEach(status => {
    statuses[`${status.customer_id}-${year}-${month}`] = status.is_done;
  });
  
  return statuses;
}

export async function updateServiceStatus(customerId: string, year: number, month: number, isDone: boolean): Promise<boolean> {
  // Check if exists already
  const { data: existing } = await supabase
    .from('service_status')
    .select('id')
    .eq('customer_id', customerId)
    .eq('year', year)
    .eq('month', month)
    .single();
  
  if (existing) {
    // Update
    const { error } = await supabase
      .from('service_status')
      .update({ is_done: isDone })
      .eq('id', existing.id);
    
    if (error) {
      console.error('Error updating service status:', error);
      return false;
    }
  } else {
    // Insert
    const { error } = await supabase
      .from('service_status')
      .insert([{
        customer_id: customerId,
        year,
        month,
        is_done: isDone
      }]);
    
    if (error) {
      console.error('Error saving service status:', error);
      return false;
    }
  }
  
  return true;
}

/**
 * Gets service reports for a specific date range and optional filters
 */
export async function getServiceReports(
  startDate: Date,
  endDate: Date,
  technicianId?: string,
  region?: string
): Promise<ServiceReportItem[]> {
  try {
    console.log('Retrieving service reports with params:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      technicianId,
      region
    });

    // Convert dates to year/month for comparison
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth() + 1;
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth() + 1;
    
    // Calculate total months to check (for months spanning multiple years)
    const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
    console.log(`Checking across ${totalMonths} months from ${startYear}-${startMonth} to ${endYear}-${endMonth}`);
    
    // Step 1: Get all assignments first
    const { data: allAssignments, error: assignmentError } = await supabase
      .from('assignments')
      .select('*');
    
    if (assignmentError) {
      console.error('Error fetching assignments:', assignmentError);
      return [];
    }
    
    console.log(`Retrieved ${allAssignments?.length || 0} total assignments`);
    
    // Step 2: Filter assignments that fall within date range
    const filteredAssignments = allAssignments?.filter(assignment => {
      // Create a date value for comparison (using 1st of month)
      const assignmentDate = new Date(assignment.year, assignment.month - 1, 1);
      const startDateCompare = new Date(startYear, startMonth - 1, 1);
      const endDateCompare = new Date(endYear, endMonth - 1, 1);
      
      return assignmentDate >= startDateCompare && assignmentDate <= endDateCompare;
    }) || [];
    
    console.log(`After date filtering: ${filteredAssignments.length} assignments within range`);
    
    if (filteredAssignments.length === 0) {
      console.log('No assignments found within the specified date range');
      return [];
    }
    
    // Step 3: Get unique IDs for fetching related data
    const customerIds = Array.from(new Set(filteredAssignments.map(a => a.customer_id)));
    const technicianIds = Array.from(new Set(filteredAssignments.map(a => a.technician_id)));
    
    console.log(`Found ${customerIds.length} unique customers and ${technicianIds.length} unique technicians`);
    
    // Step 4: Fetch customers data
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .in('id', customerIds);
    
    if (customersError) {
      console.error('Error fetching customers:', customersError);
      return [];
    }
    
    // Step 5: Fetch technicians data
    const { data: technicians, error: techniciansError } = await supabase
      .from('technicians')
      .select('*')
      .in('id', technicianIds);
    
    if (techniciansError) {
      console.error('Error fetching technicians:', techniciansError);
      return [];
    }
    
    // Step 6: Fetch service status data
    const { data: serviceStatuses, error: statusError } = await supabase
      .from('service_status')
      .select('*');
    
    if (statusError) {
      console.error('Error fetching service statuses:', statusError);
      return [];
    }
    
    // Step 7: Build complete report data
    const reportData = filteredAssignments.map(assignment => {
      const customer = customers?.find(c => c.id === assignment.customer_id);
      const technician = technicians?.find(t => t.id === assignment.technician_id);
      
      // Find service status
      const status = serviceStatuses?.find(s => 
        s.customer_id === assignment.customer_id && 
        s.year === assignment.year && 
        s.month === assignment.month
      );
      
      const isDone = status?.is_done ?? false;
      
      return {
        id: assignment.id,
        year: assignment.year,
        month: assignment.month,
        isDone: isDone,
        customerName: customer?.customer_name || 'Unknown',
        region: customer?.region || '',
        address: customer?.address || '',
        serviceDay: customer?.service_day || '',
        techName: technician?.name || 'Unassigned',
        techColor: technician?.color || '#CCCCCC',
        techId: technician?.id || '',
        date: `${assignment.year}/${assignment.month}`,
        customer_id: assignment.customer_id,
        technician_id: assignment.technician_id,
      };
    });
    
    // Step 8: Apply additional filters
    const filteredReportData = reportData.filter(item => {
      // Filter by technician if specified
      if (technicianId && technicianId !== 'all' && item.technician_id !== technicianId) {
        return false;
      }
      
      // Filter by region if specified
      if (region && region !== 'all' && item.region !== region) {
        return false;
      }
      
      return true;
    });
    
    console.log(`Final filtered result: ${filteredReportData.length} records after applying filters`);
    
    // Sort by date
    return filteredReportData.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  } catch (error) {
    console.error('Unexpected error in getServiceReports:', error);
    return [];
  }
}
