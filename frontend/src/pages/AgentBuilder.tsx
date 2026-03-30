import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Save, Plus, Shield, Settings, Hash, Mic, Database, Zap, Circle, FileText, Network, Copy, Brain, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { agentsApi, AgentConfig } from '@/api/agents'
import { settingsApi } from '@/api/settings'
import { toast } from '@/components/ui/use-toast'
import { PromptBuilder } from '@/components/agents/PromptBuilder'
import { SkillsSelector } from '@/components/agents/SkillsSelector'
import { ParamsEditor } from '@/components/agents/ParamsEditor'
import { BasicAuthConfig } from '@/components/agents/BasicAuthConfig'
import { api } from '@/lib/api'
// Import new configuration components
import { HintsConfig } from '@/components/agents/config/HintsConfig'
import { PronunciationsConfig } from '@/components/agents/config/PronunciationsConfig'
import { GlobalDataConfig } from '@/components/agents/config/GlobalDataConfig'
import { NativeFunctionsConfig } from '@/components/agents/config/NativeFunctionsConfig'
import { RecordingConfig } from '@/components/agents/config/RecordingConfig'
import { PostPromptConfig } from '@/components/agents/config/PostPromptConfig'
import { ContextsStepsConfig } from '@/components/agents/config/ContextsStepsConfig'
import { KnowledgeBaseConfig } from '@/components/knowledge-base/KnowledgeBaseConfig'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { SaveAsCopyDialog } from '@/components/agents/SaveAsCopyDialog'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { helpContent } from '@/lib/helpContent'
import { LLMParamsCard } from '@/components/agents/LLMParamsCard'
import { LanguagesConfig } from '@/components/agents/config/LanguagesConfig'
import { AgentTypeSelector } from '@/components/agents/AgentTypeSelector'
import { BedrockParamsCard } from '@/components/agents/BedrockParamsCard'
import { BedrockParamsDialog } from '@/components/agents/BedrockParamsDialog'

interface LanguageConfig {
  id: string
  name: string  // Language name (e.g., "English", "Spanish")
  code: string  // Language code (e.g., "en-US", "es-MX")
  voice: string
  engine: string
  model?: string
}

interface AgentForm {
  name: string
  description: string
}

