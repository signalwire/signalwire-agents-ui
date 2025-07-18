import { X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { helpContent } from '@/lib/helpContent'

interface HelpModalProps {
  open: boolean
  onClose: () => void
}

export function HelpModal({ open, onClose }: HelpModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">Help & Documentation</DialogTitle>
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
        </DialogHeader>

        <Tabs defaultValue="getting-started" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
            <TabsTrigger value="agent-config">Agent Configuration</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Features</TabsTrigger>
            <TabsTrigger value="tips">Tips & Best Practices</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(80vh-180px)] mt-4">
            <TabsContent value="getting-started" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome to SignalWire Agent Builder</CardTitle>
                  <CardDescription>
                    Build powerful AI agents for voice interactions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Quick Start Guide</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm">
                      <li>Create a new agent by clicking "Create Agent"</li>
                      <li>Give your agent a name and description</li>
                      <li>Configure the voice and language settings</li>
                      <li>Build your agent's prompt using the Prompt Builder</li>
                      <li>Add skills to extend your agent's capabilities</li>
                      <li>Test your agent and iterate on the configuration</li>
                    </ol>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Key Concepts</h4>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="font-medium">Agents</dt>
                        <dd className="text-muted-foreground">AI-powered voice assistants that handle calls</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Prompts</dt>
                        <dd className="text-muted-foreground">Instructions that define your agent's behavior</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Skills</dt>
                        <dd className="text-muted-foreground">Modular capabilities like web search or calculations</dd>
                      </div>
                      <div>
                        <dt className="font-medium">SWML</dt>
                        <dd className="text-muted-foreground">SignalWire Markup Language - the configuration format</dd>
                      </div>
                    </dl>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="agent-config" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Agent Name & Description</h4>
                    <p className="text-sm text-muted-foreground">{helpContent.agent.name}</p>
                    <p className="text-sm text-muted-foreground mt-2">{helpContent.agent.description}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Voice Configuration</h4>
                    {helpContent.agent.voice}
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Language Settings</h4>
                    <p className="text-sm text-muted-foreground">{helpContent.agent.language}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Prompt Building</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{helpContent.prompt.sections}</p>
                  <div>
                    <h4 className="font-semibold mb-2">Section Guidelines</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li><strong>Title:</strong> {helpContent.prompt.title}</li>
                      <li><strong>Body:</strong> {helpContent.prompt.body}</li>
                      <li><strong>Bullets:</strong> {helpContent.prompt.bullets}</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>AI Parameters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="font-medium">End of Speech Timeout</dt>
                      <dd className="text-muted-foreground">{helpContent.params.endOfSpeechTimeout}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Attention Timeout</dt>
                      <dd className="text-muted-foreground">{helpContent.params.attentionTimeout}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Temperature</dt>
                      <dd className="text-muted-foreground">{helpContent.params.temperature}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="skills" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Skills Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{helpContent.skills.overview}</p>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Skill Categories</h4>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="font-medium">Utilities</dt>
                        <dd className="text-muted-foreground">{helpContent.marketplace.categories.utilities}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">External APIs</dt>
                        <dd className="text-muted-foreground">{helpContent.marketplace.categories['external-apis']}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Knowledge</dt>
                        <dd className="text-muted-foreground">{helpContent.marketplace.categories.knowledge}</dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Configuration</h4>
                    <p className="text-sm text-muted-foreground">{helpContent.skills.params}</p>
                    {helpContent.skills.apiKeys}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Custom Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  {helpContent.marketplace.customSkills}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Hints Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {helpContent.hints.simple}
                  <div className="mt-4">
                    {helpContent.hints.pattern}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contexts & Steps</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {helpContent.contexts.overview}
                  <dl className="space-y-2 text-sm mt-4">
                    <div>
                      <dt className="font-medium">Isolated Contexts</dt>
                      <dd className="text-muted-foreground">{helpContent.contexts.isolated}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Step Criteria</dt>
                      <dd className="text-muted-foreground">{helpContent.contexts.criteria}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Navigation Rules</dt>
                      <dd className="text-muted-foreground">
                        Control flow between steps and contexts using valid steps and contexts
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recording Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                  {helpContent.recording.overview}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tips" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Best Practices</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">General Tips</h4>
                    <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                      <li>{helpContent.tips.testing}</li>
                      <li>{helpContent.tips.security}</li>
                      <li>{helpContent.tips.performance}</li>
                      <li>{helpContent.tips.documentation}</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Prompt Writing</h4>
                    <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Keep instructions clear and specific</li>
                      <li>Use sections to organize different aspects</li>
                      <li>Include examples when possible</li>
                      <li>Test with various scenarios</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Performance Optimization</h4>
                    <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Use appropriate timeouts for your use case</li>
                      <li>Enable only necessary skills</li>
                      <li>Keep prompts concise but complete</li>
                      <li>Monitor and analyze call logs</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Troubleshooting</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Common Issues</h4>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="font-medium">Agent not responding correctly</dt>
                        <dd className="text-muted-foreground">Check your prompt sections and ensure they are clear</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Skills not working</dt>
                        <dd className="text-muted-foreground">Verify API keys and environment variables are set</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Poor voice quality</dt>
                        <dd className="text-muted-foreground">Try different voice engines or models</dd>
                      </div>
                    </dl>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}