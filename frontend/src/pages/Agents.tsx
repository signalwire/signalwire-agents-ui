import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Copy, Edit, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { agentsApi } from '@/api/agents'
import { MainLayout } from '@/components/layout/MainLayout'
import { toast } from '@/components/ui/use-toast'

export function AgentsPage() {
  const queryClient = useQueryClient()
  
  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.list,
  })

  const deleteMutation = useMutation({
    mutationFn: agentsApi.delete,
    onSuccess: () => {
      toast({ title: 'Agent deleted successfully' })
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
    onError: () => {
      toast({
        title: 'Failed to delete agent',
        variant: 'destructive',
      })
    },
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copied to clipboard' })
  }

  const handleDelete = (agentId: string, agentName: string) => {
    if (confirm(`Are you sure you want to delete "${agentName}"?`)) {
      deleteMutation.mutate(agentId)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Your Agents</h1>
            <p className="text-muted-foreground">
              Create and manage your SignalWire AI agents
            </p>
          </div>
          <Button asChild>
            <Link to="/agents/new" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Agent
            </Link>
          </Button>
        </div>

        {/* Agents Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Card key={agent.id} className="group hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="line-clamp-1">{agent.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {agent.description || 'No description'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Agent Info */}
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Voice:</span>{' '}
                      <span className="font-medium">{agent.config.voice}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Skills:</span>{' '}
                      <span className="font-medium">{agent.config.skills.length}</span>
                    </div>
                    {agent.config.basic_auth_user && (
                      <div className="text-amber-600 dark:text-amber-500">
                        🔒 Basic Auth Enabled
                      </div>
                    )}
                  </div>

                  {/* SWML URL */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">SWML URL:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-muted px-2 py-1 rounded truncate">
                        {agent.swml_url}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => copyToClipboard(agent.swml_url)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1" asChild>
                      <Link to={`/agents/${agent.id}`}>
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleDelete(agent.id, agent.name)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground mb-4">
                You haven't created any agents yet
              </p>
              <Button asChild>
                <Link to="/agents/new" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Agent
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  )
}