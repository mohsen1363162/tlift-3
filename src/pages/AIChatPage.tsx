
import * as React from 'react'
import { Link } from 'react-router-dom'
import AIChat from '../components/AIChat'
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

const AIChatPage: React.FC = () => {
  return (
    <div dir="rtl" className="container mx-auto p-4 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-blue-800">دستیار هوشمند</h1>
        <Link to="/">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4" />
            بازگشت به صفحه اصلی
          </Button>
        </Link>
      </div>
      
      <AIChat />
    </div>
  )
}

export default AIChatPage
