import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { apiClient } from '@/api/client'
import { useToast } from '@/components/ui/use-toast'
import { KnowledgeBaseDocuments } from '@/components/knowledge-base/KnowledgeBaseDocuments'

interface KnowledgeBase {
  id?: string
  name: string
  description: string
  settings: {
    chunk_size: number
    chunk_overlap: number
    search_count: number
    similarity_threshold: number
    chunking_strategy?: string
    max_sentences_per_chunk?: number
    split_newlines?: number
    semantic_threshold?: number
    topic_threshold?: number
  }
  stats?: {
    total_documents: number
    total_chunks: number
    storage_size_bytes: number
  }
  agent_count?: number
}

export function KnowledgeBaseDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const isNew = !id || id === 'new'

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase>({
    name: '',
    description: '',
    settings: {
      chunk_size: 512,
      chunk_overlap: 100,
      search_count: 3,
      similarity_threshold: 0.0,
      chunking_strategy: 'sentence',
      max_sentences_per_chunk: 5,
      split_newlines: 0,
      semantic_threshold: 0.5,
      topic_threshold: 0.3
    }
  })

  useEffect(() => {
    if (!isNew) {
      fetchKnowledgeBase()
    }
  }, [id])

  const fetchKnowledgeBase = async () => {
    try {
      const response = await apiClient.get(`/knowledge-bases/${id}`)
      setKnowledgeBase(response.data)
    } catch (error) {
      console.error('Failed to fetch knowledge base:', error)
      toast({
        title: 'Error',
        description: 'Failed to load knowledge base',
        variant: 'destructive'
      })
      navigate('/knowledge-bases')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!knowledgeBase.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Knowledge base name is required',
        variant: 'destructive'
      })
      return
    }

    setSaving(true)
    try {
      if (isNew) {
        const response = await apiClient.post('/knowledge-bases', knowledgeBase)
        toast({
          title: 'Success',
          description: 'Knowledge base created successfully'
        })
        navigate(`/knowledge-bases/${response.data.id}`)
      } else {
        await apiClient.put(`/knowledge-bases/${id}`, knowledgeBase)
        toast({
          title: 'Success',
          description: 'Knowledge base updated successfully'
        })
        fetchKnowledgeBase()
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to save knowledge base',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="text-center py-8">Loading...</div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/knowledge-bases')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">
              {isNew ? 'New Knowledge Base' : 'Edit Knowledge Base'}
            </h1>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Configure the basic settings for this knowledge base
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={knowledgeBase.name}
                onChange={(e) => setKnowledgeBase({ ...knowledgeBase, name: e.target.value })}
                placeholder="e.g., Product Documentation"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={knowledgeBase.description}
                onChange={(e) => setKnowledgeBase({ ...knowledgeBase, description: e.target.value })}
                placeholder="Describe what this knowledge base contains..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Processing Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Processing Settings</CardTitle>
            <CardDescription>
              Configure how documents are chunked and indexed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {/* Chunking Strategy Selector */}
              <div className="space-y-2">
                <Label htmlFor="chunking-strategy">Chunking Strategy</Label>
                <Select 
                  value={knowledgeBase.settings.chunking_strategy || 'sentence'}
                  onValueChange={(value) => setKnowledgeBase({
                    ...knowledgeBase,
                    settings: {
                      ...knowledgeBase.settings,
                      chunking_strategy: value
                    }
                  })}
                >
                  <SelectTrigger id="chunking-strategy">
                    <SelectValue placeholder="Select chunking strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sentence">
                      <div>
                        <div className="font-medium">Sentence-based</div>
                        <div className="text-xs text-muted-foreground">Group by sentences (recommended for Q&A)</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="sliding">
                      <div>
                        <div className="font-medium">Sliding Window</div>
                        <div className="text-xs text-muted-foreground">Fixed-size overlapping chunks</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="paragraph">
                      <div>
                        <div className="font-medium">Paragraph-based</div>
                        <div className="text-xs text-muted-foreground">Preserve paragraph boundaries</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="page">
                      <div>
                        <div className="font-medium">Page-based</div>
                        <div className="text-xs text-muted-foreground">One chunk per page (PDFs)</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="semantic">
                      <div>
                        <div className="font-medium">Semantic</div>
                        <div className="text-xs text-muted-foreground">Group by meaning similarity</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="topic">
                      <div>
                        <div className="font-medium">Topic-based</div>
                        <div className="text-xs text-muted-foreground">Group by topic coherence</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="qa">
                      <div>
                        <div className="font-medium">Q&A Pairs</div>
                        <div className="text-xs text-muted-foreground">Extract question-answer pairs</div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Strategy-specific settings */}
              {knowledgeBase.settings.chunking_strategy === 'sentence' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="max-sentences">Sentences per Chunk</Label>
                    <Input
                      id="max-sentences"
                      type="number"
                      min="1"
                      max="20"
                      value={knowledgeBase.settings.max_sentences_per_chunk || 5}
                      onChange={(e) => setKnowledgeBase({
                        ...knowledgeBase,
                        settings: {
                          ...knowledgeBase.settings,
                          max_sentences_per_chunk: parseInt(e.target.value) || 5
                        }
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of sentences to group together (1-20)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="split-newlines">Split on Empty Lines</Label>
                    <Input
                      id="split-newlines"
                      type="number"
                      min="0"
                      max="5"
                      value={knowledgeBase.settings.split_newlines || 0}
                      onChange={(e) => setKnowledgeBase({
                        ...knowledgeBase,
                        settings: {
                          ...knowledgeBase.settings,
                          split_newlines: parseInt(e.target.value) || 0
                        }
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Split chunks when this many newlines are found (0 to disable)
                    </p>
                  </div>
                </>
              )}

              {(knowledgeBase.settings.chunking_strategy === 'sliding' || 
                knowledgeBase.settings.chunking_strategy === 'paragraph' ||
                !knowledgeBase.settings.chunking_strategy) && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="chunk-size">
                      {knowledgeBase.settings.chunking_strategy === 'sliding' ? 'Words per Chunk' : 'Chunk Size'}
                    </Label>
                    <Input
                      id="chunk-size"
                      type="number"
                      min={knowledgeBase.settings.chunking_strategy === 'sliding' ? 10 : 100}
                      max={knowledgeBase.settings.chunking_strategy === 'sliding' ? 500 : 2000}
                      value={knowledgeBase.settings.chunk_size}
                      onChange={(e) => setKnowledgeBase({
                        ...knowledgeBase,
                        settings: {
                          ...knowledgeBase.settings,
                          chunk_size: parseInt(e.target.value) || 500
                        }
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      {knowledgeBase.settings.chunking_strategy === 'sliding' 
                        ? 'Number of words per chunk (10-500)'
                        : 'Maximum size of chunks in characters (100-2000)'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chunk-overlap">
                      {knowledgeBase.settings.chunking_strategy === 'sliding' ? 'Word Overlap' : 'Chunk Overlap'}
                    </Label>
                    <Input
                      id="chunk-overlap"
                      type="number"
                      min="0"
                      max={knowledgeBase.settings.chunking_strategy === 'sliding' ? 50 : 500}
                      value={knowledgeBase.settings.chunk_overlap}
                      onChange={(e) => setKnowledgeBase({
                        ...knowledgeBase,
                        settings: {
                          ...knowledgeBase.settings,
                          chunk_overlap: parseInt(e.target.value) || 100
                        }
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      {knowledgeBase.settings.chunking_strategy === 'sliding'
                        ? 'Number of overlapping words between chunks (0-50)'
                        : 'Overlap between chunks in characters (0-500)'}
                    </p>
                  </div>
                </>
              )}

              {(knowledgeBase.settings.chunking_strategy === 'semantic' || 
                knowledgeBase.settings.chunking_strategy === 'topic') && (
                <div className="space-y-2">
                  <Label htmlFor="coherence-threshold">
                    {knowledgeBase.settings.chunking_strategy === 'semantic' ? 'Semantic Threshold' : 'Topic Threshold'}
                  </Label>
                  <Input
                    id="coherence-threshold"
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={knowledgeBase.settings.chunking_strategy === 'semantic' 
                      ? (knowledgeBase.settings.semantic_threshold || 0.5)
                      : (knowledgeBase.settings.topic_threshold || 0.3)}
                    onChange={(e) => setKnowledgeBase({
                      ...knowledgeBase,
                      settings: {
                        ...knowledgeBase.settings,
                        [knowledgeBase.settings.chunking_strategy === 'semantic' ? 'semantic_threshold' : 'topic_threshold']: 
                          parseFloat(e.target.value) || 0.5
                      }
                    })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {knowledgeBase.settings.chunking_strategy === 'semantic'
                      ? 'Minimum semantic similarity to group content (0-1)'
                      : 'Minimum topic coherence to group content (0-1)'}
                  </p>
                </div>
              )}

              {/* Common search settings */}
              <Separator className="my-2" />
              <div className="space-y-2">
                <Label htmlFor="search-count">Default Search Results</Label>
                <Input
                  id="search-count"
                  type="number"
                  min="1"
                  max="10"
                  value={knowledgeBase.settings.search_count}
                  onChange={(e) => setKnowledgeBase({
                    ...knowledgeBase,
                    settings: {
                      ...knowledgeBase.settings,
                      search_count: parseInt(e.target.value) || 3
                    }
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Number of results to return per search (1-10)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="similarity-threshold">Similarity Threshold</Label>
                <Input
                  id="similarity-threshold"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={knowledgeBase.settings.similarity_threshold}
                  onChange={(e) => setKnowledgeBase({
                    ...knowledgeBase,
                    settings: {
                      ...knowledgeBase.settings,
                      similarity_threshold: parseFloat(e.target.value) || 0.0
                    }
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum similarity score for results (0-1)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Section - Only show for existing knowledge bases */}
        {!isNew && knowledgeBase.id && (
          <KnowledgeBaseDocuments knowledgeBaseId={knowledgeBase.id} />
        )}

        {/* Stats Section - Only show for existing knowledge bases */}
        {!isNew && knowledgeBase.stats && (
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <div className="text-2xl font-bold">{knowledgeBase.stats.total_documents}</div>
                  <p className="text-xs text-muted-foreground">Total Documents</p>
                </div>
                <div>
                  <div className="text-2xl font-bold">{knowledgeBase.stats.total_chunks}</div>
                  <p className="text-xs text-muted-foreground">Total Chunks</p>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {(knowledgeBase.stats.storage_size_bytes / 1024 / 1024).toFixed(2)} MB
                  </div>
                  <p className="text-xs text-muted-foreground">Storage Used</p>
                </div>
                <div>
                  <div className="text-2xl font-bold">{knowledgeBase.agent_count || 0}</div>
                  <p className="text-xs text-muted-foreground">Agents Using</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  )
}