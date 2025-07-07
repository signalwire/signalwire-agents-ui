import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Save, Plus, Shield, Globe, Settings, Hash, Mic, Database, Zap, Circle, FileText, Network, Copy } from 'lucide-react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { agentsApi, AgentConfig } from '@/api/agents'
import { settingsApi } from '@/api/settings'
import { toast } from '@/components/ui/use-toast'
import { PromptBuilder } from '@/components/agents/PromptBuilder'
import { SkillsSelector } from '@/components/agents/SkillsSelector'
import { ParamsEditor } from '@/components/agents/ParamsEditor'
import { BasicAuthConfig } from '@/components/agents/BasicAuthConfig'
import { Badge } from '@/components/ui/badge'
import { LANGUAGE_PRESETS, ELEVENLABS_VOICE_MAP, getRimeVoices } from '@/lib/languagePresets'
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

interface AgentForm {
  name: string
  description: string
  languageConfigId: string
  customVoice?: string
  customEngine?: string
  customLanguage?: string
  customModel?: string
}

export function AgentBuilderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const copyId = searchParams.get('copy')
  const isEditMode = !!id

  const [promptSections, setPromptSections] = useState<AgentConfig['prompt_sections']>([])
  const [skills, setSkills] = useState<AgentConfig['skills']>([])
  const [params, setParams] = useState<AgentConfig['params']>({})
  const [basicAuth, setBasicAuth] = useState<{ user?: string; password?: string }>({})
  
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
  const [selectedPresets, setSelectedPresets] = useState<string[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [showNavigateDialog, setShowNavigateDialog] = useState(false)
  const [pendingNavigationPath, setPendingNavigationPath] = useState<string | null>(null)
  const [showCopyDialog, setShowCopyDialog] = useState(false)

  const { register, handleSubmit, formState: { errors, isDirty }, setValue, watch } = useForm<AgentForm>({
    defaultValues: {
      name: '',
      description: '',
      languageConfigId: 'custom',
      customVoice: '',
      customEngine: 'elevenlabs',
      customLanguage: 'en-US',
      customModel: '',
    }
  })

  const selectedConfigId = watch('languageConfigId')
  const isCustomConfig = selectedConfigId === 'custom'
  const hasChanges = hasUnsavedChanges || isDirty

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
      
      // Find matching config
      const allConfigs = getAllConfigs()
      let matchingConfig = null
      
      if (agent.config.engine === 'elevenlabs') {
        matchingConfig = allConfigs.find(config => {
          if (config.engine === 'elevenlabs') {
            const agentVoiceId = agent.config.voice?.startsWith('elevenlabs.') 
              ? agent.config.voice.substring('elevenlabs.'.length)
              : agent.config.voice
            const configVoiceId = config.voice?.startsWith('elevenlabs.') 
              ? config.voice.substring('elevenlabs.'.length)
              : config.voice
            
            return configVoiceId === agentVoiceId &&
                   config.code === agent.config.language &&
                   (!config.model || config.model === agent.config.model)
          }
          return false
        })
      } else {
        matchingConfig = allConfigs.find(config => 
          config.voice === agent.config.voice &&
          config.code === agent.config.language &&
          config.engine === agent.config.engine &&
          (!config.model || config.model === agent.config.model)
        )
      }
      
      if (matchingConfig) {
        setValue('languageConfigId', matchingConfig.id)
      } else {
        setValue('languageConfigId', 'custom')
        setValue('customLanguage', agent.config.language)
        setValue('customEngine', agent.config.engine || 'elevenlabs')
        setValue('customModel', agent.config.model || '')
        setValue('customVoice', agent.config.voice)
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
      setHasUnsavedChanges(false)
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
        setHasUnsavedChanges(true)
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
      setSelectedPresets(langConfigData.selectedPresets || [])
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
      
      // Try to find a matching preset/config
      const allConfigs = getAllConfigs()
      
      // Check if it's an ElevenLabs voice
      let matchingConfig = null
      
      if (agent.config.engine === 'elevenlabs') {
        // For ElevenLabs, presets store voice IDs, so compare directly
        matchingConfig = allConfigs.find(config => {
          if (config.engine === 'elevenlabs') {
            // Handle both with and without elevenlabs. prefix
            const agentVoiceId = agent.config.voice?.startsWith('elevenlabs.') 
              ? agent.config.voice.substring('elevenlabs.'.length)
              : agent.config.voice
            const configVoiceId = config.voice?.startsWith('elevenlabs.') 
              ? config.voice.substring('elevenlabs.'.length)
              : config.voice
            
            return configVoiceId === agentVoiceId &&
                   config.code === agent.config.language &&
                   (!config.model || config.model === agent.config.model)
          }
          return false
        })
      } else {
        // For other engines, direct comparison
        matchingConfig = allConfigs.find(config => 
          config.voice === agent.config.voice &&
          config.code === agent.config.language &&
          config.engine === agent.config.engine &&
          (!config.model || config.model === agent.config.model)
        )
      }
      
      if (matchingConfig) {
        setValue('languageConfigId', matchingConfig.id)
      } else {
        // Use custom configuration
        setValue('languageConfigId', 'custom')
        setValue('customLanguage', agent.config.language)
        setValue('customEngine', agent.config.engine || 'elevenlabs')
        setValue('customModel', agent.config.model || '')
        
        // Set custom voice value - store the raw ID
        setValue('customVoice', agent.config.voice)
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
      
      // Reset unsaved changes flag when agent is loaded
      setHasUnsavedChanges(false)
    }
  }, [agent, languageConfigs, setValue])


  // Get available presets based on selected presets
  const getAvailablePresets = () => {
    return LANGUAGE_PRESETS.filter(preset => selectedPresets.includes(preset.id))
  }

  // Get all available language configs (custom + presets)
  const getAllConfigs = () => {
    return [...languageConfigs, ...getAvailablePresets()]
  }

  const createMutation = useMutation({
    mutationFn: (data: AgentForm) => {
      let voice, language, engine, model;
      
      if (data.languageConfigId === 'custom') {
        // Use custom values
        engine = data.customEngine || 'elevenlabs'
        language = data.customLanguage || 'en-US'
        model = data.customModel
        
        // Use voice directly - it's already an ID
        voice = data.customVoice || ''
      } else {
        // Find the selected config
        const selectedConfig = [...languageConfigs, ...getAvailablePresets()]
          .find(c => c.id === data.languageConfigId)
        
        if (selectedConfig) {
          voice = selectedConfig.voice
          language = selectedConfig.code
          engine = selectedConfig.engine
          model = selectedConfig.model
        } else {
          // Fallback to defaults
          voice = 'adam'
          language = 'en-US'
          engine = 'elevenlabs'
        }
      }

      const config: AgentConfig = {
        voice,
        language,
        engine,
        model,
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
      setHasUnsavedChanges(false)
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
      const config: AgentConfig = {
        voice: agent.config.voice,
        language: agent.config.language,
        engine: agent.config.engine,
        model: agent.config.model,
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
      let voice, language, engine, model;
      
      if (data.languageConfigId === 'custom') {
        // Use custom values
        engine = data.customEngine || 'elevenlabs'
        language = data.customLanguage || 'en-US'
        model = data.customModel
        
        // Use voice directly - it's already an ID
        voice = data.customVoice || ''
      } else {
        // Find the selected config
        const selectedConfig = [...languageConfigs, ...getAvailablePresets()]
          .find(c => c.id === data.languageConfigId)
        
        if (selectedConfig) {
          voice = selectedConfig.voice
          language = selectedConfig.code
          engine = selectedConfig.engine
          model = selectedConfig.model
        } else {
          // Fallback to defaults
          voice = 'adam'
          language = 'en-US'
          engine = 'elevenlabs'
        }
      }

      const config: AgentConfig = {
        voice,
        language,
        engine,
        model,
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
      setHasUnsavedChanges(false)
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-4">
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
              <h1 className="text-lg sm:text-2xl font-bold text-heading-primary whitespace-nowrap">
                {isEditMode ? 'Edit Agent' : copyId ? 'Copy Agent' : 'Create New Agent'}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {copyId ? 'Creating a copy of an existing agent' : 'Configure your SignalWire AI agent'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            {hasChanges && isEditMode && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDiscardDialog(true)}
                className="text-sm"
              >
                Discard Changes
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
              {isEditMode ? 'Save Changes' : 'Create Agent'}
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

        {/* Voice Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-heading-secondary">
              <Globe className="h-5 w-5" />
              Voice & Language
            </CardTitle>
            <CardDescription>
              Configure how your agent sounds and what language it speaks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="languageConfig">Language Configuration</Label>
                <HelpTooltip content={helpContent.agent.language} />
              </div>
              <Select
                value={selectedConfigId}
                onValueChange={(value) => setValue('languageConfigId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a language configuration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Configuration</SelectItem>
                  {getAllConfigs().length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                        Available Presets
                      </div>
                      {getAllConfigs().map((config) => (
                        <SelectItem key={config.id} value={config.id}>
                          <div className="flex items-center gap-2">
                            <span>{config.displayName}</span>
                            {config.code === 'multi' && (
                              <Badge variant="outline" className="text-xs">Multi</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Show selected config details */}
            {!isCustomConfig && selectedConfigId !== 'custom' && (() => {
              const config = getAllConfigs().find(c => c.id === selectedConfigId)
              return config ? (
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Language:</span> {config.properName} ({config.code})
                    </div>
                    <div>
                      <span className="font-medium">Engine:</span> {config.engine}
                    </div>
                    <div>
                      <span className="font-medium">Voice:</span> {config.voice}
                    </div>
                    {config.model && (
                      <div>
                        <span className="font-medium">Model:</span> {config.model}
                      </div>
                    )}
                  </div>
                </div>
              ) : null
            })()}

            {/* Custom configuration fields */}
            {isCustomConfig && (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="customLanguage">Language Code</Label>
                    <Input
                      id="customLanguage"
                      {...register('customLanguage')}
                      placeholder="e.g., en-US or multi"
                    />
                    <p className="text-xs text-muted-foreground">
                      BCP-47 format or "multi" for multilingual
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customEngine">TTS Engine</Label>
                    <Select
                      value={watch('customEngine')}
                      onValueChange={(value) => setValue('customEngine', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rime">Rime</SelectItem>
                        <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="azure">Azure</SelectItem>
                        <SelectItem value="google">Google</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {watch('customEngine') === 'rime' && (
                    <div className="space-y-2">
                      <Label htmlFor="customModel">Model</Label>
                      <Select
                        value={watch('customModel') || ''}
                        onValueChange={(value) => setValue('customModel', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mist">Mist</SelectItem>
                          <SelectItem value="mistv2">Mist v2</SelectItem>
                          <SelectItem value="arcana">Arcana</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="customVoice">Voice</Label>
                    {(() => {
                      const engine = watch('customEngine');
                      const model = watch('customModel');
                      const language = watch('customLanguage');
                      
                      if (engine === 'elevenlabs') {
                        return (
                          <div className="space-y-2">
                            <Select
                              value={(() => {
                                const currentVoice = watch('customVoice');
                                if (!currentVoice) return '';
                                
                                // Check if current voice ID matches any preset
                                const matchingEntry = Object.entries(ELEVENLABS_VOICE_MAP).find(([, voice]) => 
                                  voice.id === currentVoice
                                );
                                
                                // If we found a match, return the key (e.g., "adam")
                                // Otherwise return "__custom__" to show the input box
                                return matchingEntry ? matchingEntry[0] : '__custom__';
                              })()}
                              onValueChange={(value) => {
                                if (value === '__custom__') {
                                  // Don't change the value, just show the input
                                  return;
                                }
                                // Set the voice ID from the selected key
                                const voice = ELEVENLABS_VOICE_MAP[value];
                                if (voice) {
                                  setValue('customVoice', voice.id);
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select voice" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(ELEVENLABS_VOICE_MAP).map(([key, voice]) => (
                                  <SelectItem key={key} value={key}>
                                    {voice.name}
                                  </SelectItem>
                                ))}
                                <SelectItem value="__custom__">Custom voice ID...</SelectItem>
                              </SelectContent>
                            </Select>
                            {(() => {
                              const currentVoice = watch('customVoice');
                              const isCustom = currentVoice && !Object.values(ELEVENLABS_VOICE_MAP).some(v => v.id === currentVoice);
                              return isCustom ? (
                                <Input
                                  {...register('customVoice')}
                                  placeholder="Enter custom voice ID"
                                />
                              ) : null;
                            })()}
                          </div>
                        );
                      } else if (engine === 'rime' && (model === 'mist' || model === 'mistv2')) {
                        // For mist and mistv2, show dropdown only
                        const voices = getRimeVoices(model, language || 'en-US');
                        return (
                          <Select
                            value={watch('customVoice') || ''}
                            onValueChange={(value) => setValue('customVoice', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select voice" />
                            </SelectTrigger>
                            <SelectContent>
                              {voices.map((voice) => (
                                <SelectItem key={voice} value={voice}>
                                  {voice.charAt(0).toUpperCase() + voice.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      } else if (engine === 'rime' && model === 'arcana') {
                        // For arcana, show dropdown + custom input
                        const voices = getRimeVoices(model, language || 'en-US');
                        const currentVoice = watch('customVoice');
                        const isPresetVoice = voices.includes(currentVoice || '');
                        
                        return (
                          <div className="space-y-2">
                            <Select
                              value={isPresetVoice ? currentVoice : '__custom__'}
                              onValueChange={(value) => {
                                if (value !== '__custom__') {
                                  setValue('customVoice', value);
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select voice" />
                              </SelectTrigger>
                              <SelectContent>
                                {voices.map((voice) => (
                                  <SelectItem key={voice} value={voice}>
                                    {voice.charAt(0).toUpperCase() + voice.slice(1)}
                                  </SelectItem>
                                ))}
                                <SelectItem value="__custom__">Custom voice name...</SelectItem>
                              </SelectContent>
                            </Select>
                            {(!currentVoice || !isPresetVoice) && (
                              <Input
                                {...register('customVoice')}
                                placeholder="Enter custom voice name (Arcana will guess personality)"
                              />
                            )}
                          </div>
                        );
                      } else {
                        // Default input for other engines
                        return (
                          <Input
                            id="customVoice"
                            {...register('customVoice')}
                            placeholder="e.g., nova"
                          />
                        );
                      }
                    })()}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* LLM Parameters */}
        <LLMParamsCard
          promptParams={promptLLMParams}
          postPromptParams={postPromptLLMParams}
          onPromptParamsChange={setPromptLLMParamsWithTracking}
          onPostPromptParamsChange={setPostPromptLLMParamsWithTracking}
        />

        {/* Agent Configuration Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Prompt Builder */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setShowPromptBuilder(true)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-heading-card">
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

          {/* Hints */}
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

          {/* Pronunciations */}
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

          {/* Contexts & Steps */}
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
        />

        <ParamsEditor
          open={showParamsEditor}
          onClose={() => setShowParamsEditor(false)}
          params={params}
          onChange={setParamsWithTracking}
        />

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