import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Customer, Technician } from '../types/supabase';
import { saveAssignment } from '../utils/supabase';

interface RotationSuggestionsProps {
  customers: Customer[];
  technicians: Technician[];
  currentAssignments: Record<string, string>;
  year: number;
  month: number;
  onAssign: () => void;
}

const RotationSuggestions: React.FC<RotationSuggestionsProps> = ({
  customers,
  technicians,
  currentAssignments,
  year,
  month,
  onAssign
}) => {
  // تابع برای پیدا کردن سرویسکار بعدی در چرخش
  const getNextTechnician = (currentTechId: string) => {
    const currentIndex = technicians.findIndex(tech => tech.id === currentTechId);
    const nextIndex = (currentIndex + 1) % technicians.length;
    return technicians[nextIndex];
  };

  // ایجاد پیشنهادات چرخشی برای ماه بعد
  const generateSuggestions = () => {
    const suggestions: Array<{
      customer: Customer;
      currentTech: Technician | undefined;
      suggestedTech: Technician | undefined;
    }> = [];

    customers.forEach(customer => {
      const key = `${customer.id}-${year}-${month}`;
      const currentTechId = currentAssignments[key];
      const currentTech = technicians.find(tech => tech.id === currentTechId);
      
      if (currentTech) {
        const suggestedTech = getNextTechnician(currentTech.id);
        suggestions.push({
          customer,
          currentTech,
          suggestedTech
        });
      }
    });

    return suggestions;
  };

  // اعمال همه پیشنهادات
  const applyAllSuggestions = async () => {
    try {
      const suggestions = generateSuggestions();
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      
      for (const suggestion of suggestions) {
        if (suggestion.suggestedTech) {
          await saveAssignment(
            suggestion.customer.id,
            suggestion.suggestedTech.id,
            nextYear,
            nextMonth
          );
        }
      }
      
      toast({
        title: "موفقیت",
        description: "تخصیص‌های چرخشی با موفقیت برای ماه بعد اعمال شد"
      });
      
      onAssign();
    } catch (error) {
      console.error('Error applying suggestions:', error);
      toast({
        title: "خطا",
        description: "مشکلی در اعمال تخصیص‌های چرخشی رخ داد",
        variant: "destructive"
      });
    }
  };

  const suggestions = generateSuggestions();

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-blue-800">
          پیشنهادات چرخشی برای ماه بعد
        </CardTitle>
      </CardHeader>
      <CardContent>
        {suggestions.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نام مشتری</TableHead>
                  <TableHead>سرویسکار فعلی</TableHead>
                  <TableHead>سرویسکار پیشنهادی</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions.map((suggestion, index) => (
                  <TableRow key={index}>
                    <TableCell>{suggestion.customer.customer_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span 
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: suggestion.currentTech?.color }}
                        />
                        {suggestion.currentTech?.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span 
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: suggestion.suggestedTech?.color }}
                        />
                        {suggestion.suggestedTech?.name}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <div className="mt-4">
              <Button 
                onClick={applyAllSuggestions}
                className="bg-green-600 hover:bg-green-700"
              >
                اعمال همه تخصیص‌های پیشنهادی برای ماه بعد
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500 py-4">
            هیچ تخصیصی برای چرخش در ماه جاری یافت نشد
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RotationSuggestions;