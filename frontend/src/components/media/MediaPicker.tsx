import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Music, Video, Upload, Search, FileText } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { apiClient } from '@/api/client'
import { formatBytes, formatRelativeTime } from '@/lib/utils'

interface MediaPickerProps {
  open: boolean
  onClose: () => void
  value?: string
  onChange: (url: string) => void
  mediaType?: 'audio' | 'video' | 'any'
  allowExternal?: boolean
}

interface MediaFile {
  id: string
  filename: string
  original_filename: string
  file_type: 'audio' | 'video'
  file_size: number
  url: string
  created_at: string
  description?: string
}

export function MediaPicker({
  open,
  onClose,
  onChange,
  mediaType = 'any',
  allowExternal = true
}: MediaPickerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [externalUrl, setExternalUrl] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'library' | 'external'>('library')

  // Fetch media files
  const { data, isLoading } = useQuery({
    queryKey: ['media', mediaType, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (mediaType !== 'any') params.append('file_type', mediaType)
      if (searchQuery) params.append('search', searchQuery)
      
      const response = await apiClient.get(`/media?${params}`)
      return response.data
    },
    enabled: open
  })

  const handleSelect = () => {
    if (activeTab === 'library' && selectedId) {
      const selectedFile = data?.files?.find((f: MediaFile) => f.id === selectedId)
      if (selectedFile) {
        onChange(selectedFile.url)
        onClose()
      }
    } else if (activeTab === 'external' && externalUrl) {
      onChange(externalUrl)
      onClose()
    }
  }


  const getFileIcon = (fileType: string) => {
    return fileType === 'audio' ? Music : Video
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Media</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'library' | 'external')} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="library">Media Library</TabsTrigger>
            {allowExternal && <TabsTrigger value="external">External URL</TabsTrigger>}
          </TabsList>

          <TabsContent value="library" className="flex-1 flex flex-col mt-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search media files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <RadioGroup value={selectedId || ''} onValueChange={setSelectedId} className="flex-1 overflow-y-auto">
              <div className="space-y-2">
                {/* Option to clear selection */}
                <label className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="" />
                  <span className="text-sm">None (Clear selection)</span>
                </label>

                {isLoading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading media files...</p>
                  </div>
                ) : data?.files?.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No media files found</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Upload files in the Media Library first
                    </p>
                  </div>
                ) : (
                  data?.files?.map((file: MediaFile) => {
                    const Icon = getFileIcon(file.file_type)
                    return (
                      <label
                        key={file.id}
                        className="flex items-start space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-accent"
                      >
                        <RadioGroupItem value={file.id} className="mt-1" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3">
                            <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{file.original_filename}</p>
                              <p className="text-xs text-muted-foreground">
                                {file.file_type === 'audio' ? 'Audio' : 'Video'} • {formatBytes(file.file_size)} • {formatRelativeTime(file.created_at)}
                              </p>
                              {file.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {file.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </label>
                    )
                  })
                )}
              </div>
            </RadioGroup>

            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('/media', '_blank')}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload New
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSelect} disabled={!selectedId}>
                  Select
                </Button>
              </div>
            </div>
          </TabsContent>

          {allowExternal && (
            <TabsContent value="external" className="mt-4 space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="external-url">Media URL</Label>
                  <Input
                    id="external-url"
                    type="url"
                    placeholder="https://example.com/audio.mp3"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Enter a direct URL to an audio or video file
                  </p>
                </div>

                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <p className="text-sm font-medium">URL Requirements:</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Must be publicly accessible</li>
                    <li>Must have proper CORS headers</li>
                    <li>Supported formats: MP3, WAV, OGG, MP4, WebM</li>
                    <li>Maximum file size: 50MB (audio), 200MB (video)</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSelect} disabled={!externalUrl}>
                  Use This URL
                </Button>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}