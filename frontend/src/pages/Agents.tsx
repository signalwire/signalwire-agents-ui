import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Copy, Edit, Trash2, MoreVertical, ArrowLeftRight, FileText, Bot } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { agentsApi } from '@/api/agents'
import { MainLayout } from '@/components/layout/MainLayout'
import { toast } from '@/components/ui/use-toast'
import { getElevenLabsVoiceName } from '@/lib/languagePresets'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { ReplaceAgentDialog } from '@/components/agents/ReplaceAgentDialog'

export function AgentsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [agentToDelete, setAgentToDelete] = useState<{ id: string; name: string } | null>(null)
  const [showReplaceDialog, setShowReplaceDialog] = useState(false)
  const [agentToReplace, setAgentToReplace] = useState<{ id: string; name: string } | null>(null)
  
  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.list,
  })

  const deleteMutation = useMutation({
    mutationFn: agentsApi.delete,
    onSuccess: () => {
      toast({ title: 'Agent deleted successfully' })
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      setDeleteDialogOpen(false)
      setAgentToDelete(null)
    },
    onError: () => {
      toast({
        title: 'Failed to delete agent',
        variant: 'destructive',
      })
    },
  })

  const replaceMutation = useMutation({
    mutationFn: async ({ targetId, sourceId, deleteSource }: { 
      targetId: string; 
      sourceId: string; 
      deleteSource: boolean 
    }) => {
      // Replace the agent
      const result = await agentsApi.replace(targetId, sourceId)
      
      // Delete source if requested
      if (deleteSource) {
        await agentsApi.delete(sourceId)
      }
      
      return result
    },
    onSuccess: (_, variables) => {
      toast({ 
        title: 'Agent replaced successfully',
        description: variables.deleteSource ? 'Source agent has been deleted.' : undefined
      })
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      setShowReplaceDialog(false)
      setAgentToReplace(null)
    },
    onError: () => {
      toast({
        title: 'Failed to replace agent',
        description: 'Please try again',
        variant: 'destructive',
      })
    },
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copied to clipboard' })
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-heading-primary break-words">Your Agents</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Create and manage your SignalWire AI agents
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link to="/agents/new" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Agent
            </Link>
          </Button>
        </div>

        {/* Agents Grid */}
        {isLoading ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : agents && agents.length > 0 ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Card 
                key={agent.id} 
                className="group hover:shadow-md transition-shadow cursor-pointer relative"
                onClick={(e) => {
                  // Don't navigate if clicking on the dropdown menu button or dropdown content
                  const target = e.target as HTMLElement
                  if (!target.closest('[data-dropdown-trigger]') && !target.closest('[role="menu"]')) {
                    navigate(`/agents/${agent.id}/edit`)
                  }
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="line-clamp-1 text-heading-card">{agent.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {agent.description || 'No description'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Agent Info */}
                  <div className="space-y-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Voice</span>
                      <span className="font-medium">
                        {agent.config.engine === 'elevenlabs'
                          ? getElevenLabsVoiceName(agent.config.voice)
                          : agent.config.voice}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Skills</span>
                      <span className="font-medium">{agent.config.skills.length}</span>
                    </div>
                    {agent.config.basic_auth_user && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Auth</span>
                        <span className="font-medium">Basic Auth</span>
                      </div>
                    )}
                  </div>


                  {/* Actions */}
                  <div className="flex items-center justify-end pt-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-10 w-10 touch-manipulation"
                          data-dropdown-trigger
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">More options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => navigate(`/agents/${agent.id}/edit`)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Agent
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/agents/${agent.id}/summaries`)}>
                          <FileText className="h-4 w-4 mr-2" />
                          View Call Summaries
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyToClipboard(agent.swml_url)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy SWML URL
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => navigate(`/agents/new?copy=${agent.id}`)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy This Agent
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setAgentToReplace({ id: agent.id, name: agent.name })
                            setShowReplaceDialog(true)
                          }}
                        >
                          <ArrowLeftRight className="h-4 w-4 mr-2" />
                          Replace with Another Agent
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            setAgentToDelete({ id: agent.id, name: agent.name })
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Agent
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Bot className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No agents yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first AI agent to get started
              </p>
              <Button asChild>
                <Link to="/agents/new" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Agent
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Agent"
        description={`Are you sure you want to delete "${agentToDelete?.name}"? This action cannot be undone.`}
        actionLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (agentToDelete) {
            deleteMutation.mutate(agentToDelete.id)
          }
        }}
      />

      {/* Replace Agent Dialog */}
      {agentToReplace && agents && (
        <ReplaceAgentDialog
          open={showReplaceDialog}
          onOpenChange={setShowReplaceDialog}
          targetAgent={agentToReplace}
          agents={agents}
          onConfirm={async (sourceId, deleteSource) => {
            await replaceMutation.mutateAsync({
              targetId: agentToReplace.id,
              sourceId,
              deleteSource
            })
          }}
        />
      )}
    </MainLayout>
  )
}