import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Copy, Loader2 } from 'lucide-react'

interface SaveAsCopyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  originalName: string
  onConfirm: (name: string, description?: string) => Promise<void>
}

export function SaveAsCopyDialog({
  open,
  onOpenChange,
  originalName,
  onConfirm
}: SaveAsCopyDialogProps) {
  const [name, setName] = useState(`Copy of ${originalName}`)
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Generate smart copy name
  const generateCopyName = (original: string) => {
    // Check if it already has a copy pattern
    const copyPattern = /^Copy of (.+?)(?:\s*\((\d+)\))?$/
    const match = original.match(copyPattern)
    
    if (match) {
      const baseName = match[1]
      const currentNum = match[2] ? parseInt(match[2]) : 1
      return `Copy of ${baseName} (${currentNum + 1})`
    }
    
    return `Copy of ${original}`
  }

  // Reset when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setName(generateCopyName(originalName))
      setDescription('')
      setIsSaving(false)
    }
    onOpenChange(newOpen)
  }

  const handleConfirm = async () => {
    if (!name.trim()) return
    
    setIsSaving(true)
    try {
      await onConfirm(name.trim(), description.trim() || undefined)
      handleOpenChange(false)
    } catch (error) {
      // Error handling is done by parent component
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Save As Copy
          </DialogTitle>
          <DialogDescription>
            Create a copy of this agent with a new name. All settings and configurations will be duplicated.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="copy-name">Name</Label>
            <Input
              id="copy-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter agent name"
              className="w-full"
              disabled={isSaving}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="copy-description">Description (optional)</Label>
            <Textarea
              id="copy-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for this copy"
              className="w-full min-h-[80px]"
              disabled={isSaving}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!name.trim() || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Create Copy
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}