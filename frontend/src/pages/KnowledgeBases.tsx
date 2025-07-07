import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Database, FileText, HardDrive, Users, MoreVertical, Copy, Trash2 } from 'lucide-react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/api/client'
import { useToast } from '@/components/ui/use-toast'
import { formatBytes, formatRelativeTime } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface KnowledgeBase {
  id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
  stats: {
    total_documents: number
    total_chunks: number
    storage_size_bytes: number
  }
  agent_count: number
}

export function KnowledgeBasesPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeBase | null>(null)

  useEffect(() => {
    fetchKnowledgeBases()
  }, [])

  const fetchKnowledgeBases = async () => {
    try {
      const response = await apiClient.get('/knowledge-bases')
      setKnowledgeBases(response.data.knowledge_bases)
    } catch (error) {
      console.error('Failed to fetch knowledge bases:', error)
      toast({
        title: 'Error',
        description: 'Failed to load knowledge bases',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (kb: KnowledgeBase) => {
    if (kb.agent_count > 0) {
      toast({
        title: 'Cannot Delete',
        description: `This knowledge base is attached to ${kb.agent_count} agent(s). Detach it from all agents before deleting.`,
        variant: 'destructive'
      })
      return
    }
    setDeleteTarget(kb)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return

    try {
      await apiClient.delete(`/knowledge-bases/${deleteTarget.id}`)
      toast({
        title: 'Success',
        description: 'Knowledge base deleted successfully'
      })
      fetchKnowledgeBases()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete knowledge base',
        variant: 'destructive'
      })
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleDuplicate = async (kb: KnowledgeBase) => {
    const name = prompt('Enter name for the duplicated knowledge base:', `Copy of ${kb.name}`)
    if (!name) return

    try {
      await apiClient.post(`/knowledge-bases/${kb.id}/duplicate`, null, {
        params: { name }
      })
      toast({
        title: 'Success',
        description: 'Knowledge base duplicated successfully'
      })
      fetchKnowledgeBases()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to duplicate knowledge base',
        variant: 'destructive'
      })
    }
  }

  const filteredKnowledgeBases = knowledgeBases.filter(kb =>
    kb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    kb.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Knowledge Bases</h1>
            <p className="text-muted-foreground">
              Create and manage reusable knowledge bases for your agents
            </p>
          </div>
          <Button onClick={() => navigate('/knowledge-bases/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Knowledge Base
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search knowledge bases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : filteredKnowledgeBases.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Database className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">
                {searchQuery ? 'No knowledge bases found' : 'No knowledge bases yet'}
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Create your first knowledge base to get started'}
              </p>
              {!searchQuery && (
                <Button onClick={() => navigate('/knowledge-bases/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Knowledge Base
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredKnowledgeBases.map((kb) => (
              <Card
                key={kb.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/knowledge-bases/${kb.id}`)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{kb.name}</CardTitle>
                      {kb.description && (
                        <CardDescription className="mt-1">
                          {kb.description}
                        </CardDescription>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/knowledge-bases/${kb.id}`)
                          }}
                        >
                          View/Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDuplicate(kb)
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(kb)
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{kb.stats.total_documents} docs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-muted-foreground" />
                      <span>{formatBytes(kb.stats.storage_size_bytes)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{kb.agent_count} agents</span>
                    </div>
                    <div className="text-muted-foreground">
                      {formatRelativeTime(kb.updated_at)}
                    </div>
                  </div>
                  {kb.agent_count > 0 && (
                    <Badge variant="secondary" className="mt-3">
                      In Use
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Knowledge Base</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteTarget?.name}"? This will permanently delete
                all documents and data in this knowledge base. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  )
}