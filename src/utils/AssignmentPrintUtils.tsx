
import { Customer, Technician } from '../types/supabase';
import { shamsiMonths } from './dateConverter';

export const generatePrintOutput = (
  customers: Customer[],
  technicians: Technician[],
  assignments: Record<string, string>,
  serviceStatus: Record<string, boolean>,
  selectedTech: string,
  selectedRegion: string,
  selectedYear: number,
  selectedMonth: number,
  forAll: boolean = false
): string => {
  let output = "";
  
  if (forAll) {
    technicians.forEach((tech) => {
      output += `<div class="mt-8 mb-4" style="page-break-before: always;">`;
      output += `<h2 class="text-xl font-bold mb-2">سرویسکار: ${tech.name} (${shamsiMonths[selectedMonth-1]} ${selectedYear})</h2>`;
      output += `<p>شماره تماس: ${tech.phone}</p>`;
      
      const techCustomers = customers.filter((customer) => {
        const key = `${customer.id}-${selectedYear}-${selectedMonth}`;
        return assignments[key] === tech.id && 
               (!selectedRegion || selectedRegion === "all" || customer.region === selectedRegion);
      });
      
      if (techCustomers.length === 0) {
        output += "<p>هیچ مشتری تخصیص داده نشده است.</p>";
      } else {
        output += generateCustomerTable(techCustomers, serviceStatus, selectedYear, selectedMonth);
      }
      
      output += `</div>`;
    });
  } else {
    const tech = technicians.find(t => t.id === selectedTech);
    
    if (!tech) return "";
    
    output += `<h2 class="text-xl font-bold mb-2">سرویسکار: ${tech.name} (${shamsiMonths[selectedMonth-1]} ${selectedYear})</h2>`;
    output += `<p>شماره تماس: ${tech.phone}</p>`;
    
    const techCustomers = customers.filter((customer) => {
      const key = `${customer.id}-${selectedYear}-${selectedMonth}`;
      return assignments[key] === selectedTech && 
             (!selectedRegion || selectedRegion === "all" || customer.region === selectedRegion);
    });
    
    if (techCustomers.length === 0) {
      output += "<p>هیچ مشتری تخصیص داده نشده است.</p>";
    } else {
      output += generateCustomerTable(techCustomers, serviceStatus, selectedYear, selectedMonth);
    }
  }
  
  return output;
};

const generateCustomerTable = (
  customers: Customer[],
  serviceStatus: Record<string, boolean>,
  selectedYear: number,
  selectedMonth: number
): string => {
  let table = `<table class="min-w-full border">
    <thead>
      <tr>
        <th class="py-1 px-2 border-b">ردیف</th>
        <th class="py-1 px-2 border-b">نام مشتری</th>
        <th class="py-1 px-2 border-b">منطقه</th>
        <th class="py-1 px-2 border-b">آدرس</th>
        <th class="py-1 px-2 border-b">روز سرویس</th>
        <th class="py-1 px-2 border-b">شماره تماس</th>
        <th class="py-1 px-2 border-b">وضعیت</th>
      </tr>
    </thead>
    <tbody>`;
    
  customers.forEach((customer, i) => {
    const key = `${customer.id}-${selectedYear}-${selectedMonth}`;
    const isDone = serviceStatus[key];
    
    table += `<tr class="${isDone ? 'done-row' : ''}">
      <td class="py-1 px-2 border-b">${i+1}</td>
      <td class="py-1 px-2 border-b">${customer.customer_name}</td>
      <td class="py-1 px-2 border-b">${customer.region || ''}</td>
      <td class="py-1 px-2 border-b">${customer.address || ''}</td>
      <td class="py-1 px-2 border-b">${customer.service_day || ''}</td>
      <td class="py-1 px-2 border-b">${customer.phone || ''}</td>
      <td class="py-1 px-2 border-b ${isDone ? 'done-cell' : ''}">
        ${isDone ? 'انجام شده' : ''}
      </td>
    </tr>`;
  });
    
  table += `</tbody></table>`;
  return table;
};
