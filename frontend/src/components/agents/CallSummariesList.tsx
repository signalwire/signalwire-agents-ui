import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Phone, Clock, Mic, User, Hash, FileText } from 'lucide-react'
import { formatDistance } from 'date-fns'
import { CallSummaryDetail } from './CallSummaryDetail'
import { Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

interface CallSummary {
  id: string
  agent_id: string
  agent_name: string
  call_id: string
  ai_session_id?: string
  call_start_date?: number
  call_end_date?: number
  caller_id_name?: string
  caller_id_number?: string
  post_prompt_summary?: string
  total_minutes?: number
  total_input_tokens?: number
  total_output_tokens?: number
  total_cost?: number
  has_recording: boolean
  created_at: string
}

interface CallSummariesListProps {
  summaries: CallSummary[]
  loading?: boolean
  error?: Error | null
  showAgentName?: boolean
}

export default function CallSummariesList({ 
  summaries, 
  loading = false, 
  error = null,
  showAgentName = true 
}: CallSummariesListProps) {
  const [selectedSummary, setSelectedSummary] = useState<string | null>(null)

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A'
    const totalSeconds = Math.round(minutes * 60)
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatCallerInfo = (name?: string, number?: string) => {
    if (name && number) return `${name} (${number})`
    return number || 'Unknown'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load call summaries: {error.message}
        </AlertDescription>
      </Alert>
    )
  }

  if (summaries.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <Phone className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p>No call summaries available yet.</p>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {summaries.map((summary) => (
          <Card 
            key={summary.id}
            className="cursor-pointer"
            onClick={() => setSelectedSummary(summary.id)}
          >
            <CardHeader>
              <div className="space-y-2">
                {/* Top row - Caller and timestamp */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">
                        {formatCallerInfo(summary.caller_id_name, summary.caller_id_number)}
                      </span>
                      {showAgentName && (
                        <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{summary.agent_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistance(
                      new Date(
                        summary.call_start_date 
                          ? summary.call_start_date / 1000 
                          : summary.created_at
                      ), 
                      new Date(), 
                      { addSuffix: true }
                    )}
                  </span>
                </div>
                
                {/* Metrics row */}
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span className="font-medium">{formatDuration(summary.total_minutes)}</span>
                  </div>
                  {summary.total_input_tokens !== undefined && summary.total_input_tokens !== null && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Hash className="h-3 w-3" />
                      <span>{summary.total_input_tokens.toLocaleString()} in</span>
                    </div>
                  )}
                  {summary.total_output_tokens !== undefined && summary.total_output_tokens !== null && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      <span>{summary.total_output_tokens.toLocaleString()} out</span>
                    </div>
                  )}
                  {summary.has_recording && (
                    <Badge variant="secondary" className="gap-1 px-2 py-0">
                      <Mic className="h-3 w-3" />
                      <span>Recorded</span>
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {summary.post_prompt_summary ? (
                <div className="space-y-2">
                  <p className="text-sm leading-relaxed line-clamp-3">
                    {summary.post_prompt_summary}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No summary available
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedSummary && (
        <CallSummaryDetail
          summaryId={selectedSummary}
          agentId={summaries.find(s => s.id === selectedSummary)?.agent_id || ''}
          onClose={() => setSelectedSummary(null)}
        />
      )}
    </>
  )
}