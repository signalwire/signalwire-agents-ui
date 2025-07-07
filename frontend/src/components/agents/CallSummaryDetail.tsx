import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogTitle } from '@/components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { agentsApi } from '@/api/agents'
import { format } from 'date-fns'
import { Phone, Clock, User, Bot, Loader2, Mic, Cpu, AudioLines, Timer, Copy, CheckCircle, X } from 'lucide-react'
import { useState, useRef } from 'react'
import { useToast } from '@/components/ui/use-toast'

interface CallSummaryDetailProps {
  agentId: string
  summaryId: string
  onClose: () => void
}

interface ConversationEntry {
  role: string
  content?: string
  timestamp?: number
  latency?: number
  utterance_latency?: number
  audio_latency?: number
  confidence?: number
  speaker?: string
  tool_calls?: any
}

export function CallSummaryDetail({ agentId, summaryId, onClose }: CallSummaryDetailProps) {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['call-summary-detail', agentId, summaryId],
    queryFn: () => agentsApi.getSummaryDetail(agentId, summaryId),
  })
  
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()
  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A'
    const mins = Math.floor(minutes)
    const secs = Math.round((minutes - mins) * 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return ''
    // Convert from microseconds to milliseconds
    const date = new Date(timestamp / 1000)
    return format(date, 'HH:mm:ss.SSS')
  }

  const calculateElapsedTime = (oldTimestamp?: number, newTimestamp?: number) => {
    if (!oldTimestamp || !newTimestamp) return ''
    const diffMs = (newTimestamp - oldTimestamp) / 1000
    const minutes = Math.floor(diffMs / 60000)
    const seconds = ((diffMs % 60000) / 1000).toFixed(1)
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
  }
  
  const getRecordingType = (url?: string) => {
    if (!url) return null
    const extension = url.split('.').pop()?.toLowerCase()
    if (extension === 'mp4') return 'video'
    if (['wav', 'mp3', 'ogg', 'webm'].includes(extension || '')) return 'audio'
    return null
  }
  
  const copyRawData = async () => {
    if (!summary?.raw_data) return
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(summary.raw_data, null, 2))
      setCopied(true)
      toast({
        description: "Raw data copied to clipboard",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast({
        description: "Failed to copy to clipboard",
        variant: "destructive",
      })
    }
  }

  const recordingUrl = summary?.raw_data?.SWMLVars?.record_call_url
  const recordingType = getRecordingType(recordingUrl)

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content 
          className={cn(
            "fixed z-50 grid gap-0 sm:gap-4 bg-background shadow-lg duration-200",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            // Mobile: full screen
            "inset-0 w-full h-full",
            // Desktop: centered dialog
            "sm:inset-auto sm:left-[50%] sm:top-[50%] sm:w-full sm:max-w-4xl sm:translate-x-[-50%] sm:translate-y-[-50%]",
            "sm:rounded-lg sm:border sm:p-6 sm:max-h-[85vh]"
          )}
        >
          <div className="flex items-center justify-between p-4 sm:p-0 sm:pb-4 border-b sm:border-0">
            <DialogTitle className="text-lg font-semibold">Call Summary Details</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-10 w-10 sm:h-8 sm:w-8 rounded-full -mr-2 sm:mr-0"
            >
              <X className="h-5 w-5 sm:h-4 sm:w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          
          <ScrollArea className="h-[calc(100vh-5rem)] sm:h-[calc(85vh-8rem)]">
            <div className="pr-3 sm:pr-3">
              <div className="px-4 sm:px-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : summary ? (
                  <div className="space-y-4 sm:space-y-6 pb-[200px] sm:pb-8 w-[calc(100vw-2rem)] sm:w-full">
              {/* Call Information */}
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg">Call Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-hidden">
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-start gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="font-medium">Caller:</span>
                        <div className="break-words">{summary.caller_id_name || 'Unknown'} ({summary.caller_id_number || 'N/A'})</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="font-medium">Call ID:</span>
                        <div className="font-mono text-xs break-all">{summary.call_id}</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Duration:</span>
                      <span>{formatDuration(summary.total_minutes)}</span>
                    </div>
                  </div>
                </CardContent>
                
                {/* Recording Player */}
                {recordingUrl && (
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <AudioLines className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Recording:</span>
                    </div>
                    {recordingType === 'video' ? (
                      <div className="relative bg-black rounded-lg overflow-hidden" style={{ height: '300px' }}>
                        <video
                          ref={videoRef}
                          controls
                          controlsList="nodownload"
                          className="absolute inset-0 w-full h-full object-contain"
                          preload="metadata"
                          onClick={(e) => {
                            // Only fullscreen when clicking the video itself, not controls
                            const rect = e.currentTarget.getBoundingClientRect()
                            const clickY = e.clientY - rect.top
                            const videoHeight = rect.height
                            // If click is in the bottom 50px (where controls are), don't fullscreen
                            if (clickY < videoHeight - 50 && videoRef.current) {
                              if (document.fullscreenElement) {
                                document.exitFullscreen()
                              } else {
                                videoRef.current.requestFullscreen()
                              }
                            }
                          }}
                        >
                          <source src={recordingUrl} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    ) : recordingType === 'audio' ? (
                      <audio
                        ref={audioRef}
                        controls
                        className="w-full"
                        preload="metadata"
                      >
                        <source src={recordingUrl} />
                        Your browser does not support the audio tag.
                      </audio>
                    ) : (
                      <a 
                        href={recordingUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        Download Recording
                      </a>
                    )}
                  </CardContent>
                )}
              </Card>

              {/* Usage Metrics */}
              {(summary.raw_data?.total_wire_input_tokens || summary.raw_data?.total_tts_chars || summary.raw_data?.total_asr_minutes) && (
                <Card className="overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-lg">Usage Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                      {summary.raw_data?.total_wire_input_tokens && (
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <Cpu className="h-4 w-4 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Tokens In</p>
                          </div>
                          <p className="text-lg font-semibold">{summary.raw_data.total_wire_input_tokens}</p>
                          <p className="text-xs text-muted-foreground">{summary.raw_data.total_wire_input_tokens_per_minute}/min</p>
                        </div>
                      )}
                      {summary.raw_data?.total_wire_output_tokens && (
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <Cpu className="h-4 w-4 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Tokens Out</p>
                          </div>
                          <p className="text-lg font-semibold">{summary.raw_data.total_wire_output_tokens}</p>
                          <p className="text-xs text-muted-foreground">{summary.raw_data.total_wire_output_tokens_per_minute}/min</p>
                        </div>
                      )}
                      {summary.raw_data?.total_tts_chars && (
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <AudioLines className="h-4 w-4 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">TTS Chars</p>
                          </div>
                          <p className="text-lg font-semibold">{summary.raw_data.total_tts_chars}</p>
                          <p className="text-xs text-muted-foreground">{summary.raw_data.total_tts_chars_per_min}/min</p>
                        </div>
                      )}
                      {summary.raw_data?.total_asr_minutes && (
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <Mic className="h-4 w-4 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">ASR Minutes</p>
                          </div>
                          <p className="text-lg font-semibold">{summary.raw_data.total_asr_minutes.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">Factor: {summary.raw_data.total_asr_cost_factor.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Summary */}
              {summary.post_prompt_summary && (
                <Card className="overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-lg">AI Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="whitespace-pre-wrap">{summary.post_prompt_summary}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Conversation Log */}
              <Card className="overflow-hidden">
                <CardHeader className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <CardTitle className="text-lg">Conversation Log</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyRawData}
                      className="h-8 px-2 self-start sm:self-auto"
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">Copy Raw Data</span>
                          <span className="sm:hidden">Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-w-full overflow-hidden">
                    {summary.call_log?.length > 0 ? (
                      summary.call_log.map((entry: ConversationEntry, index: number) => {
                        // Skip entries without content and tool calls
                        if (!entry.content && !entry.tool_calls) return null
                        
                        // Get previous entry for elapsed time calculation
                        const prevEntry = index > 0 ? summary.call_log[index - 1] as ConversationEntry : null
                        const elapsed = calculateElapsedTime(prevEntry?.timestamp, entry.timestamp)
                        
                        // Set color based on role
                        let iconColor = "text-green-500"
                        let roleLabel = "Agent"
                        let bgColor = ""
                        
                        if (entry.role === 'user') {
                          iconColor = "text-blue-500"
                          roleLabel = "Caller"
                        } else if (entry.role === 'system') {
                          iconColor = "text-red-500"
                          roleLabel = "System"
                          bgColor = "bg-red-50 dark:bg-red-950/20"
                        } else if (entry.role === 'system-log') {
                          iconColor = "text-orange-500"
                          roleLabel = "System Log"
                          bgColor = "bg-orange-50 dark:bg-orange-950/20"
                        } else if (entry.role === 'function' || entry.role === 'tool') {
                          iconColor = "text-purple-500"
                          roleLabel = "Function"
                          bgColor = "bg-purple-50 dark:bg-purple-950/20"
                        }
                        
                        return (
                          <div key={index} className={`flex gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg ${bgColor} overflow-hidden`}>
                            <div className="flex-shrink-0">
                              {entry.role === 'user' ? (
                                <User className={`h-5 w-5 ${iconColor}`} />
                              ) : entry.role === 'system' || entry.role === 'system-log' ? (
                                <Cpu className={`h-5 w-5 ${iconColor}`} />
                              ) : (
                                <Bot className={`h-5 w-5 ${iconColor}`} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <p className="text-sm font-medium">{roleLabel}</p>
                                {entry.timestamp && (
                                  <>
                                    <span className="text-xs text-muted-foreground">
                                      {formatTimestamp(entry.timestamp)}
                                    </span>
                                    {elapsed && (
                                      <span className="text-xs text-muted-foreground">
                                        [+{elapsed}]
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground overflow-hidden">
                                <pre className="whitespace-pre-wrap break-words font-sans overflow-wrap-anywhere">{entry.content}</pre>
                              </div>
                              
                              {/* Latency info for assistant responses */}
                              {entry.role === 'assistant' && entry.latency && entry.utterance_latency && entry.audio_latency && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Timer className="h-3 w-3" />
                                    <span>
                                      Latency: {entry.audio_latency}ms 
                                      ({entry.latency}ms / {entry.utterance_latency - entry.latency}ms / {entry.audio_latency - entry.utterance_latency}ms)
                                    </span>
                                  </div>
                                </div>
                              )}
                              
                              {/* Confidence for user messages */}
                              {entry.role === 'user' && entry.confidence && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Mic className="h-3 w-3" />
                                    <span>Confidence: {(entry.confidence * 100).toFixed(2)}%</span>
                                    {entry.speaker && <span> | Speaker: {entry.speaker}</span>}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      }).filter(Boolean)
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No conversation log available
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Failed to load summary details</p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  )
}