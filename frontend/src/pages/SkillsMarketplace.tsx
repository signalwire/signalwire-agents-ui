import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, Settings, Upload, Download, Trash2, Eye, EyeOff, Search, ExternalLink, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/components/ui/use-toast'
import { api } from '@/lib/api'
import { Switch } from '@/components/ui/switch'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { helpContent } from '@/lib/helpContent'

interface SkillInfo {
  name: string
  display_name: string
  description: string
  version: string
  author?: string
  category?: string
  required_packages?: string[]
  required_env_vars?: string[]
  example_params?: Record<string, any>
  installed: boolean
  enabled: boolean
  marketplace?: {
    featured?: boolean
    downloads?: number
    rating?: number
    verified?: boolean
  }
}

interface SkillCategory {
  id: string
  name: string
  icon: string
  count: number
}

export function SkillsMarketplacePage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showInstallDialog, setShowInstallDialog] = useState(false)
  const [selectedSkill, setSelectedSkill] = useState<SkillInfo | null>(null)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [expandedSkills, setExpandedSkills] = useState<Set<string>>(new Set())
  
  // Fetch available skills
  const { data: skills = [], isLoading, refetch } = useQuery({
    queryKey: ['skills-marketplace'],
    queryFn: async () => {
      const response = await api.get<SkillInfo[]>('/api/admin/skills/marketplace')
      return response.data
    }
  })

  // Fetch skill categories
  const { data: categories = [] } = useQuery({
    queryKey: ['skill-categories'],
    queryFn: async () => {
      const response = await api.get<SkillCategory[]>('/api/admin/skills/categories')
      return response.data
    }
  })

  // Install skill mutation
  const installMutation = useMutation({
    mutationFn: async (skillName: string) => {
      await api.post(`/api/admin/skills/${skillName}/install`)
    },
    onSuccess: () => {
      toast({ title: 'Skill installed successfully' })
      queryClient.invalidateQueries({ queryKey: ['skills-marketplace'] })
      setShowInstallDialog(false)
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to install skill',
        description: error.response?.data?.detail || 'Please try again',
        variant: 'destructive'
      })
    }
  })

  // Toggle skill enabled/disabled
  const toggleSkillMutation = useMutation({
    mutationFn: async ({ skillName, enabled }: { skillName: string, enabled: boolean }) => {
      await api.patch(`/api/admin/skills/${skillName}`, { enabled })
    },
    onSuccess: () => {
      toast({ title: 'Skill status updated' })
      queryClient.invalidateQueries({ queryKey: ['skills-marketplace'] })
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update skill',
        description: error.response?.data?.detail || 'Please try again',
        variant: 'destructive'
      })
    }
  })

  // Upload custom skill
  const uploadSkillMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      await api.post('/api/admin/skills/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    },
    onSuccess: () => {
      toast({ title: 'Skill uploaded successfully' })
      queryClient.invalidateQueries({ queryKey: ['skills-marketplace'] })
      setShowUploadDialog(false)
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to upload skill',
        description: error.response?.data?.detail || 'Please try again',
        variant: 'destructive'
      })
    }
  })

  const toggleSkillExpansion = (skillName: string) => {
    const newExpanded = new Set(expandedSkills)
    if (newExpanded.has(skillName)) {
      newExpanded.delete(skillName)
    } else {
      newExpanded.add(skillName)
    }
    setExpandedSkills(newExpanded)
  }

  // Filter skills
  const filteredSkills = skills.filter(skill => {
    const matchesSearch = skill.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         skill.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || skill.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const installedSkills = filteredSkills.filter(s => s.installed)
  const availableSkills = filteredSkills.filter(s => !s.installed)

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-heading-primary">Skills Marketplace</h1>
              <p className="text-muted-foreground">
                Browse and manage skills for your AI agents
              </p>
            </div>
            <HelpTooltip content={helpContent.marketplace.overview} />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowUploadDialog(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Custom Skill
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search skills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name} ({category.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Skills Tabs */}
        <Tabs defaultValue="installed">
          <TabsList>
            <TabsTrigger value="installed">
              Installed ({installedSkills.length})
            </TabsTrigger>
            <TabsTrigger value="available">
              Available ({availableSkills.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="installed" className="space-y-4 mt-4">
            {installedSkills.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No installed skills found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {installedSkills.map(skill => (
                  <Card key={skill.name}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{skill.display_name}</CardTitle>
                            <Badge variant="outline" className="text-xs">v{skill.version}</Badge>
                            {skill.marketplace?.verified && (
                              <Badge variant="default" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="mt-1">
                            {skill.description}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={skill.enabled}
                            onCheckedChange={(checked) => 
                              toggleSkillMutation.mutate({ skillName: skill.name, enabled: checked })
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleSkillExpansion(skill.name)}
                          >
                            {expandedSkills.has(skill.name) ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <Collapsible open={expandedSkills.has(skill.name)}>
                      <CollapsibleContent>
                        <CardContent className="space-y-4">
                          {/* Metadata */}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <Label className="text-muted-foreground">Category</Label>
                              <p className="font-medium">{skill.category || 'Uncategorized'}</p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground">Author</Label>
                              <p className="font-medium">{skill.author || 'Unknown'}</p>
                            </div>
                            {skill.marketplace?.downloads && (
                              <div>
                                <Label className="text-muted-foreground">Downloads</Label>
                                <p className="font-medium">{skill.marketplace.downloads.toLocaleString()}</p>
                              </div>
                            )}
                            {skill.marketplace?.rating && (
                              <div>
                                <Label className="text-muted-foreground">Rating</Label>
                                <p className="font-medium">⭐ {skill.marketplace.rating}/5</p>
                              </div>
                            )}
                          </div>

                          {/* Required Packages */}
                          {skill.required_packages && skill.required_packages.length > 0 && (
                            <div>
                              <Label className="text-sm">Required Packages</Label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {skill.required_packages.map(pkg => (
                                  <Badge key={pkg} variant="secondary" className="text-xs">
                                    {pkg}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Environment Variables */}
                          {skill.required_env_vars && skill.required_env_vars.length > 0 && (
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                <strong>Required Environment Variables:</strong>
                                <ul className="list-disc list-inside mt-1">
                                  {skill.required_env_vars.map(env => (
                                    <li key={env} className="text-sm">{env}</li>
                                  ))}
                                </ul>
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* Example Parameters */}
                          {skill.example_params && Object.keys(skill.example_params).length > 0 && (
                            <div>
                              <Label className="text-sm">Example Configuration</Label>
                              <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                                {JSON.stringify(skill.example_params, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex justify-end gap-2 pt-2 border-t">
                            <Button variant="outline" size="sm">
                              <Settings className="h-3 w-3 mr-1" />
                              Configure
                            </Button>
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Documentation
                            </Button>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-3 w-3 mr-1" />
                              Uninstall
                            </Button>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="available" className="space-y-4 mt-4">
            {availableSkills.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No available skills found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {availableSkills.map(skill => (
                  <Card key={skill.name} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{skill.display_name}</CardTitle>
                            <Badge variant="outline" className="text-xs">v{skill.version}</Badge>
                            {skill.marketplace?.verified && (
                              <Badge variant="default" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                            {skill.marketplace?.featured && (
                              <Badge variant="secondary" className="text-xs">
                                ⭐ Featured
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="mt-1">
                            {skill.description}
                          </CardDescription>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedSkill(skill)
                            setShowInstallDialog(true)
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Install
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {skill.category && (
                          <span>{skill.category}</span>
                        )}
                        {skill.marketplace?.downloads && (
                          <span>{skill.marketplace.downloads.toLocaleString()} downloads</span>
                        )}
                        {skill.marketplace?.rating && (
                          <span>⭐ {skill.marketplace.rating}/5</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Install Dialog */}
        <Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Install {selectedSkill?.display_name}</DialogTitle>
              <DialogDescription>
                Review the skill requirements before installation
              </DialogDescription>
            </DialogHeader>

            {selectedSkill && (
              <div className="space-y-4 mt-4">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedSkill.description}</p>
                </div>

                {selectedSkill.required_packages && selectedSkill.required_packages.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Required Python Packages</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedSkill.required_packages.map(pkg => (
                        <Badge key={pkg} variant="secondary">
                          {pkg}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      These packages will be installed automatically
                    </p>
                  </div>
                )}

                {selectedSkill.required_env_vars && selectedSkill.required_env_vars.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Required Environment Variables:</strong>
                      <p className="text-sm mt-1">
                        You'll need to set these environment variables for the skill to work:
                      </p>
                      <ul className="list-disc list-inside mt-2">
                        {selectedSkill.required_env_vars.map(env => (
                          <li key={env} className="text-sm font-mono">{env}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {selectedSkill.example_params && Object.keys(selectedSkill.example_params).length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Example Configuration</h4>
                    <pre className="p-3 bg-muted rounded text-sm overflow-x-auto">
                      {JSON.stringify(selectedSkill.example_params, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowInstallDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => installMutation.mutate(selectedSkill.name)}
                    disabled={installMutation.isPending}
                  >
                    {installMutation.isPending ? 'Installing...' : 'Install Skill'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Upload Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Custom Skill</DialogTitle>
              <DialogDescription>
                Upload a ZIP file containing your custom skill implementation
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              uploadSkillMutation.mutate(formData)
            }} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="skill-file">Skill Package (ZIP)</Label>
                <Input
                  id="skill-file"
                  name="file"
                  type="file"
                  accept=".zip"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  The ZIP file should contain a skill.py file and optional README.md
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Package Structure:</strong>
                  <pre className="mt-2 text-xs">
{`my_skill/
├── skill.py          # Required: SkillBase implementation
├── README.md         # Optional: Documentation
└── requirements.txt  # Optional: Dependencies`}
                  </pre>
                </AlertDescription>
              </Alert>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowUploadDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={uploadSkillMutation.isPending}>
                  {uploadSkillMutation.isPending ? 'Uploading...' : 'Upload Skill'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}