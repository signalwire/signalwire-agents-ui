import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Phone, Clock, Hash, FileText, Loader2 } from 'lucide-react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { agentsApi } from '@/api/agents'
import { format } from 'date-fns'
import { CallSummaryDetail } from '@/components/agents/CallSummaryDetail'

export function CallSummariesPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const navigate = useNavigate()
  const [selectedSummary, setSelectedSummary] = useState<string | null>(null)

  const { data: agent } = useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => agentsApi.get(agentId!),
    enabled: !!agentId,
  })

  const { data: summaries, isLoading } = useQuery({
    queryKey: ['call-summaries', agentId],
    queryFn: () => agentsApi.getSummaries(agentId!),
    enabled: !!agentId,
  })

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A'
    const mins = Math.floor(minutes)
    const secs = Math.round((minutes - mins) * 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatCost = (cost?: number) => {
    if (!cost) return '$0.00'
    return `$${cost.toFixed(2)}`
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/agents')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-heading-primary">
              Call Summaries
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {agent?.name || 'Loading...'}
            </p>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : summaries && summaries.length > 0 ? (
          <div className="grid gap-4">
            {summaries.map((summary) => (
              <Card 
                key={summary.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedSummary(summary.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {summary.caller_id_name || 'Unknown Caller'}
                      </CardTitle>
                      <CardDescription>
                        {summary.caller_id_number || 'No number'}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">
                      {format(new Date(summary.created_at), 'MMM d, yyyy h:mm a')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDuration(summary.total_minutes)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span>{summary.total_input_tokens || 0} tokens</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{summary.total_output_tokens || 0} tokens</span>
                    </div>
                    <div className="flex items-center gap-2 font-medium">
                      <span>{formatCost(summary.total_cost)}</span>
                    </div>
                  </div>

                  {/* Summary Preview */}
                  {summary.post_prompt_summary && (
                    <div className="border-t pt-4">
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {summary.post_prompt_summary}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No call summaries yet
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Call summaries will appear here after calls are completed with post-prompt enabled
              </p>
            </CardContent>
          </Card>
        )}

        {/* Detail Dialog */}
        {selectedSummary && (
          <CallSummaryDetail
            agentId={agentId!}
            summaryId={selectedSummary}
            onClose={() => setSelectedSummary(null)}
          />
        )}
      </div>
    </MainLayout>
  )
}