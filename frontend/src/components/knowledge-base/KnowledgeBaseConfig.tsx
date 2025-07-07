import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2, Database, Settings2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/api/client'
import { useToast } from '@/components/ui/use-toast'

interface KnowledgeBase {
  id: string
  name: string
  description: string
  stats: {
    total_documents: number
    total_chunks: number
  }
}

interface KnowledgeBaseAttachment {
  knowledge_base_id: string
  config: {
    tool_name?: string
    tool_description?: string
    response_prefix?: string
    response_postfix?: string
    no_results_message?: string
    default_result_count?: number
    speech_hints?: string[]
  }
}

interface KnowledgeBaseConfigProps {
  attachments: KnowledgeBaseAttachment[]
  onAttachmentsChange: (attachments: KnowledgeBaseAttachment[]) => void
}

export function KnowledgeBaseConfig({
  attachments,
  onAttachmentsChange
}: KnowledgeBaseConfigProps) {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [expandedKb, setExpandedKb] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchKnowledgeBases()
  }, [])

  const fetchKnowledgeBases = async () => {
    try {
      const response = await apiClient.get('/knowledge-bases')
      setKnowledgeBases(response.data.knowledge_bases)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load knowledge bases',
        variant: 'destructive'
      })
    }
  }

  const getKnowledgeBase = (kbId: string) => {
    return knowledgeBases.find(kb => kb.id === kbId)
  }

  const handleAddKnowledgeBase = (kbId: string) => {
    const kb = getKnowledgeBase(kbId)
    if (!kb) return

    const newAttachment: KnowledgeBaseAttachment = {
      knowledge_base_id: kbId,
      config: {
        tool_name: `search_${kb.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        tool_description: kb.description || `Search ${kb.name} for information`,
        response_prefix: '',
        response_postfix: '',
        no_results_message: `No information found in ${kb.name} for '{query}'`,
        default_result_count: 3,
        speech_hints: []
      }
    }

    onAttachmentsChange([...attachments, newAttachment])
    setAddDialogOpen(false)
    setExpandedKb(kbId)
  }

  const handleRemoveKnowledgeBase = (kbId: string) => {
    onAttachmentsChange(attachments.filter(a => a.knowledge_base_id !== kbId))
    if (expandedKb === kbId) {
      setExpandedKb(null)
    }
  }

  const handleConfigChange = (kbId: string, config: KnowledgeBaseAttachment['config']) => {
    onAttachmentsChange(
      attachments.map(a => 
        a.knowledge_base_id === kbId 
          ? { ...a, config } 
          : a
      )
    )
  }

  const availableKnowledgeBases = knowledgeBases.filter(
    kb => !attachments.some(a => a.knowledge_base_id === kb.id)
  )

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Knowledge Bases</h3>
          <p className="text-sm text-muted-foreground">
            Configure knowledge bases and their search tools
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Knowledge Base</DialogTitle>
              <DialogDescription>
                Select a knowledge base to add to this agent
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {availableKnowledgeBases.length > 0 ? (
                availableKnowledgeBases.map(kb => (
                  <Card 
                    key={kb.id} 
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleAddKnowledgeBase(kb.id)}
                  >
                    <CardHeader className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-base">{kb.name}</CardTitle>
                          {kb.description && (
                            <CardDescription className="text-sm">
                              {kb.description}
                            </CardDescription>
                          )}
                          <div className="flex gap-3 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {kb.stats.total_documents} docs
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {kb.stats.total_chunks} chunks
                            </Badge>
                          </div>
                        </div>
                        <Database className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardHeader>
                  </Card>
                ))
              ) : knowledgeBases.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-3">
                    No knowledge bases available
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/knowledge-bases/new" target="_blank">
                      Create Knowledge Base
                    </a>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  All available knowledge bases have been added
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Attached Knowledge Bases */}
      {attachments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Database className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground text-center">
              No knowledge bases attached.<br />
              Add one to enable document search.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {attachments.map(attachment => {
            const kb = getKnowledgeBase(attachment.knowledge_base_id)
            if (!kb) return null

            const isExpanded = expandedKb === kb.id

            return (
              <Card key={kb.id} className="overflow-hidden">
                <CardHeader 
                  className="cursor-pointer"
                  onClick={() => setExpandedKb(isExpanded ? null : kb.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-base">{kb.name}</CardTitle>
                        {kb.description && (
                          <CardDescription className="text-sm mt-1">
                            {kb.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {attachment.config.tool_name || 'Not configured'}
                      </Badge>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="border-t space-y-4 pt-4">
                    {/* Tool Configuration */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`tool-name-${kb.id}`}>
                          Tool Name
                          <span className="text-xs text-muted-foreground ml-2">
                            (function name in SWML)
                          </span>
                        </Label>
                        <Input
                          id={`tool-name-${kb.id}`}
                          value={attachment.config.tool_name || ''}
                          onChange={(e) => handleConfigChange(kb.id, {
                            ...attachment.config,
                            tool_name: e.target.value
                          })}
                          placeholder="search_docs"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`result-count-${kb.id}`}>
                          Default Result Count
                        </Label>
                        <Input
                          id={`result-count-${kb.id}`}
                          type="number"
                          min="1"
                          max="10"
                          value={attachment.config.default_result_count || 3}
                          onChange={(e) => handleConfigChange(kb.id, {
                            ...attachment.config,
                            default_result_count: parseInt(e.target.value) || 3
                          })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`tool-desc-${kb.id}`}>
                        Tool Description
                        <span className="text-xs text-muted-foreground ml-2">
                          (shown to AI)
                        </span>
                      </Label>
                      <Input
                        id={`tool-desc-${kb.id}`}
                        value={attachment.config.tool_description || ''}
                        onChange={(e) => handleConfigChange(kb.id, {
                          ...attachment.config,
                          tool_description: e.target.value
                        })}
                        placeholder={`Search ${kb.name} for information`}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`prefix-${kb.id}`}>
                          Response Prefix
                          <span className="text-xs text-muted-foreground ml-2">
                            (optional)
                          </span>
                        </Label>
                        <Input
                          id={`prefix-${kb.id}`}
                          value={attachment.config.response_prefix || ''}
                          onChange={(e) => handleConfigChange(kb.id, {
                            ...attachment.config,
                            response_prefix: e.target.value
                          })}
                          placeholder="From the documentation:"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`postfix-${kb.id}`}>
                          Response Postfix
                          <span className="text-xs text-muted-foreground ml-2">
                            (optional)
                          </span>
                        </Label>
                        <Input
                          id={`postfix-${kb.id}`}
                          value={attachment.config.response_postfix || ''}
                          onChange={(e) => handleConfigChange(kb.id, {
                            ...attachment.config,
                            response_postfix: e.target.value
                          })}
                          placeholder="For more info, see docs."
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`no-results-${kb.id}`}>
                        No Results Message
                      </Label>
                      <Input
                        id={`no-results-${kb.id}`}
                        value={attachment.config.no_results_message || ''}
                        onChange={(e) => handleConfigChange(kb.id, {
                          ...attachment.config,
                          no_results_message: e.target.value
                        })}
                        placeholder={`No information found in ${kb.name} for '{query}'`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`hints-${kb.id}`}>
                        Speech Recognition Hints
                        <span className="text-xs text-muted-foreground ml-2">
                          (comma-separated)
                        </span>
                      </Label>
                      <Input
                        id={`hints-${kb.id}`}
                        value={(attachment.config.speech_hints || []).join(', ')}
                        onChange={(e) => handleConfigChange(kb.id, {
                          ...attachment.config,
                          speech_hints: e.target.value.split(',').map(h => h.trim()).filter(Boolean)
                        })}
                        placeholder="documentation, search docs, help"
                      />
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>{kb.stats.total_documents} documents</span>
                        <span>•</span>
                        <span>{kb.stats.total_chunks} chunks</span>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveKnowledgeBase(kb.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Help Text */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Settings2 className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">Knowledge Base Tools</p>
              <p className="text-muted-foreground">
                Each knowledge base creates a separate search tool that the AI can use. 
                Configure tool names, descriptions, and response formatting to customize 
                how search results are presented.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}