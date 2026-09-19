import * as React from 'react'
import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/components/ui/use-toast'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2 } from "lucide-react"

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!input.trim()) return

    const userMessage = input.trim()
    setInput('')
    
    // Add user message to the chat
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    
    setIsLoading(true)
    
    try {
      const { data, error } = await supabase.functions.invoke('chat-with-groq', {
        body: { message: userMessage }
      })
      
      if (error) {
        throw new Error(`Error: ${error.message}`)
      }
      
      if (!data?.response) {
        throw new Error('پاسخی از سرور دریافت نشد')
      }
      
      // Add assistant response to the chat
      setMessages((prev) => [...prev, { 
        role: 'assistant', 
        content: data.response
      }])
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'خطا',
        description: 'مشکلی در ارتباط با سرویس هوش مصنوعی رخ داده است.',
        variant: 'destructive'
      })
      
      // Add error message to the chat
      setMessages((prev) => [...prev, { 
        role: 'assistant', 
        content: 'متاسفانه در پردازش پیام شما مشکلی رخ داد. لطفاً دوباره تلاش کنید.' 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <Card className="flex-1 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-center">دستیار هوشمند</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                به دستیار هوشمند خوش آمدید. چگونه می‌توانم به شما کمک کنم؟
              </div>
            ) : (
              <>
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`mb-4 p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-100 text-right mr-8'
                        : 'bg-gray-100 ml-8'
                    }`}
                  >
                    <div className="text-sm font-semibold mb-1">
                      {msg.role === 'user' ? 'شما' : 'دستیار هوشمند'}
                    </div>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
      
      <form onSubmit={handleSubmit} className="flex space-x-2 space-x-reverse">
        <Button 
          type="submit" 
          disabled={isLoading} 
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ارسال'}
        </Button>
        <Input
          className="flex-1"
          placeholder="پیام خود را اینجا بنویسید..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
      </form>
    </div>
  )
}

export default AIChat