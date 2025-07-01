import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeftRight, Loader2, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Agent {
  id: string
  name: string
  description?: string
}

interface ReplaceAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetAgent: { id: string; name: string }
  agents: Agent[]
  onConfirm: (sourceAgentId: string, deleteSource: boolean) => Promise<void>
}

export function ReplaceAgentDialog({
  open,
  onOpenChange,
  targetAgent,
  agents,
  onConfirm
}: ReplaceAgentDialogProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [deleteSource, setDeleteSource] = useState(false)
  const [isReplacing, setIsReplacing] = useState(false)

  // Filter out the target agent from the list
  const availableAgents = agents.filter(agent => agent.id !== targetAgent.id)

  const selectedAgent = availableAgents.find(a => a.id === selectedAgentId)

  const handleConfirm = async () => {
    if (!selectedAgentId) return
    
    setIsReplacing(true)
    try {
      await onConfirm(selectedAgentId, deleteSource)
      onOpenChange(false)
      // Reset state
      setSelectedAgentId('')
      setDeleteSource(false)
    } catch (error) {
      // Error handling is done by parent component
    } finally {
      setIsReplacing(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!isReplacing) {
      if (!newOpen) {
        // Reset state when closing
        setSelectedAgentId('')
        setDeleteSource(false)
      }
      onOpenChange(newOpen)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Replace Agent Configuration
          </DialogTitle>
          <DialogDescription>
            Select an agent to copy its configuration to "{targetAgent.name}". 
            The target agent will keep its ID and SWML URL but adopt all settings from the source agent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This will completely overwrite the configuration of "{targetAgent.name}". 
              This action cannot be undone.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Select source agent to copy from:</Label>
            <ScrollArea className="h-[200px] w-full rounded-md border p-4">
              <RadioGroup value={selectedAgentId} onValueChange={setSelectedAgentId}>
                {availableAgents.map((agent) => (
                  <div key={agent.id} className="flex items-start space-x-2 pb-2">
                    <RadioGroupItem value={agent.id} id={agent.id} className="mt-1" />
                    <Label 
                      htmlFor={agent.id} 
                      className="flex-1 cursor-pointer font-normal"
                    >
                      <div>
                        <div className="font-medium">{agent.name}</div>
                        {agent.description && (
                          <div className="text-sm text-muted-foreground">
                            {agent.description}
                          </div>
                        )}
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </ScrollArea>
          </div>

          {selectedAgent && (
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="delete-source" 
                checked={deleteSource}
                onCheckedChange={(checked) => setDeleteSource(checked as boolean)}
                disabled={isReplacing}
              />
              <Label 
                htmlFor="delete-source" 
                className="text-sm font-normal cursor-pointer"
              >
                Delete "{selectedAgent.name}" after copying
              </Label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isReplacing}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!selectedAgentId || isReplacing}
          >
            {isReplacing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Replacing...
              </>
            ) : (
              <>
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Replace Configuration
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}