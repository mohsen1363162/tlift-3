
export type Customer = {
  id: string;
  contract_number?: string;
  customer_name: string;
  building_name?: string;
  phone?: string;
  region?: string;
  start_date?: string;
  end_date?: string;
  service_day: string;
  monthly_service?: string;
  contract_amount?: string;
  address?: string;
  created_at?: string;
};

export type Technician = {
  id: string;
  name: string;
  phone?: string;
  color: string;
  created_at?: string;
};

export type Assignment = {
  id: string;
  customer_id: string;
  technician_id: string;
  year: number;
  month: number;
  created_at?: string;
};

export type ServiceStatus = {
  id: string;
  customer_id: string;
  year: number;
  month: number;
  is_done: boolean;
  created_at?: string;
};

// Types for extended functionality
export type AssignmentWithDetails = Assignment & {
  customer?: Customer;
  technician?: Technician;
};

export type ServiceStatusWithDetails = ServiceStatus & {
  customer?: Customer;
};

export type ServiceReportItem = {
  id: string;
  year: number;
  month: number;
  isDone: boolean;
  customerName: string;
  region: string;
  address: string;
  serviceDay: string;
  techName: string;
  techColor: string;
  techId: string;
  date: string;
  customer_id: string;
  technician_id: string;
};

