import { useState, useEffect } from 'react'
import { FileText, Upload, Download, Trash2, RefreshCw, Search, CheckCircle, Clock, XCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { formatBytes, formatRelativeTime } from '@/lib/utils'
import { apiClient } from '@/api/client'

export interface KnowledgeBaseConfig {
  enabled: boolean
  search_count?: number
  similarity_threshold?: number
  chunk_size?: number
  chunk_overlap?: number
}

interface KnowledgeBaseConfigProps {
  open: boolean
  onClose: () => void
  config: KnowledgeBaseConfig
  onChange: (config: KnowledgeBaseConfig) => void
  agentId?: string
}

interface Document {
  id: string
  filename: string
  file_size: number
  file_type?: string
  uploaded_at: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  processing_started_at?: string
  processed_at?: string
  error_message?: string
  chunk_count: number
  chunks_processed: number
  progress_percentage: number
}

interface KBStatus {
  total_documents: number
  completed_documents: number
  processing_documents: number
  failed_documents: number
  total_chunks: number
  storage_size_bytes: number
}

export function KnowledgeBaseConfig({ 
  open, 
  onClose, 
  config, 
  onChange, 
  agentId 
}: KnowledgeBaseConfigProps) {
  const [localConfig, setLocalConfig] = useState<KnowledgeBaseConfig>(config)
  const [documents, setDocuments] = useState<Document[]>([])
  const [status, setStatus] = useState<KBStatus | null>(null)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any>(null)
  const [searching, setSearching] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setLocalConfig(config)
  }, [config])

  useEffect(() => {
    if (open && agentId && localConfig.enabled) {
      fetchDocuments()
      fetchStatus()
    }
  }, [open, agentId, localConfig.enabled])

  // Poll for document updates while processing
  useEffect(() => {
    if (!open || !agentId || !localConfig.enabled) return

    const hasProcessing = documents.some(d => d.status === 'processing')
    if (!hasProcessing) return

    const interval = setInterval(() => {
      fetchDocuments()
    }, 2000)

    return () => clearInterval(interval)
  }, [documents, open, agentId, localConfig.enabled])

  const fetchDocuments = async () => {
    if (!agentId) return
    
    try {
      const response = await apiClient.get(`/agents/${agentId}/knowledge-base/documents`)
      setDocuments(response.data.documents)
    } catch (error) {
      console.error('Failed to fetch documents:', error)
    }
  }

  const fetchStatus = async () => {
    if (!agentId) return
    
    try {
      const response = await apiClient.get(`/agents/${agentId}/knowledge-base/status`)
      setStatus(response.data)
    } catch (error) {
      console.error('Failed to fetch status:', error)
    }
  }

  const handleSave = () => {
    onChange(localConfig)
    onClose()
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!agentId || !files || files.length === 0) return

    setUploading(true)
    const formData = new FormData()
    
    Array.from(files).forEach(file => {
      formData.append('files', file)
    })

    try {
      const response = await apiClient.post(`/agents/${agentId}/knowledge-base/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      toast({
        title: 'Upload successful',
        description: `Uploaded ${response.data.uploaded} document(s)`
      })
      fetchDocuments()
      fetchStatus()
    } catch (error) {
      toast({
        title: 'Upload error',
        description: 'Failed to upload documents',
        variant: 'destructive'
      })
    } finally {
      setUploading(false)
      // Reset the input
      if (e.target) {
        e.target.value = ''
      }
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!agentId) return

    try {
      await apiClient.delete(`/agents/${agentId}/knowledge-base/documents/${documentId}`)
      
      toast({
        title: 'Document deleted',
        description: 'Document and its data have been removed'
      })
      fetchDocuments()
      fetchStatus()
    } catch (error) {
      toast({
        title: 'Delete error',
        description: 'Failed to delete document',
        variant: 'destructive'
      })
    }
  }

  const handleRetry = async (documentId: string) => {
    if (!agentId) return

    try {
      await apiClient.post(`/agents/${agentId}/knowledge-base/documents/${documentId}/retry`)
      
      toast({
        title: 'Retry queued',
        description: 'Document queued for reprocessing'
      })
      fetchDocuments()
    } catch (error) {
      toast({
        title: 'Retry error',
        description: 'Failed to retry document processing',
        variant: 'destructive'
      })
    }
  }

  const handleDownload = async (documentId: string, filename: string) => {
    if (!agentId) return

    try {
      const response = await apiClient.get(`/agents/${agentId}/knowledge-base/documents/${documentId}/download`, {
        responseType: 'blob'
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      toast({
        title: 'Download error',
        description: 'Failed to download document',
        variant: 'destructive'
      })
    }
  }

  const handleSearch = async () => {
    if (!agentId || !searchQuery.trim()) return

    setSearching(true)
    try {
      const response = await apiClient.post(`/agents/${agentId}/knowledge-base/search`, {
        query: searchQuery,
        count: localConfig.search_count || 3
      })
      
      setSearchResults(response.data)
    } catch (error) {
      toast({
        title: 'Search error',
        description: 'Failed to search knowledge base',
        variant: 'destructive'
      })
    } finally {
      setSearching(false)
    }
  }

  const getStatusIcon = (status: Document['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'processing':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'failed':
        return <XCircle className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: Document['status']) => {
    switch (status) {
      case 'pending':
        return 'secondary'
      case 'processing':
        return 'default'
      case 'completed':
        return 'success'
      case 'failed':
        return 'destructive'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Knowledge Base Configuration</DialogTitle>
          <DialogDescription>
            Upload documents to create a searchable knowledge base for your agent
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4 overflow-y-auto flex-1 px-1">
          {/* Enable/Disable Knowledge Base */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Knowledge Base Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="kb-enabled" className="text-base">
                    Enable Knowledge Base
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow the agent to search uploaded documents for information
                  </p>
                </div>
                <Switch
                  id="kb-enabled"
                  checked={localConfig.enabled}
                  onCheckedChange={(checked) => 
                    setLocalConfig({ ...localConfig, enabled: checked })
                  }
                />
              </div>

              {localConfig.enabled && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="search-count">Results per Search</Label>
                      <Input
                        id="search-count"
                        type="number"
                        min="1"
                        max="10"
                        value={localConfig.search_count || 3}
                        onChange={(e) => 
                          setLocalConfig({ 
                            ...localConfig, 
                            search_count: parseInt(e.target.value) || 3 
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Number of results to return for each search
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
                        value={localConfig.similarity_threshold || 0.0}
                        onChange={(e) => 
                          setLocalConfig({ 
                            ...localConfig, 
                            similarity_threshold: parseFloat(e.target.value) || 0.0 
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Minimum similarity score (0-1) for search results
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {localConfig.enabled && agentId && (
            <>
              {/* Status Overview */}
              {status && (
                <div className="grid gap-2 md:grid-cols-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{status.total_documents}</div>
                      <p className="text-xs text-muted-foreground">Total Documents</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-green-600">{status.completed_documents}</div>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-blue-600">{status.processing_documents}</div>
                      <p className="text-xs text-muted-foreground">Processing</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{formatBytes(status.storage_size_bytes)}</div>
                      <p className="text-xs text-muted-foreground">Storage Used</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Upload Area */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Upload Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div
                      className={`
                        border-2 border-dashed rounded-lg p-8 text-center relative
                        transition-colors duration-200
                        ${uploading ? 'opacity-50' : 'hover:border-primary/50'}
                      `}
                    >
                      <input
                        type="file"
                        multiple
                        accept=".txt,.md,.pdf,.docx,.html,.htm,.json,.yaml,.yml"
                        onChange={handleFileUpload}
                        disabled={uploading || !localConfig.enabled}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-sm font-medium mb-1">
                        Click to browse and upload files
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supported: TXT, MD, PDF, DOCX, HTML, JSON, YAML
                      </p>
                      {uploading && (
                        <p className="text-sm text-muted-foreground mt-2">Uploading...</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Documents Table */}
              {documents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Filename</TableHead>
                            <TableHead>Size</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Progress</TableHead>
                            <TableHead>Uploaded</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {documents.map((doc) => (
                            <TableRow key={doc.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span className="truncate max-w-[200px]">{doc.filename}</span>
                                </div>
                              </TableCell>
                              <TableCell>{formatBytes(doc.file_size)}</TableCell>
                              <TableCell>
                                <Badge variant={getStatusColor(doc.status) as any} className="gap-1">
                                  {getStatusIcon(doc.status)}
                                  {doc.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {doc.status === 'processing' ? (
                                  <div className="space-y-1">
                                    <Progress value={doc.progress_percentage} className="w-[100px]" />
                                    <p className="text-xs text-muted-foreground">
                                      {doc.chunks_processed}/{doc.chunk_count} chunks
                                    </p>
                                  </div>
                                ) : doc.status === 'completed' ? (
                                  <span className="text-sm text-muted-foreground">
                                    {doc.chunk_count} chunks
                                  </span>
                                ) : doc.status === 'failed' && doc.error_message ? (
                                  <span className="text-xs text-destructive" title={doc.error_message}>
                                    {doc.error_message.slice(0, 30)}...
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground">
                                  {formatRelativeTime(doc.uploaded_at)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDownload(doc.id, doc.filename)}
                                    title="Download original"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  {doc.status === 'failed' && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRetry(doc.id)}
                                      title="Retry processing"
                                    >
                                      <RefreshCw className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(doc.id)}
                                    title="Delete document"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Search Tester */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Test Search</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter search query..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button 
                      onClick={handleSearch} 
                      disabled={searching || !searchQuery.trim()}
                    >
                      {searching ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      Search
                    </Button>
                  </div>

                  {searchResults && (
                    <div className="space-y-2">
                      <Label>Search Results:</Label>
                      <div className="rounded-lg border p-4 bg-muted/50">
                        <p className="text-sm whitespace-pre-wrap">{searchResults.answer}</p>
                        {searchResults.metadata?.sources && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-xs font-medium mb-2">Sources:</p>
                            {searchResults.metadata.sources.map((source: any, idx: number) => (
                              <div key={idx} className="text-xs text-muted-foreground">
                                • {source.filename} (similarity: {source.similarity})
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}