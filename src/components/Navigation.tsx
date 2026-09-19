
import React from 'react';
import { Link } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-8 justify-between items-center">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="w-full border rounded bg-white overflow-x-auto flex whitespace-nowrap">
          <TabsTrigger value="customers" className="flex-1">مشتریان</TabsTrigger>
          <TabsTrigger value="techs" className="flex-1">سرویسکاران</TabsTrigger>
          <TabsTrigger value="assign" className="flex-1">تخصیص</TabsTrigger>
          <TabsTrigger value="calendar" className="flex-1">تقویم</TabsTrigger>
        </TabsList>
      </Tabs>
      
      <div className="flex gap-2">
        <Link to="/ai-chat" className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition-colors">
          دستیار هوشمند
        </Link>
        <Link to="/assignment-overview" className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition-colors">
          نمای کلی تخصیص و گزارشات
        </Link>
      </div>
    </div>
  );
};

export default Navigation;
