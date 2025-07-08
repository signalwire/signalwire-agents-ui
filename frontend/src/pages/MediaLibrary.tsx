import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, Music, Video, Search, Trash2, Download, MoreVertical, Link, Play, Pause, X } from 'lucide-react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { formatBytes, formatRelativeTime } from '@/lib/utils'
import { apiClient } from '@/api/client'

interface MediaFile {
  id: string
  filename: string
  original_filename: string
  file_type: 'audio' | 'video'
  mime_type: string
  category?: string
  file_size: number
  duration_seconds?: number
  description?: string
  url: string
  created_at: string
  usage_count: number
}

export function MediaLibraryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [fileTypeFilter, setFileTypeFilter] = useState<string | null>(null)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importUrl, setImportUrl] = useState('')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [playingMedia, setPlayingMedia] = useState<string | null>(null)
  const [floatingPlayerMedia, setFloatingPlayerMedia] = useState<MediaFile | null>(null)
  const [playerPosition, setPlayerPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isMobile, setIsMobile] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Detect mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch media files
  const { data, isLoading } = useQuery({
    queryKey: ['media', searchQuery, fileTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (fileTypeFilter) params.append('file_type', fileTypeFilter)
      
      const response = await apiClient.get(`/media?${params}`)
      return response.data
    },
  })

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, description }: { file: File; description?: string }) => {
      const formData = new FormData()
      formData.append('file', file)
      if (description) formData.append('description', description)
      
      const response = await apiClient.post('/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    },
    onSuccess: () => {
      toast({ title: 'File uploaded successfully' })
      queryClient.invalidateQueries({ queryKey: ['media'] })
      setShowUploadDialog(false)
      setSelectedFile(null)
      setDescription('')
    },
    onError: (error: any) => {
      let errorMessage = 'Failed to upload file'
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail
        if (typeof detail === 'string') {
          errorMessage = detail
        } else if (Array.isArray(detail)) {
          errorMessage = detail.map((err: any) => err.msg || err.message || 'Validation error').join(', ')
        } else if (typeof detail === 'object' && detail.msg) {
          errorMessage = detail.msg
        }
      }
      
      toast({
        title: 'Upload failed',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  })

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async ({ url, description }: { url: string; description?: string }) => {
      const response = await apiClient.post('/media/import', { url, description })
      return response.data
    },
    onSuccess: () => {
      toast({ title: 'File imported successfully' })
      queryClient.invalidateQueries({ queryKey: ['media'] })
      setShowImportDialog(false)
      setImportUrl('')
      setDescription('')
    },
    onError: (error: any) => {
      let errorMessage = 'Failed to import file'
      
      if (error.response?.data?.detail) {
        // Handle different error formats
        const detail = error.response.data.detail
        if (typeof detail === 'string') {
          errorMessage = detail
        } else if (Array.isArray(detail)) {
          // Handle validation errors
          errorMessage = detail.map((err: any) => err.msg || err.message || 'Validation error').join(', ')
        } else if (typeof detail === 'object' && detail.msg) {
          errorMessage = detail.msg
        }
      }
      
      toast({
        title: 'Import failed',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      await apiClient.delete(`/media/${mediaId}`)
    },
    onSuccess: () => {
      toast({ title: 'File deleted successfully' })
      queryClient.invalidateQueries({ queryKey: ['media'] })
    },
    onError: (error: any) => {
      let errorMessage = 'Failed to delete file'
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail
        if (typeof detail === 'string') {
          errorMessage = detail
        } else if (Array.isArray(detail)) {
          errorMessage = detail.map((err: any) => err.msg || err.message || 'Validation error').join(', ')
        } else if (typeof detail === 'object' && detail.msg) {
          errorMessage = detail.msg
        }
      }
      
      toast({
        title: 'Delete failed',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setShowUploadDialog(true)
    }
  }

  const handleUpload = () => {
    if (selectedFile) {
      setUploading(true)
      uploadMutation.mutate(
        { file: selectedFile, description },
        {
          onSettled: () => setUploading(false)
        }
      )
    }
  }

  const handleImport = () => {
    if (importUrl) {
      setUploading(true)
      importMutation.mutate(
        { url: importUrl, description },
        {
          onSettled: () => setUploading(false)
        }
      )
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const togglePlay = (mediaId: string) => {
    if (isMobile) {
      // On mobile, use the existing inline player behavior
      if (playingMedia === mediaId) {
        setPlayingMedia(null)
      } else {
        setPlayingMedia(mediaId)
      }
    } else {
      // On desktop, use floating player
      if (floatingPlayerMedia?.id === mediaId) {
        setFloatingPlayerMedia(null)
      } else {
        const file = data?.files?.find((f: MediaFile) => f.id === mediaId)
        if (file) {
          setFloatingPlayerMedia(file)
        }
      }
    }
  }

  // Initialize player position to center when media changes
  useEffect(() => {
    if (floatingPlayerMedia) {
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight
      const playerWidth = 400
      const playerHeight = 400 // Approximate height
      
      setPlayerPosition({
        x: (windowWidth - playerWidth) / 2,
        y: (windowHeight - playerHeight) / 2
      })
    }
  }, [floatingPlayerMedia])

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start drag from the header area
    if ((e.target as HTMLElement).closest('.player-header')) {
      setIsDragging(true)
      setDragStart({
        x: e.clientX - playerPosition.x,
        y: e.clientY - playerPosition.y
      })
    }
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y
      
      // Keep player within viewport bounds
      const maxX = window.innerWidth - 400
      const maxY = window.innerHeight - 200
      
      setPlayerPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragStart])

  // Close floating player when clicking outside
  useEffect(() => {
    if (!floatingPlayerMedia || isDragging) return

    const handleClickOutside = (e: MouseEvent) => {
      const player = document.getElementById('floating-media-player')
      if (player && !player.contains(e.target as Node)) {
        setFloatingPlayerMedia(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [floatingPlayerMedia, isDragging])

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Media Library</h1>
          <p className="text-muted-foreground">
            Manage audio and video files for your agents
          </p>
        </div>

        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search media files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={fileTypeFilter === 'audio' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFileTypeFilter(fileTypeFilter === 'audio' ? null : 'audio')}
            >
              <Music className="h-4 w-4 mr-2" />
              Audio
            </Button>
            <Button
              variant={fileTypeFilter === 'video' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFileTypeFilter(fileTypeFilter === 'video' ? null : 'video')}
            >
              <Video className="h-4 w-4 mr-2" />
              Video
            </Button>
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept="audio/*,video/*"
              onChange={handleFileSelect}
            />
            <label htmlFor="file-upload">
              <Button asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </span>
              </Button>
            </label>
            <Button variant="outline" onClick={() => setShowImportDialog(true)}>
              <Link className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Import URL</span>
              <span className="sm:hidden">Import</span>
            </Button>
          </div>
        </div>

        {/* Media grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading media files...</p>
          </div>
        ) : data?.files?.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No media files yet</p>
              <p className="text-muted-foreground">
                Upload audio or video files to use in your agents
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop grid view */}
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data?.files?.map((file: MediaFile) => {
                return (
                  <Card key={file.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-12 w-12"
                          onClick={() => togglePlay(file.id)}
                        >
                          {floatingPlayerMedia?.id === file.id ? (
                            <Pause className="h-6 w-6" />
                          ) : (
                            <Play className="h-6 w-6" />
                          )}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <a href={file.url} download={file.original_filename}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteMutation.mutate(file.id)}
                              className="text-destructive"
                              disabled={file.usage_count > 0}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <h3 className="font-medium truncate mb-1" title={file.original_filename}>
                        {file.original_filename}
                      </h3>
                      
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>{formatBytes(file.file_size)} {formatDuration(file.duration_seconds) && `• ${formatDuration(file.duration_seconds)}`}</p>
                        <p>{formatRelativeTime(file.created_at)}</p>
                        {file.usage_count > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            Used in {file.usage_count} agent{file.usage_count !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      
                      {file.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2" title={file.description}>
                          {file.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Mobile list view */}
            <div className="md:hidden space-y-3">
              {data?.files?.map((file: MediaFile) => {
                return (
                  <Card key={file.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 flex-shrink-0"
                          onClick={() => togglePlay(file.id)}
                        >
                          {playingMedia === file.id ? (
                            <Pause className="h-5 w-5" />
                          ) : (
                            <Play className="h-5 w-5" />
                          )}
                        </Button>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate" title={file.original_filename}>
                            {file.original_filename}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {file.file_type === 'audio' ? 'Audio' : 'Video'} • {formatBytes(file.file_size)}
                            {formatDuration(file.duration_seconds) && ` • ${formatDuration(file.duration_seconds)}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatRelativeTime(file.created_at)}
                          </p>
                          {file.usage_count > 0 && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              Used in {file.usage_count} agent{file.usage_count !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <a href={file.url} download={file.original_filename}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteMutation.mutate(file.id)}
                              className="text-destructive"
                              disabled={file.usage_count > 0}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      {/* Media player for mobile */}
                      {playingMedia === file.id && isMobile && (
                        <div className="mt-3 pt-3 border-t">
                          {file.file_type === 'audio' ? (
                            <audio
                              controls
                              autoPlay
                              className="w-full"
                              onEnded={() => setPlayingMedia(null)}
                            >
                              <source src={file.url} type={file.mime_type} />
                              Your browser does not support the audio element.
                            </audio>
                          ) : (
                            <video
                              controls
                              autoPlay
                              className="w-full rounded"
                              onEnded={() => setPlayingMedia(null)}
                            >
                              <source src={file.url} type={file.mime_type} />
                              Your browser does not support the video element.
                            </video>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </>
        )}

        {/* Upload dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Media File</DialogTitle>
              <DialogDescription>
                Add a description to help organize your media files
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>File</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedFile?.name} ({selectedFile && formatBytes(selectedFile.size)})
                </p>
              </div>
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of this media file..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Import dialog */}
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import from URL</DialogTitle>
              <DialogDescription>
                Import a media file from an external URL
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="import-url">Media URL</Label>
                <Input
                  id="import-url"
                  type="url"
                  placeholder="https://example.com/audio.mp3"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="import-description">Description (optional)</Label>
                <Textarea
                  id="import-description"
                  placeholder="Brief description of this media file..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={uploading || !importUrl}>
                {uploading ? 'Importing...' : 'Import'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Floating Media Player (Desktop only) */}
        {floatingPlayerMedia && !isMobile && (
          <div
            id="floating-media-player"
            className="fixed z-50 bg-background border rounded-lg shadow-lg"
            style={{ 
              width: '400px', 
              maxWidth: 'calc(100vw - 48px)',
              left: `${playerPosition.x}px`,
              top: `${playerPosition.y}px`,
              cursor: isDragging ? 'grabbing' : 'default'
            }}
            onMouseDown={handleMouseDown}
          >
            <div className="p-4">
              <div className="player-header flex items-start justify-between mb-3" style={{ cursor: 'grab' }}>
                <div className="flex-1 min-w-0 mr-3 select-none">
                  <h3 className="font-medium truncate" title={floatingPlayerMedia.original_filename}>
                    {floatingPlayerMedia.original_filename}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {floatingPlayerMedia.file_type === 'audio' ? 'Audio' : 'Video'} • {formatBytes(floatingPlayerMedia.file_size)}
                    {formatDuration(floatingPlayerMedia.duration_seconds) && ` • ${formatDuration(floatingPlayerMedia.duration_seconds)}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => setFloatingPlayerMedia(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Media player */}
              {floatingPlayerMedia.file_type === 'audio' ? (
                <audio
                  controls
                  autoPlay
                  className="w-full"
                  onEnded={() => setFloatingPlayerMedia(null)}
                >
                  <source src={floatingPlayerMedia.url} type={floatingPlayerMedia.mime_type} />
                  Your browser does not support the audio element.
                </audio>
              ) : (
                <video
                  controls
                  autoPlay
                  className="w-full rounded"
                  style={{ maxHeight: '300px' }}
                  onEnded={() => setFloatingPlayerMedia(null)}
                >
                  <source src={floatingPlayerMedia.url} type={floatingPlayerMedia.mime_type} />
                  Your browser does not support the video element.
                </video>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}