export function AgentBuilderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const copyId = searchParams.get('copy')
  const isEditMode = !!id

  const [agentType, setAgentType] = useState<'regular' | 'bedrock'>('regular')
  const [promptSections, setPromptSections] = useState<AgentConfig['prompt_sections']>([])
  const [skills, setSkills] = useState<AgentConfig['skills']>([])
  const [params, setParams] = useState<AgentConfig['params']>({})
  const [basicAuth, setBasicAuth] = useState<{ user?: string; password?: string }>({})
  
  // Bedrock-specific parameters
  const [bedrockVoiceId, setBedrockVoiceId] = useState<string>('tiffany')
  const [bedrockTemperature, setBedrockTemperature] = useState<number>(0.7)
  const [bedrockTopP, setBedrockTopP] = useState<number>(0.9)
  const [bedrockMaxTokens, setBedrockMaxTokens] = useState<number>(1024)
  
  // New configuration states
  const [hintsConfig, setHintsConfig] = useState<{ simple_hints: string[], pattern_hints: any[] }>({
    simple_hints: [],
    pattern_hints: []
  })
  const [pronunciations, setPronunciations] = useState<any[]>([])
  const [globalData, setGlobalData] = useState<Record<string, any>>({})
  const [nativeFunctionsConfig, setNativeFunctionsConfig] = useState<{
    enabled_functions: string[],
    internal_fillers: Record<string, Record<string, string[]>>
  }>({
    enabled_functions: [],
    internal_fillers: {}
  })
  const [recordingConfig, setRecordingConfig] = useState<{
    enabled: boolean,
    format: 'mp4' | 'wav',
    stereo: boolean
  }>({
    enabled: false,
    format: 'mp4',
    stereo: true
  })
  const [postPromptConfig, setPostPromptConfig] = useState<{
    enabled?: boolean,
    mode: 'builtin' | 'custom',
    text?: string,
    custom_url?: string
  }>({
    enabled: false,
    mode: 'builtin',
    text: 'Summarize the conversation including key points and action items'
  })
  const [contextsStepsConfig, setContextsStepsConfig] = useState<{
    contexts: any[]
  }>({
    contexts: []
  })
  const [knowledgeBaseAttachments, setKnowledgeBaseAttachments] = useState<any[]>([])
  const [knowledgeBaseConfig, setKnowledgeBaseConfig] = useState<{
    knowledge_base_ids: string[],
    search_strategy: 'all' | 'round_robin' | 'fallback',
    similarity_threshold?: number,
    search_count?: number
  }>({
    knowledge_base_ids: [],
    search_strategy: 'all',
    similarity_threshold: 0.0,
    search_count: 3
  })
  const [promptLLMParams, setPromptLLMParams] = useState<Record<string, any>>({})
  const [postPromptLLMParams, setPostPromptLLMParams] = useState<Record<string, any>>({})
  const [languages, setLanguages] = useState<LanguageConfig[]>([])
  const [showPromptBuilder, setShowPromptBuilder] = useState(false)
  const [showSkillsSelector, setShowSkillsSelector] = useState(false)
  const [showParamsEditor, setShowParamsEditor] = useState(false)
  const [showBasicAuth, setShowBasicAuth] = useState(false)
  const [languageConfigs, setLanguageConfigs] = useState<any[]>([])
  
  // New configuration dialogs
  const [showHintsConfig, setShowHintsConfig] = useState(false)
  const [showPronunciationsConfig, setShowPronunciationsConfig] = useState(false)
  const [showGlobalDataConfig, setShowGlobalDataConfig] = useState(false)
  const [showNativeFunctionsConfig, setShowNativeFunctionsConfig] = useState(false)
  const [showRecordingConfig, setShowRecordingConfig] = useState(false)
  const [showPostPromptConfig, setShowPostPromptConfig] = useState(false)
  const [showContextsStepsConfig, setShowContextsStepsConfig] = useState(false)
  const [showKnowledgeBaseSelector, setShowKnowledgeBaseSelector] = useState(false)
  const [showLLMParams, setShowLLMParams] = useState(false)
  const [changeCount, setChangeCount] = useState(0)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [showNavigateDialog, setShowNavigateDialog] = useState(false)
  const [pendingNavigationPath, setPendingNavigationPath] = useState<string | null>(null)
  const [showCopyDialog, setShowCopyDialog] = useState(false)

  const { register, handleSubmit, formState: { errors, isDirty }, setValue } = useForm<AgentForm>({
    defaultValues: {
      name: '',
      description: ''
    }
  })

  // Initialize with default English language
  useEffect(() => {
    if (languages.length === 0 && !isEditMode && !copyId) {
      setLanguages([{
        id: 'default-en',
        name: 'English',
        code: 'en-US',
        voice: 'adam',
        engine: 'elevenlabs'
      }])
    }
  }, [isEditMode, copyId])
  const hasChanges = changeCount > 0 || isDirty

  // Handle navigation with unsaved changes
  const handleNavigation = (path: string) => {
    if (hasChanges) {
      setPendingNavigationPath(path)
      setShowNavigateDialog(true)
    } else {
      navigate(path)
    }
  }

  // Handle discard changes
  const handleDiscard = async () => {
    if (agent && languageConfigs) {
      // Reset form values
      setValue('name', agent.name)
      setValue('description', agent.description || '')
      
      // Reset agent type
      setAgentType(agent.agent_type || agent.config.agent_type || 'regular')
      
      // Reset Bedrock-specific parameters if it's a Bedrock agent
      if (agent.agent_type === 'bedrock' || agent.config.agent_type === 'bedrock') {
        setBedrockVoiceId(agent.config.voice_id || 'tiffany')
        setBedrockTemperature(agent.config.temperature || 0.7)
        setBedrockTopP(agent.config.top_p || 0.9)
        setBedrockMaxTokens(agent.config.max_tokens || 1024)
      }
      
      // Reset languages from agent config
      if (agent.config.languages && Array.isArray(agent.config.languages)) {
        setLanguages(agent.config.languages.map((lang: any, index: number) => ({
          id: lang.id || `lang-${index}`,
          name: lang.name,
          code: lang.code,
          voice: lang.voice,
          engine: lang.engine,
          model: lang.model
        })))
      } else {
        // Legacy single language config
        setLanguages([{
          id: 'default-lang',
          name: agent.config.language === 'multi' ? 'Multilingual' : getLanguageName(agent.config.language || 'en-US'),
          code: agent.config.language || 'en-US',
          voice: agent.config.voice || 'adam',
          engine: agent.config.engine || 'elevenlabs',
          model: agent.config.model
        }])
      }

      // Reset all configurations
      setPromptSections(agent.config.prompt_sections)
      setSkills(agent.config.skills)
      setParams(agent.config.params)
      if (agent.config.basic_auth_user) {
        setBasicAuth({
          user: agent.config.basic_auth_user,
          password: agent.config.basic_auth_password,
        })
      } else {
        setBasicAuth({ user: '', password: '' })
      }
      
      setHintsConfig({
        simple_hints: agent.config.simple_hints || [],
        pattern_hints: agent.config.pattern_hints || []
      })
      setPronunciations(agent.config.pronunciations || [])
      setGlobalData(agent.config.global_data || {})
      setNativeFunctionsConfig({
        enabled_functions: agent.config.native_functions || [],
        internal_fillers: agent.config.internal_fillers || {}
      })
      setRecordingConfig({
        enabled: agent.config.record_call || false,
        format: agent.config.record_format || 'mp4',
        stereo: agent.config.record_stereo !== false
      })
      setPostPromptConfig({
        enabled: agent.config.post_prompt_config?.enabled ?? false,
        mode: agent.config.post_prompt_config?.mode ?? 'builtin',
        text: agent.config.post_prompt_config?.text ?? 'Summarize the conversation including key points and action items',
        custom_url: agent.config.post_prompt_config?.custom_url
      })
      setContextsStepsConfig(agent.config.contexts_steps_config || { contexts: [] })
      // Load knowledge base configuration
      if (agent.config.knowledge_base_config) {
        setKnowledgeBaseConfig(agent.config.knowledge_base_config)
      } else if (agent.knowledge_bases) {
        // Legacy: just the IDs
        setKnowledgeBaseConfig({
          knowledge_base_ids: agent.knowledge_bases.map((kb: any) => kb.id),
          search_strategy: 'all',
          similarity_threshold: 0.0,
          search_count: 3
        })
      } else {
        setKnowledgeBaseConfig({
          knowledge_base_ids: [],
          search_strategy: 'all',
          similarity_threshold: 0.0,
          search_count: 3
        })
      }
      
      // Load knowledge base attachments
      if (agent.knowledge_bases && agent.knowledge_bases.length > 0) {
        const attachments = agent.knowledge_bases.map((kb: any) => ({
          knowledge_base_id: kb.id,
          config: kb.config || {}
        }))
        setKnowledgeBaseAttachments(attachments)
      } else {
        setKnowledgeBaseAttachments([])
      }
      
      // Reset change tracking
      setChangeCount(0)
      setShowDiscardDialog(false)
      
      // Force form to reset dirty state
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }

  // Helper function to track changes
  const trackChange = <T extends any>(setter: React.Dispatch<React.SetStateAction<T>>) => {
    return (value: React.SetStateAction<T>) => {
      setter(value)
      if (isEditMode) {
        setChangeCount(prev => prev + 1)
      }
    }
  }

  // Wrapped state setters that track changes
  const setPromptSectionsWithTracking = trackChange(setPromptSections)
  const setSkillsWithTracking = trackChange(setSkills)
  const setParamsWithTracking = trackChange(setParams)
  const setBasicAuthWithTracking = trackChange(setBasicAuth)
  const setHintsConfigWithTracking = trackChange(setHintsConfig)
  const setPronunciationsWithTracking = trackChange(setPronunciations)
  const setGlobalDataWithTracking = trackChange(setGlobalData)
  const setNativeFunctionsConfigWithTracking = trackChange(setNativeFunctionsConfig)
  const setRecordingConfigWithTracking = trackChange(setRecordingConfig)
  const setPostPromptConfigWithTracking = trackChange(setPostPromptConfig)
  const setContextsStepsConfigWithTracking = trackChange(setContextsStepsConfig)
  // const setKnowledgeBaseConfigWithTracking = trackChange(setKnowledgeBaseConfig) // Not used with new KB UI
  const setKnowledgeBaseAttachmentsWithTracking = trackChange(setKnowledgeBaseAttachments)
  const setPromptLLMParamsWithTracking = trackChange(setPromptLLMParams)
  const setPostPromptLLMParamsWithTracking = trackChange(setPostPromptLLMParams)
  const setLanguagesWithTracking = trackChange(setLanguages)
  const setBedrockVoiceIdWithTracking = trackChange(setBedrockVoiceId)
  const setBedrockTemperatureWithTracking = trackChange(setBedrockTemperature)
  const setBedrockTopPWithTracking = trackChange(setBedrockTopP)
  const setBedrockMaxTokensWithTracking = trackChange(setBedrockMaxTokens)

  // Fetch settings for voice options
  const { } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  })

  // Fetch language configurations
  const { data: langConfigData } = useQuery({
    queryKey: ['language-configs'],
    queryFn: async () => {
      const response = await api.get('/api/admin/settings/language-configs')
      return response.data
    },
  })

  useEffect(() => {
    if (langConfigData) {
      setLanguageConfigs(langConfigData.configs || [])
    }
  }, [langConfigData])

  // Fetch existing agent if editing or copying
  const { data: agent } = useQuery({
    queryKey: ['agent', id || copyId],
    queryFn: () => agentsApi.get((id || copyId)!),
    enabled: isEditMode || !!copyId,
  })


  // Load agent data when editing or copying
  useEffect(() => {
    if (agent && languageConfigs) {
      // When copying, prepend "Copy of " to the name
      setValue('name', copyId ? `Copy of ${agent.name}` : agent.name)
      setValue('description', agent.description || '')

      // Load agent type
      setAgentType(agent.agent_type || agent.config.agent_type || 'regular')
      
      // Load Bedrock-specific parameters if it's a Bedrock agent
      if (agent.agent_type === 'bedrock' || agent.config.agent_type === 'bedrock') {
        setBedrockVoiceId(agent.config.voice_id || 'tiffany')
        setBedrockTemperature(agent.config.temperature || 0.7)
        setBedrockTopP(agent.config.top_p || 0.9)
        setBedrockMaxTokens(agent.config.max_tokens || 1024)
      }

      setPromptSections(agent.config.prompt_sections)
      setSkills(agent.config.skills)
      setParams(agent.config.params)
      if (agent.config.basic_auth_user) {
        setBasicAuth({
          user: agent.config.basic_auth_user,
          password: agent.config.basic_auth_password,
        })
      }
      
      // Load new configurations
      if (agent.config.simple_hints || agent.config.pattern_hints) {
        setHintsConfig({
          simple_hints: agent.config.simple_hints || [],
          pattern_hints: agent.config.pattern_hints || []
        })
      }
      if (agent.config.pronunciations) {
        setPronunciations(agent.config.pronunciations)
      }
      if (agent.config.global_data) {
        setGlobalData(agent.config.global_data)
      }
      if (agent.config.native_functions || agent.config.internal_fillers) {
        setNativeFunctionsConfig({
          enabled_functions: agent.config.native_functions || [],
          internal_fillers: agent.config.internal_fillers || {}
        })
      }
      if (agent.config.record_call !== undefined) {
        setRecordingConfig({
          enabled: agent.config.record_call,
          format: agent.config.record_format || 'mp4',
          stereo: agent.config.record_stereo !== false // default true
        })
      }
      if (agent.config.post_prompt_config) {
        // Ensure all fields are present, including enabled
        console.log('Loading post_prompt_config:', agent.config.post_prompt_config);
        setPostPromptConfig({
          enabled: agent.config.post_prompt_config.enabled ?? false,
          mode: agent.config.post_prompt_config.mode ?? 'builtin',
          text: agent.config.post_prompt_config.text ?? 'Summarize the conversation including key points and action items',
          custom_url: agent.config.post_prompt_config.custom_url
        })
      } else if (agent.config.post_prompt_url || agent.config.post_prompt) {
        // Legacy support
        setPostPromptConfig({
          enabled: true,
          mode: agent.config.post_prompt_url ? 'custom' : 'builtin',
          text: agent.config.post_prompt || 'Summarize the conversation including key points and action items',
          custom_url: agent.config.post_prompt_url
        })
      }
      if (agent.config.contexts_steps_config) {
        setContextsStepsConfig(agent.config.contexts_steps_config)
      }
      // Load knowledge base configuration from copied agent
      if (agent.config.knowledge_base_config) {
        console.log('Loading knowledge base config from agent:', agent.config.knowledge_base_config);
        setKnowledgeBaseConfig(agent.config.knowledge_base_config)
      } else if (agent.knowledge_bases) {
        console.log('Loading knowledge bases from agent (legacy):', agent.knowledge_bases);
        setKnowledgeBaseConfig({
          knowledge_base_ids: agent.knowledge_bases.map((kb: any) => kb.id),
          search_strategy: 'all',
          similarity_threshold: 0.0,
          search_count: 3
        })
      } else {
        console.log('No knowledge bases in agent');
        setKnowledgeBaseConfig({
          knowledge_base_ids: [],
          search_strategy: 'all',
          similarity_threshold: 0.0,
          search_count: 3
        })
      }
      
      // Load knowledge base attachments from agent
      if (agent.knowledge_bases && agent.knowledge_bases.length > 0) {
        const attachments = agent.knowledge_bases.map((kb: any) => ({
          knowledge_base_id: kb.id,
          config: kb.config || {}
        }))
        setKnowledgeBaseAttachments(attachments)
      }
      
      // Load LLM params
      if (agent.config.prompt_llm_params) {
        setPromptLLMParams(agent.config.prompt_llm_params)
      }
      if (agent.config.post_prompt_llm_params) {
        setPostPromptLLMParams(agent.config.post_prompt_llm_params)
      }
      
      // Load languages from agent config
      if (agent.config.languages && Array.isArray(agent.config.languages)) {
        // Agent already has multiple languages configured
        setLanguages(agent.config.languages.map((lang: any, index: number) => ({
          id: lang.id || `lang-${index}`,
          name: lang.name,
          code: lang.code,
          voice: lang.voice,
          engine: lang.engine,
          model: lang.model
        })))
      } else {
        // Legacy single language config - convert to array
        setLanguages([{
          id: 'default-lang',
          name: agent.config.language === 'multi' ? 'Multilingual' : getLanguageName(agent.config.language || 'en-US'),
          code: agent.config.language || 'en-US',
          voice: agent.config.voice || 'adam',
          engine: agent.config.engine || 'elevenlabs',
          model: agent.config.model
        }])
      }
      
      // Reset unsaved changes flag when agent is loaded
      setChangeCount(0)
    }
  }, [agent, languageConfigs, setValue])

  // Helper to get language name from code
  const getLanguageName = (code: string): string => {
    const langNames: Record<string, string> = {
      'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
      'pt': 'Portuguese', 'it': 'Italian', 'ja': 'Japanese', 'ko': 'Korean',
      'zh': 'Chinese', 'ru': 'Russian', 'hi': 'Hindi', 'nl': 'Dutch',
      'multi': 'Multilingual'
    }
    const baseLang = code.split('-')[0]
    return langNames[baseLang] || 'Custom'
  }


  const createMutation = useMutation({
    mutationFn: (data: AgentForm) => {
      // For backward compatibility, use the first language for legacy fields
      const firstLanguage = languages[0] || {
        code: 'en-US',
        voice: 'adam',
        engine: 'elevenlabs'
      }

      const config: AgentConfig = {
        agent_type: agentType,
        // Always include voice and language for backward compatibility
        voice: agentType === 'bedrock' ? bedrockVoiceId : firstLanguage.voice,
        language: agentType === 'bedrock' ? 'en-US' : firstLanguage.code,
        engine: agentType === 'bedrock' ? 'bedrock' : firstLanguage.engine,
        model: agentType === 'bedrock' ? undefined : firstLanguage.model,
        // For Bedrock agents, include Bedrock-specific parameters
        ...(agentType === 'bedrock' ? {
          voice_id: bedrockVoiceId,
          temperature: bedrockTemperature,
          top_p: bedrockTopP,
          max_tokens: bedrockMaxTokens,
        } : {
          // Regular agent parameters
          // New multi-language support
          languages: languages,
        }),
        prompt_sections: promptSections,
        skills: skills,
        params: params,
        hints: [], // Legacy, kept for compatibility
        ...(basicAuth.user && basicAuth.password && {
          basic_auth_user: basicAuth.user,
          basic_auth_password: basicAuth.password,
        }),
        // New configurations
        simple_hints: hintsConfig.simple_hints,
        pattern_hints: hintsConfig.pattern_hints,
        pronunciations: pronunciations,
        global_data: globalData,
        native_functions: nativeFunctionsConfig.enabled_functions,
        internal_fillers: nativeFunctionsConfig.internal_fillers,
        record_call: recordingConfig.enabled,
        record_format: recordingConfig.format,
        record_stereo: recordingConfig.stereo,
        post_prompt_config: postPromptConfig,
        contexts_steps_config: contextsStepsConfig,
        knowledge_base_config: knowledgeBaseConfig,
        knowledge_base_ids: knowledgeBaseConfig.knowledge_base_ids,
        knowledge_bases: knowledgeBaseAttachments.map(att => ({
          id: att.knowledge_base_id,
          config: att.config
        })),
        prompt_llm_params: promptLLMParams,
        post_prompt_llm_params: postPromptLLMParams,
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
      setChangeCount(0)
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

  const copyMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      if (!agent) throw new Error('No agent to copy')
      
      // Build the complete config from current state
      // For backward compatibility, use the first language for legacy fields
      const firstLanguage = languages[0] || {
        code: 'en-US',
        voice: 'adam',
        engine: 'elevenlabs'
      }

      const config: AgentConfig = {
        agent_type: agentType,
        // Always include voice and language for backward compatibility
        voice: agentType === 'bedrock' ? bedrockVoiceId : firstLanguage.voice,
        language: agentType === 'bedrock' ? 'en-US' : firstLanguage.code,
        engine: agentType === 'bedrock' ? 'bedrock' : firstLanguage.engine,
        model: agentType === 'bedrock' ? undefined : firstLanguage.model,
        // For Bedrock agents, include Bedrock-specific parameters
        ...(agentType === 'bedrock' ? {
          voice_id: bedrockVoiceId,
          temperature: bedrockTemperature,
          top_p: bedrockTopP,
          max_tokens: bedrockMaxTokens,
        } : {
          // Regular agent parameters
          // New multi-language support
          languages: languages,
        }),
        prompt_sections: promptSections,
        skills: skills,
        params: params,
        hints: [],
        ...(basicAuth.user && basicAuth.password && {
          basic_auth_user: basicAuth.user,
          basic_auth_password: basicAuth.password,
        }),
        simple_hints: hintsConfig.simple_hints,
        pattern_hints: hintsConfig.pattern_hints,
        pronunciations: pronunciations,
        global_data: globalData,
        native_functions: nativeFunctionsConfig.enabled_functions,
        internal_fillers: nativeFunctionsConfig.internal_fillers,
        record_call: recordingConfig.enabled,
        record_format: recordingConfig.format,
        record_stereo: recordingConfig.stereo,
        post_prompt_config: postPromptConfig,
        contexts_steps_config: contextsStepsConfig,
        knowledge_base_config: knowledgeBaseConfig,
        knowledge_base_ids: knowledgeBaseConfig.knowledge_base_ids,
        knowledge_bases: knowledgeBaseAttachments.map(att => ({
          id: att.knowledge_base_id,
          config: att.config
        })),
        prompt_llm_params: promptLLMParams,
        post_prompt_llm_params: postPromptLLMParams,
      }
      
      return agentsApi.create({
        name,
        description,
        config,
      })
    },
    onSuccess: (newAgent) => {
      toast({ title: 'Agent copied successfully' })
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      navigate(`/agents/${newAgent.id}/edit`)
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to copy agent',
        description: error.response?.data?.detail || 'Please try again',
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: AgentForm) => {
      // For backward compatibility, use the first language for legacy fields
      const firstLanguage = languages[0] || {
        code: 'en-US',
        voice: 'adam',
        engine: 'elevenlabs'
      }

      const config: AgentConfig = {
        agent_type: agentType,
        // Always include voice and language for backward compatibility
        voice: agentType === 'bedrock' ? bedrockVoiceId : firstLanguage.voice,
        language: agentType === 'bedrock' ? 'en-US' : firstLanguage.code,
        engine: agentType === 'bedrock' ? 'bedrock' : firstLanguage.engine,
        model: agentType === 'bedrock' ? undefined : firstLanguage.model,
        // For Bedrock agents, include Bedrock-specific parameters
        ...(agentType === 'bedrock' ? {
          voice_id: bedrockVoiceId,
          temperature: bedrockTemperature,
          top_p: bedrockTopP,
          max_tokens: bedrockMaxTokens,
        } : {
          // Regular agent parameters
          // New multi-language support
          languages: languages,
        }),
        prompt_sections: promptSections,
        skills: skills,
        params: params,
        hints: [], // Legacy, kept for compatibility
        ...(basicAuth.user && basicAuth.password && {
          basic_auth_user: basicAuth.user,
          basic_auth_password: basicAuth.password,
        }),
        // New configurations
        simple_hints: hintsConfig.simple_hints,
        pattern_hints: hintsConfig.pattern_hints,
        pronunciations: pronunciations,
        global_data: globalData,
        native_functions: nativeFunctionsConfig.enabled_functions,
        internal_fillers: nativeFunctionsConfig.internal_fillers,
        record_call: recordingConfig.enabled,
        record_format: recordingConfig.format,
        record_stereo: recordingConfig.stereo,
        post_prompt_config: postPromptConfig,
        contexts_steps_config: contextsStepsConfig,
        knowledge_base_config: knowledgeBaseConfig,
        knowledge_base_ids: knowledgeBaseConfig.knowledge_base_ids,
        knowledge_bases: knowledgeBaseAttachments.map(att => ({
          id: att.knowledge_base_id,
          config: att.config
        })),
        prompt_llm_params: promptLLMParams,
        post_prompt_llm_params: postPromptLLMParams,
      }
      console.log('Updating agent with LLM params:', { promptLLMParams, postPromptLLMParams });
      console.log('Saving agent with post_prompt_config:', postPromptConfig);
      console.log('Saving agent with knowledge_base_config:', knowledgeBaseConfig);
      console.log('Updating Bedrock agent config:', { agentType, bedrockVoiceId, bedrockTemperature, bedrockTopP, bedrockMaxTokens });
      console.log('Final config being sent:', config);
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
      setChangeCount(0)
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
        {/* Header with title */}
        <div className="flex items-center gap-2 sm:gap-4 mb-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleNavigation('/agents')}
            className="flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold whitespace-nowrap">
              {isEditMode ? 'Edit Agent' : copyId ? 'Copy Agent' : 'Create New Agent'}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {copyId ? 'Creating a copy of an existing agent' : 'Configure your SignalWire AI agent'}
            </p>
          </div>
        </div>

        {/* Sticky button row */}
        <div className="sticky top-0 z-50 bg-background pb-4 -mx-2 px-2">
          <div className="flex justify-end gap-2 flex-nowrap overflow-x-auto border-b pb-4">
            {hasChanges && isEditMode && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDiscardDialog(true)}
                className="text-sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Discard
              </Button>
            )}
            {isEditMode && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCopyDialog(true)}
                className="text-sm"
              >
                <Copy className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Save As Copy</span>
                <span className="sm:hidden">Copy</span>
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={createMutation.isPending || updateMutation.isPending || (isEditMode && !hasChanges)}
              className="text-sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {isEditMode ? 'Save Agent' : 'Create Agent'}
              {hasChanges && changeCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-2 h-5 min-w-[1.25rem] px-1 flex items-center justify-center text-xs"
                >
                  {changeCount > 9 ? '9+' : changeCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-heading-secondary">Basic Information</CardTitle>
            <CardDescription>
              Set the name and description for your agent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="name">Agent Name</Label>
                <HelpTooltip content={helpContent.agent.name} />
              </div>
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
              <div className="flex items-center gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <HelpTooltip content={helpContent.agent.description} />
              </div>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Describe what this agent does..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Agent Type Selection - Only show for new agents */}
        {!isEditMode && (
          <Card>
            <CardHeader>
              <CardTitle className="text-heading-secondary">Agent Type</CardTitle>
              <CardDescription>
                Choose the type of AI agent to create
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AgentTypeSelector
                value={agentType}
                onChange={(value) => setAgentType(value as 'regular' | 'bedrock')}
                disabled={false}
              />
            </CardContent>
          </Card>
        )}

        {/* Languages Configuration - Only for regular agents */}
        {agentType === 'regular' && (
          <LanguagesConfig
            languages={languages}
            onChange={setLanguagesWithTracking}
            languageConfigs={languageConfigs}
          />
        )}

        {/* Bedrock Configuration - Only for Bedrock agents */}
        {agentType === 'bedrock' && (
          <BedrockParamsCard
            voiceId={bedrockVoiceId}
            temperature={bedrockTemperature}
            topP={bedrockTopP}
            maxTokens={bedrockMaxTokens}
            onVoiceChange={setBedrockVoiceIdWithTracking}
            onTemperatureChange={setBedrockTemperatureWithTracking}
            onTopPChange={setBedrockTopPWithTracking}
            onMaxTokensChange={setBedrockMaxTokensWithTracking}
          />
        )}

        {/* Agent Instructions - Full width card */}
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setShowPromptBuilder(true)}
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-heading-secondary">
              Agent Instructions
              <Plus className="h-4 w-4" />
            </CardTitle>
            <CardDescription>
              Configure the agent's personality, behavior, and conversation style
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {promptSections.length > 0 
                  ? `${promptSections.length} prompt section${promptSections.length === 1 ? '' : 's'} configured`
                  : 'No instructions configured yet'}
              </p>
              <p className="text-sm text-muted-foreground">
                Click to add instructions that define how your agent behaves and responds
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Agent Configuration Cards */}
        <div className="grid gap-4 md:grid-cols-2">

          {/* Skills */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setShowSkillsSelector(true)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-heading-card">
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
              <CardTitle className="flex items-center justify-between text-heading-card">
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

          {/* LLM Parameters - Only for regular agents */}
          {agentType === 'regular' && (
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setShowLLMParams(true)}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-heading-card">
                  LLM Parameters
                  <Brain className="h-4 w-4" />
                </CardTitle>
                <CardDescription>
                  Fine-tune model behavior
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Click to adjust temperature, penalties, and other LLM settings
                </p>
              </CardContent>
            </Card>
          )}

          {/* Basic Auth */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setShowBasicAuth(true)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-heading-card">
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

          {/* Hints - Only for regular agents */}
          {agentType === 'regular' && (
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setShowHintsConfig(true)}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-heading-card">
                  Hints
                  <Hash className="h-4 w-4" />
                </CardTitle>
                <CardDescription>
                  {hintsConfig.simple_hints.length + hintsConfig.pattern_hints.length} hints configured
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Click to help AI understand specific terms and patterns
                </p>
              </CardContent>
            </Card>
          )}

          {/* Pronunciations - Only for regular agents */}
          {agentType === 'regular' && (
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setShowPronunciationsConfig(true)}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-heading-card">
                  Pronunciations
                  <Mic className="h-4 w-4" />
                </CardTitle>
                <CardDescription>
                  {pronunciations.length} custom pronunciations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Click to configure how AI pronounces specific words
                </p>
              </CardContent>
            </Card>
          )}

          {/* Global Data */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setShowGlobalDataConfig(true)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-heading-card">
                Global Data
                <Database className="h-4 w-4" />
              </CardTitle>
              <CardDescription>
                {Object.keys(globalData).length} data entries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Click to set persistent data for the conversation
              </p>
            </CardContent>
          </Card>

          {/* Native Functions */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setShowNativeFunctionsConfig(true)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-heading-card">
                Native Functions
                <Zap className="h-4 w-4" />
              </CardTitle>
              <CardDescription>
                {nativeFunctionsConfig.enabled_functions.length} functions enabled
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Click to enable built-in functions and configure fillers
              </p>
            </CardContent>
          </Card>

          {/* Recording */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setShowRecordingConfig(true)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-heading-card">
                Recording
                <Circle className={`h-4 w-4 ${recordingConfig.enabled ? 'text-red-500 fill-red-500' : ''}`} />
              </CardTitle>
              <CardDescription>
                {recordingConfig.enabled ? `Recording enabled (${recordingConfig.format})` : 'Recording disabled'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Click to configure call recording settings
              </p>
            </CardContent>
          </Card>

          {/* Post-Prompt Summary */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setShowPostPromptConfig(true)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-heading-card">
                Post-Prompt Summary
                <FileText className="h-4 w-4" />
              </CardTitle>
              <CardDescription>
                {postPromptConfig.mode === 'builtin' ? 'Using built-in viewer' : 'Custom URL configured'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Click to configure conversation summary handling
              </p>
            </CardContent>
          </Card>

          {/* Contexts & Steps - Only for regular agents */}
          {agentType !== 'bedrock' && (
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setShowContextsStepsConfig(true)}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-heading-card">
                  Contexts & Steps
                  <Network className="h-4 w-4" />
                </CardTitle>
                <CardDescription>
                  {contextsStepsConfig.contexts.length} contexts configured
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Click to build structured conversation flows
                </p>
              </CardContent>
            </Card>
          )}

          {/* Knowledge Base */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setShowKnowledgeBaseSelector(true)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-heading-card">
                Knowledge Base
                <FileText className="h-4 w-4" />
              </CardTitle>
              <CardDescription>
                {knowledgeBaseAttachments.length > 0 
                  ? `${knowledgeBaseAttachments.length} knowledge base${knowledgeBaseAttachments.length > 1 ? 's' : ''} attached`
                  : 'Attach knowledge bases for AI reference'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Click to configure knowledge bases and search tools
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Modals */}
        <PromptBuilder
          open={showPromptBuilder}
          onClose={() => setShowPromptBuilder(false)}
          sections={promptSections}
          onChange={setPromptSectionsWithTracking}
        />

        <SkillsSelector
          open={showSkillsSelector}
          onClose={() => setShowSkillsSelector(false)}
          selectedSkills={skills}
          onChange={setSkillsWithTracking}
          agentType={agentType}
        />

        {agentType === 'bedrock' ? (
          <BedrockParamsDialog
            open={showParamsEditor}
            onClose={() => setShowParamsEditor(false)}
            params={params}
            onChange={setParamsWithTracking}
          />
        ) : (
          <ParamsEditor
            open={showParamsEditor}
            onClose={() => setShowParamsEditor(false)}
            params={params}
            onChange={setParamsWithTracking}
          />
        )}

        <BasicAuthConfig
          open={showBasicAuth}
          onClose={() => setShowBasicAuth(false)}
          config={basicAuth}
          onChange={setBasicAuthWithTracking}
        />

        {/* New Configuration Dialogs */}
        <HintsConfig
          open={showHintsConfig}
          onClose={() => setShowHintsConfig(false)}
          config={hintsConfig}
          onChange={setHintsConfigWithTracking}
        />

        <PronunciationsConfig
          open={showPronunciationsConfig}
          onClose={() => setShowPronunciationsConfig(false)}
          pronunciations={pronunciations}
          onChange={setPronunciationsWithTracking}
        />

        <GlobalDataConfig
          open={showGlobalDataConfig}
          onClose={() => setShowGlobalDataConfig(false)}
          globalData={globalData}
          onChange={setGlobalDataWithTracking}
        />

        <NativeFunctionsConfig
          open={showNativeFunctionsConfig}
          onClose={() => setShowNativeFunctionsConfig(false)}
          config={nativeFunctionsConfig}
          onChange={setNativeFunctionsConfigWithTracking}
          languages={[
            { code: 'en-US', name: 'English' },
            // TODO: Get languages from agent config
          ]}
        />

        <RecordingConfig
          open={showRecordingConfig}
          onClose={() => setShowRecordingConfig(false)}
          config={recordingConfig}
          onChange={setRecordingConfigWithTracking}
        />

        <PostPromptConfig
          open={showPostPromptConfig}
          onClose={() => setShowPostPromptConfig(false)}
          config={postPromptConfig}
          onChange={setPostPromptConfigWithTracking}
        />

        <ContextsStepsConfig
          open={showContextsStepsConfig}
          onClose={() => setShowContextsStepsConfig(false)}
          config={contextsStepsConfig}
          onChange={setContextsStepsConfigWithTracking}
          availableFunctions={skills.map(skill => skill.tool_name || skill.name)}
        />

        <Dialog
          open={showKnowledgeBaseSelector}
          onOpenChange={setShowKnowledgeBaseSelector}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Knowledge Bases</DialogTitle>
              <DialogDescription>
                Select knowledge bases and configure their search tools
              </DialogDescription>
            </DialogHeader>
            <KnowledgeBaseConfig
              attachments={knowledgeBaseAttachments}
              onAttachmentsChange={setKnowledgeBaseAttachmentsWithTracking}
            />
          </DialogContent>
        </Dialog>

        {/* LLM Parameters Dialog */}
        <Dialog
          open={showLLMParams}
          onOpenChange={setShowLLMParams}
        >
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>LLM Parameters</DialogTitle>
              <DialogDescription>
                Fine-tune language model behavior for prompts and post-prompts
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              <LLMParamsCard
                promptParams={promptLLMParams}
                postPromptParams={postPromptLLMParams}
                onPromptParamsChange={setPromptLLMParamsWithTracking}
                onPostPromptParamsChange={setPostPromptLLMParamsWithTracking}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialogs */}
        <ConfirmationDialog
          open={showDiscardDialog}
          onOpenChange={setShowDiscardDialog}
          title="Discard Changes"
          description="Are you sure you want to discard all unsaved changes? This action cannot be undone."
          actionLabel="Discard"
          variant="destructive"
          onConfirm={handleDiscard}
        />

        <ConfirmationDialog
          open={showNavigateDialog}
          onOpenChange={setShowNavigateDialog}
          title="Unsaved Changes"
          description="You have unsaved changes. Are you sure you want to leave without saving?"
          actionLabel="Leave Without Saving"
          cancelLabel="Stay"
          variant="destructive"
          onConfirm={() => {
            if (pendingNavigationPath) {
              navigate(pendingNavigationPath)
            }
          }}
        />

        {/* Save As Copy Dialog */}
        {agent && (
          <SaveAsCopyDialog
            open={showCopyDialog}
            onOpenChange={setShowCopyDialog}
            originalName={agent.name}
            onConfirm={async (name, description) => {
              await copyMutation.mutateAsync({ name, description })
            }}
          />
        )}
      </form>
    </MainLayout>
  )
}