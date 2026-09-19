
import { Customer, Technician } from '../types';

// Save data to localStorage
export const saveData = (
  customers: Customer[],
  technicians: Technician[],
  assignments: Record<string, number>,
  serviceStatus: Record<string, boolean>
) => {
  localStorage.setItem("customers", JSON.stringify(customers));
  localStorage.setItem("technicians", JSON.stringify(technicians));
  localStorage.setItem("assignments", JSON.stringify(assignments));
  localStorage.setItem("serviceStatus", JSON.stringify(serviceStatus));
};

// Load data from localStorage
export const loadData = () => {
  try {
    const savedCustomers = localStorage.getItem("customers");
    const savedTechnicians = localStorage.getItem("technicians");
    const savedAssignments = localStorage.getItem("assignments");
    const savedServiceStatus = localStorage.getItem("serviceStatus");
    
    return {
      customers: savedCustomers ? JSON.parse(savedCustomers) : [],
      technicians: savedTechnicians ? JSON.parse(savedTechnicians) : [],
      assignments: savedAssignments ? JSON.parse(savedAssignments) : {},
      serviceStatus: savedServiceStatus ? JSON.parse(savedServiceStatus) : {}
    };
  } catch (error) {
    console.error("Error loading data from localStorage:", error);
    return {
      customers: [],
      technicians: [],
      assignments: {},
      serviceStatus: {}
    };
  }
};

// Get unique regions from customers
export const getUniqueRegions = (customers: Customer[]) => {
  return Array.from(new Set(customers.map(c => c.region).filter(r => r)));
};
