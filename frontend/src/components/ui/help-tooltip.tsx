import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'

interface HelpTooltipProps {
  content: string | React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  maxWidth?: string
  className?: string
}

export function HelpTooltip({ 
  content, 
  side = 'top', 
  align = 'center',
  maxWidth = '300px',
  className = ''
}: HelpTooltipProps) {
  const [open, setOpen] = useState(false)

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`h-4 w-4 p-0 hover:bg-transparent ${className}`}
            onClick={() => setOpen(!open)}
          >
            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
          </Button>
        </TooltipTrigger>
        <TooltipContent 
          side={side} 
          align={align}
          className={`max-w-[${maxWidth}] text-sm`}
          onPointerDownOutside={() => setOpen(false)}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}