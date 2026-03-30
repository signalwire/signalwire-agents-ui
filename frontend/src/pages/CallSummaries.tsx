import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { agentsApi } from '@/api/agents'
import CallSummariesList from '@/components/agents/CallSummariesList'

export function CallSummariesPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const navigate = useNavigate()

  const { data: agent } = useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => agentsApi.get(agentId!),
    enabled: !!agentId,
  })

  const { data: summaries, isLoading, error } = useQuery({
    queryKey: ['call-summaries', agentId],
    queryFn: () => agentsApi.getSummaries(agentId!),
    enabled: !!agentId,
  })

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
            <h1 className="text-xl sm:text-2xl font-bold">
              Call Summaries
            </h1>
            <p className="text-sm text-muted-foreground">
              {agent?.name || 'Loading...'}
            </p>
          </div>
        </div>

        {/* Content */}
        <CallSummariesList 
          summaries={summaries || []}
          loading={isLoading}
          error={error as Error | null}
          showAgentName={false}
        />
      </div>
    </MainLayout>
  )
}