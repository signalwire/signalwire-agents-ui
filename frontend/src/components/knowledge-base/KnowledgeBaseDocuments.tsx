import { useState, useEffect } from 'react'
import { FileText, Upload, Download, Trash2, RefreshCw, Search, CheckCircle, Clock, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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

interface KnowledgeBaseDocumentsProps {
  knowledgeBaseId: string
}

export function KnowledgeBaseDocuments({ knowledgeBaseId }: KnowledgeBaseDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any>(null)
  const [searching, setSearching] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchDocuments()
  }, [knowledgeBaseId])

  // Poll for document updates while processing
  useEffect(() => {
    const hasProcessing = documents.some(d => d.status === 'processing')
    if (!hasProcessing) return

    const interval = setInterval(() => {
      fetchDocuments()
    }, 2000)

    return () => clearInterval(interval)
  }, [documents])

  const fetchDocuments = async () => {
    try {
      const response = await apiClient.get(`/knowledge-bases/${knowledgeBaseId}/documents`)
      setDocuments(response.data.documents)
    } catch (error) {
      console.error('Failed to fetch documents:', error)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const formData = new FormData()
    
    Array.from(files).forEach(file => {
      formData.append('files', file)
    })

    try {
      const response = await apiClient.post(
        `/knowledge-bases/${knowledgeBaseId}/documents/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      )
      
      toast({
        title: 'Upload successful',
        description: `Uploaded ${response.data.uploaded} document(s)`
      })
      fetchDocuments()
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
    try {
      await apiClient.delete(`/knowledge-bases/${knowledgeBaseId}/documents/${documentId}`)
      
      toast({
        title: 'Document deleted',
        description: 'Document and its data have been removed'
      })
      fetchDocuments()
    } catch (error) {
      toast({
        title: 'Delete error',
        description: 'Failed to delete document',
        variant: 'destructive'
      })
    }
  }

  const handleRetry = async (documentId: string) => {
    try {
      await apiClient.post(`/knowledge-bases/${knowledgeBaseId}/documents/${documentId}/retry`)
      
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
    try {
      const response = await apiClient.get(
        `/knowledge-bases/${knowledgeBaseId}/documents/${documentId}/download`,
        {
          responseType: 'blob'
        }
      )

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
    if (!searchQuery.trim()) return

    setSearching(true)
    try {
      const response = await apiClient.post(`/knowledge-bases/${knowledgeBaseId}/search`, {
        query: searchQuery,
        count: 3
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
    <>
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
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
                disabled={uploading}
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
            <CardTitle>Documents</CardTitle>
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
          <CardTitle>Test Search</CardTitle>
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
              <label className="text-sm font-medium">Search Results:</label>
              <div className="rounded-lg border p-4 bg-muted/50">
                <p className="text-sm whitespace-pre-wrap">{searchResults.answer}</p>
                {searchResults.metadata?.sources && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-medium mb-2">Sources:</p>
                    {searchResults.metadata.sources.map((source: any, idx: number) => (
                      <div key={idx} className="text-xs text-muted-foreground">
                        • {source.filename} (similarity: {source.similarity?.toFixed(3)})
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
  )
}