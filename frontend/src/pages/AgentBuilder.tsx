import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Save, Eye, Plus, Settings, Shield } from 'lucide-react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { agentsApi, Agent, AgentConfig } from '@/api/agents'
import { settingsApi } from '@/api/settings'
import { toast } from '@/components/ui/use-toast'
import { PromptBuilder } from '@/components/agents/PromptBuilder'
import { SkillsSelector } from '@/components/agents/SkillsSelector'
import { ParamsEditor } from '@/components/agents/ParamsEditor'
import { BasicAuthConfig } from '@/components/agents/BasicAuthConfig'

interface AgentForm {
  name: string
  description: string
  voice: string
  language: string
  engine: string
}

export function AgentBuilderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditMode = !!id

  const [promptSections, setPromptSections] = useState<AgentConfig['prompt_sections']>([])
  const [skills, setSkills] = useState<AgentConfig['skills']>([])
  const [params, setParams] = useState<AgentConfig['params']>({})
  const [basicAuth, setBasicAuth] = useState<{ user?: string; password?: string }>({})
  const [showPromptBuilder, setShowPromptBuilder] = useState(false)
  const [showSkillsSelector, setShowSkillsSelector] = useState(false)
  const [showParamsEditor, setShowParamsEditor] = useState(false)
  const [showBasicAuth, setShowBasicAuth] = useState(false)

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<AgentForm>({
    defaultValues: {
      name: '',
      description: '',
      voice: 'nova',
      language: 'en-US',
      engine: 'rime',
    }
  })

  const selectedEngine = watch('engine')

  // Fetch settings for voice options
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  })

  // Fetch existing agent if editing
  const { data: agent } = useQuery({
    queryKey: ['agent', id],
    queryFn: () => agentsApi.get(id!),
    enabled: isEditMode,
  })

  // Load agent data when editing
  useEffect(() => {
    if (agent) {
      setValue('name', agent.name)
      setValue('description', agent.description || '')
      setValue('voice', agent.config.voice)
      setValue('language', agent.config.language)
      
      // Determine engine from voice
      const voice = agent.config.voice
      if (settings?.rime_voices.includes(voice)) setValue('engine', 'rime')
      else if (settings?.openai_voices.includes(voice)) setValue('engine', 'openai')
      // Add other engines as needed

      setPromptSections(agent.config.prompt_sections)
      setSkills(agent.config.skills)
      setParams(agent.config.params)
      if (agent.config.basic_auth_user) {
        setBasicAuth({
          user: agent.config.basic_auth_user,
          password: agent.config.basic_auth_password,
        })
      }
    }
  }, [agent, settings, setValue])

  // Get available voices for selected engine
  const getVoicesForEngine = (engine: string) => {
    if (!settings) return []
    switch (engine) {
      case 'rime': return settings.rime_voices
      case 'elevenlabs': return settings.elevenlabs_voices
      case 'azure': return settings.azure_voices
      case 'openai': return settings.openai_voices
      case 'google': return settings.google_voices
      default: return []
    }
  }

  const createMutation = useMutation({
    mutationFn: (data: AgentForm) => {
      const config: AgentConfig = {
        voice: data.voice,
        language: data.language,
        prompt_sections: promptSections,
        skills: skills,
        params: params,
        hints: [],
        ...(basicAuth.user && basicAuth.password && {
          basic_auth_user: basicAuth.user,
          basic_auth_password: basicAuth.password,
        }),
      }
      return agentsApi.create({
        name: data.name,
        description: data.description,
        config,
      })
    },
    onSuccess: () => {
      toast({ title: 'Agent created successfully' })
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      navigate('/agents')
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create agent',
        description: error.response?.data?.detail || 'Please try again',
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: AgentForm) => {
      const config: AgentConfig = {
        voice: data.voice,
        language: data.language,
        prompt_sections: promptSections,
        skills: skills,
        params: params,
        hints: [],
        ...(basicAuth.user && basicAuth.password && {
          basic_auth_user: basicAuth.user,
          basic_auth_password: basicAuth.password,
        }),
      }
      return agentsApi.update(id!, {
        name: data.name,
        description: data.description,
        config,
      })
    },
    onSuccess: () => {
      toast({ title: 'Agent updated successfully' })
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      queryClient.invalidateQueries({ queryKey: ['agent', id] })
      navigate('/agents')
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update agent',
        description: error.response?.data?.detail || 'Please try again',
        variant: 'destructive',
      })
    },
  })

  const onSubmit = (data: AgentForm) => {
    if (isEditMode) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  return (
    <MainLayout>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => navigate('/agents')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {isEditMode ? 'Edit Agent' : 'Create New Agent'}
              </h1>
              <p className="text-muted-foreground">
                Configure your SignalWire AI agent
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {isEditMode ? 'Update' : 'Create'} Agent
            </Button>
          </div>
        </div>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Set the name and description for your agent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Agent Name</Label>
              <Input
                id="name"
                {...register('name', { required: 'Name is required' })}
                placeholder="e.g., Customer Support Agent"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Describe what this agent does..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Voice Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Voice & Language</CardTitle>
            <CardDescription>
              Configure how your agent sounds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={watch('language')}
                  onValueChange={(value) => setValue('language', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {settings?.available_languages.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="engine">Voice Engine</Label>
                <Select
                  value={selectedEngine}
                  onValueChange={(value) => {
                    setValue('engine', value)
                    // Reset voice when engine changes
                    const voices = getVoicesForEngine(value)
                    if (voices.length > 0) {
                      setValue('voice', voices[0])
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {settings?.available_engines.map((engine) => (
                      <SelectItem key={engine} value={engine}>
                        {engine.charAt(0).toUpperCase() + engine.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="voice">Voice</Label>
                <Select
                  value={watch('voice')}
                  onValueChange={(value) => setValue('voice', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getVoicesForEngine(selectedEngine).map((voice) => (
                      <SelectItem key={voice} value={voice}>
                        {voice}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agent Configuration Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Prompt Builder */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setShowPromptBuilder(true)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Agent Instructions
                <Plus className="h-4 w-4" />
              </CardTitle>
              <CardDescription>
                {promptSections.length} prompt sections configured
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Click to configure the agent's personality and instructions
              </p>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setShowSkillsSelector(true)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Skills
                <Plus className="h-4 w-4" />
              </CardTitle>
              <CardDescription>
                {skills.length} skills enabled
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Click to add capabilities to your agent
              </p>
            </CardContent>
          </Card>

          {/* Parameters */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setShowParamsEditor(true)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                AI Parameters
                <Settings className="h-4 w-4" />
              </CardTitle>
              <CardDescription>
                Configure AI behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Click to adjust timeouts, model, and other settings
              </p>
            </CardContent>
          </Card>

          {/* Basic Auth */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setShowBasicAuth(true)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Access Control
                <Shield className="h-4 w-4" />
              </CardTitle>
              <CardDescription>
                {basicAuth.user ? 'Basic auth enabled' : 'Optional security'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Click to configure basic authentication
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Modals */}
        <PromptBuilder
          open={showPromptBuilder}
          onClose={() => setShowPromptBuilder(false)}
          sections={promptSections}
          onChange={setPromptSections}
        />

        <SkillsSelector
          open={showSkillsSelector}
          onClose={() => setShowSkillsSelector(false)}
          selectedSkills={skills}
          onChange={setSkills}
        />

        <ParamsEditor
          open={showParamsEditor}
          onClose={() => setShowParamsEditor(false)}
          params={params}
          onChange={setParams}
        />

        <BasicAuthConfig
          open={showBasicAuth}
          onClose={() => setShowBasicAuth(false)}
          config={basicAuth}
          onChange={setBasicAuth}
        />
      </form>
    </MainLayout>
  )
}