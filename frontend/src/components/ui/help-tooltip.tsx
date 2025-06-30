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
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`h-4 w-4 p-0 hover:bg-transparent ${className}`}
          >
            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
          </Button>
        </TooltipTrigger>
        <TooltipContent 
          side={side} 
          align={align}
          className={`max-w-[${maxWidth}] text-sm`}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}