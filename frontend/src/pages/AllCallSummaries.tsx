import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Phone, 
  Filter, 
  X, 
  Search,
  Mic,
  User
} from 'lucide-react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { agentsApi } from '@/api/agents'
import { callSummariesApi, type CallSummariesParams } from '@/api/callSummaries'
import CallSummariesList from '@/components/agents/CallSummariesList'

export function AllCallSummariesPage() {
  const [filters, setFilters] = useState<CallSummariesParams>({
    limit: 20,
    sort_by: 'created_at',
    sort_order: 'desc'
  })
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Fetch all agents for filter dropdown
  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list(),
  })

  // Fetch call summaries with filters
  const { data: summaries, isLoading, error } = useQuery({
    queryKey: ['all-call-summaries', filters],
    queryFn: () => callSummariesApi.list(filters),
  })

  const handleFilterChange = (key: keyof CallSummariesParams, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const clearFilters = () => {
    setFilters({
      limit: 20,
      sort_by: 'created_at',
      sort_order: 'desc'
    })
  }

  const activeFilterCount = [
    filters.agent_id,
    filters.has_recording !== undefined,
    filters.caller_number,
    filters.start_date,
    filters.end_date,
  ].filter(Boolean).length

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">
              Call Summaries
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {summaries ? `${summaries.length} call${summaries.length !== 1 ? 's' : ''}` : 'Loading...'}
            </p>
          </div>
          
          {/* Filter Button */}
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setIsFilterOpen(true)}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Filter Dialog */}
        <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Filter Call Summaries</DialogTitle>
            </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Filters</h3>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-8 text-xs"
                    >
                      Clear all
                    </Button>
                  )}
                </div>

                {/* Agent Filter */}
                <div className="space-y-2">
                  <Label className="text-sm">Agent</Label>
                  <Select
                    value={filters.agent_id || 'all'}
                    onValueChange={(value) => 
                      handleFilterChange('agent_id', value === 'all' ? undefined : value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All agents" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All agents</SelectItem>
                      {agents?.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Caller Number Filter */}
                <div className="space-y-2">
                  <Label className="text-sm">Caller Number</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by number"
                      value={filters.caller_number || ''}
                      onChange={(e) => handleFilterChange('caller_number', e.target.value || undefined)}
                      className="pl-8"
                    />
                  </div>
                </div>

                {/* Recording Filter */}
                <div className="space-y-2">
                  <Label className="text-sm">Recording</Label>
                  <Select
                    value={
                      filters.has_recording === true ? 'yes' : 
                      filters.has_recording === false ? 'no' : 'all'
                    }
                    onValueChange={(value) => {
                      if (value === 'all') {
                        handleFilterChange('has_recording', undefined)
                      } else {
                        handleFilterChange('has_recording', value === 'yes')
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All calls" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All calls</SelectItem>
                      <SelectItem value="yes">With recording</SelectItem>
                      <SelectItem value="no">Without recording</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Options */}
                <div className="space-y-2">
                  <Label className="text-sm">Sort by</Label>
                  <div className="flex gap-2">
                    <Select
                      value={filters.sort_by || 'created_at'}
                      onValueChange={(value: any) => handleFilterChange('sort_by', value)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_at">Date</SelectItem>
                        <SelectItem value="duration">Duration</SelectItem>
                        <SelectItem value="agent_name">Agent</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={filters.sort_order || 'desc'}
                      onValueChange={(value: any) => handleFilterChange('sort_order', value)}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Desc</SelectItem>
                        <SelectItem value="asc">Asc</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </DialogContent>
        </Dialog>

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.agent_id && (
              <Badge variant="secondary" className="gap-1">
                <User className="h-3 w-3" />
                {agents?.find(a => a.id === filters.agent_id)?.name || 'Agent'}
                <button
                  onClick={() => handleFilterChange('agent_id', undefined)}
                  className="ml-1 hover:bg-secondary-foreground/20 rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.caller_number && (
              <Badge variant="secondary" className="gap-1">
                <Phone className="h-3 w-3" />
                {filters.caller_number}
                <button
                  onClick={() => handleFilterChange('caller_number', undefined)}
                  className="ml-1 hover:bg-secondary-foreground/20 rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.has_recording !== undefined && (
              <Badge variant="secondary" className="gap-1">
                <Mic className="h-3 w-3" />
                {filters.has_recording ? 'With recording' : 'No recording'}
                <button
                  onClick={() => handleFilterChange('has_recording', undefined)}
                  className="ml-1 hover:bg-secondary-foreground/20 rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}

        {/* Content */}
        <CallSummariesList 
          summaries={summaries || []}
          loading={isLoading}
          error={error as Error | null}
          showAgentName={true}
        />
      </div>
    </MainLayout>
  )
}