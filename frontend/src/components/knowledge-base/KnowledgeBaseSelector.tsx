import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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

interface KnowledgeBaseConfig {
  knowledge_base_ids: string[]
  search_strategy: 'all' | 'round_robin' | 'fallback'
  similarity_threshold?: number
  search_count?: number
}

interface KnowledgeBaseSelectorProps {
  agentId?: string
  config: KnowledgeBaseConfig
  onConfigChange: (config: KnowledgeBaseConfig) => void
}

export function KnowledgeBaseSelector({
  config,
  onConfigChange
}: KnowledgeBaseSelectorProps) {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const { toast } = useToast()
  
  // Ensure config has default values
  const currentConfig = {
    knowledge_base_ids: config.knowledge_base_ids || [],
    search_strategy: config.search_strategy || 'all',
    similarity_threshold: config.similarity_threshold ?? 0.0,
    search_count: config.search_count ?? 3
  }

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
    } finally {
      // Loading state removed
    }
  }

  const handleAddKnowledgeBase = (kbId: string) => {
    if (!currentConfig.knowledge_base_ids.includes(kbId)) {
      onConfigChange({
        ...currentConfig,
        knowledge_base_ids: [...currentConfig.knowledge_base_ids, kbId]
      })
    }
  }

  const handleRemoveKnowledgeBase = (kbId: string) => {
    onConfigChange({
      ...currentConfig,
      knowledge_base_ids: currentConfig.knowledge_base_ids.filter(id => id !== kbId)
    })
  }
  
  const handleStrategyChange = (strategy: string) => {
    onConfigChange({
      ...currentConfig,
      search_strategy: strategy as 'all' | 'round_robin' | 'fallback'
    })
  }
  
  const handleThresholdChange = (value: string) => {
    const threshold = parseFloat(value)
    if (!isNaN(threshold)) {
      onConfigChange({
        ...currentConfig,
        similarity_threshold: Math.max(0, Math.min(1, threshold))
      })
    }
  }
  
  const handleSearchCountChange = (value: string) => {
    const count = parseInt(value)
    if (!isNaN(count)) {
      onConfigChange({
        ...currentConfig,
        search_count: Math.max(1, Math.min(10, count))
      })
    }
  }

  const getSelectedKnowledgeBase = (kbId: string) => {
    return knowledgeBases.find(kb => kb.id === kbId)
  }

  const availableKnowledgeBases = knowledgeBases.filter(
    kb => !currentConfig.knowledge_base_ids.includes(kb.id)
  )

  return (
    <div className="space-y-4">
      {/* Selected Knowledge Bases */}
      {currentConfig.knowledge_base_ids.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Selected Knowledge Bases</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {currentConfig.knowledge_base_ids.map(kbId => {
              const kb = getSelectedKnowledgeBase(kbId)
              if (!kb) return null
              
              return (
                <div
                  key={kb.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                >
                  <div className="flex-1">
                    <p className="font-medium">{kb.name}</p>
                    {kb.description && (
                      <p className="text-sm text-muted-foreground">{kb.description}</p>
                    )}
                    <div className="flex gap-4 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {kb.stats.total_documents} documents
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {kb.stats.total_chunks} chunks
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveKnowledgeBase(kb.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
      
      {/* Search Strategy Configuration */}
      {currentConfig.knowledge_base_ids.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Search Strategy</CardTitle>
            <CardDescription>
              Choose how to search across multiple knowledge bases
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={currentConfig.search_strategy} onValueChange={handleStrategyChange}>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="all" id="all" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="all" className="font-medium cursor-pointer">
                      Search All
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Search all knowledge bases and combine the best results
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="round_robin" id="round_robin" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="round_robin" className="font-medium cursor-pointer">
                      Round Robin
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Rotate between knowledge bases for each search
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="fallback" id="fallback" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="fallback" className="font-medium cursor-pointer">
                      Fallback
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Search knowledge bases in order until results are found
                    </p>
                  </div>
                </div>
              </div>
            </RadioGroup>
            
            {/* Additional Configuration */}
            <div className="grid gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="similarity-threshold">
                  Similarity Threshold
                  <span className="text-xs text-muted-foreground ml-2">
                    (0 = any match, 1 = exact match)
                  </span>
                </Label>
                <Input
                  id="similarity-threshold"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={currentConfig.similarity_threshold}
                  onChange={(e) => handleThresholdChange(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="search-count">
                  Results per Knowledge Base
                  <span className="text-xs text-muted-foreground ml-2">
                    (1-10 results)
                  </span>
                </Label>
                <Input
                  id="search-count"
                  type="number"
                  min="1"
                  max="10"
                  value={currentConfig.search_count}
                  onChange={(e) => handleSearchCountChange(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Knowledge Base */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Knowledge Base</CardTitle>
        </CardHeader>
        <CardContent>
          {availableKnowledgeBases.length > 0 ? (
            <div className="space-y-2">
              <Select onValueChange={handleAddKnowledgeBase}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a knowledge base to add" />
                </SelectTrigger>
                <SelectContent>
                  {availableKnowledgeBases.map(kb => (
                    <SelectItem key={kb.id} value={kb.id}>
                      <div>
                        <p className="font-medium">{kb.name}</p>
                        {kb.description && (
                          <p className="text-xs text-muted-foreground">{kb.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {kb.stats.total_documents} documents • {kb.stats.total_chunks} chunks
                        </p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : knowledgeBases.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">
                No knowledge bases available
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href="/knowledge-bases/new" target="_blank">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Knowledge Base
                </a>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              All available knowledge bases have been added
            </p>
          )}
        </CardContent>
      </Card>
      
      {/* Configuration Summary */}
      {currentConfig.knowledge_base_ids.length === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Search Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="single-similarity-threshold">
                  Similarity Threshold
                  <span className="text-xs text-muted-foreground ml-2">
                    (0 = any match, 1 = exact match)
                  </span>
                </Label>
                <Input
                  id="single-similarity-threshold"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={currentConfig.similarity_threshold}
                  onChange={(e) => handleThresholdChange(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="single-search-count">
                  Number of Results
                  <span className="text-xs text-muted-foreground ml-2">
                    (1-10 results)
                  </span>
                </Label>
                <Input
                  id="single-search-count"
                  type="number"
                  min="1"
                  max="10"
                  value={currentConfig.search_count}
                  onChange={(e) => handleSearchCountChange(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}