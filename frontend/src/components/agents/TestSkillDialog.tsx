import { useState, useEffect } from 'react'
import { Loader2, Play, Copy, AlertCircle, CheckCircle, Terminal } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/components/ui/use-toast'
import { api } from '@/lib/api'

interface TestSkillDialogProps {
  skillName: string
  skillParams: Record<string, any>
  onClose: () => void
}

interface SkillFunction {
  name: string
  description: string
  parameters?: {
    properties?: Record<string, any>
    required?: string[]
  }
  arguments?: Array<{
    name: string
    type: string
    description: string
    required: boolean
    enum?: string[]
    default?: any
  }>
}

interface TestResult {
  success: boolean
  result?: {
    action: string
    response: any
    metadata?: Record<string, any>
  }
  error?: string
  execution_time: number
  logs: string[]
}

export function TestSkillDialog({ skillName, skillParams, onClose }: TestSkillDialogProps) {
  const [functions, setFunctions] = useState<SkillFunction[]>([])
  const [selectedFunction, setSelectedFunction] = useState<string>('')
  const [testArgs, setTestArgs] = useState<Record<string, any>>({})
  const [isLoadingFunctions, setIsLoadingFunctions] = useState(true)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [activeTab, setActiveTab] = useState('configure')

  // Load available functions
  useEffect(() => {
    loadFunctions()
  }, [skillName])

  const loadFunctions = async () => {
    try {
      setIsLoadingFunctions(true)
      console.log('Loading functions with skillParams:', skillParams)
      const response = await api.post(`/api/skills/test/functions/${skillName}`, skillParams)
      setFunctions(response.data.functions || [])
      
      // Select first function by default
      if (response.data.functions?.length > 0) {
        setSelectedFunction(response.data.functions[0].name)
        initializeArgs(response.data.functions[0])
      }
    } catch (error) {
      console.error('Failed to load functions:', error)
      toast({
        title: 'Failed to load skill functions',
        description: 'Please try again',
        variant: 'destructive'
      })
    } finally {
      setIsLoadingFunctions(false)
    }
  }

  const initializeArgs = (func: SkillFunction) => {
    const args: Record<string, any> = {}
    
    // Initialize with defaults or empty values
    if (func.arguments) {
      func.arguments.forEach(arg => {
        if (arg.default !== undefined) {
          args[arg.name] = arg.default
        } else if (arg.type === 'boolean') {
          args[arg.name] = false
        } else if (arg.type === 'number' || arg.type === 'integer') {
          args[arg.name] = 0
        } else if (arg.type === 'array') {
          args[arg.name] = []
        } else if (arg.type === 'object') {
          args[arg.name] = {}
        } else {
          args[arg.name] = ''
        }
      })
    }
    
    setTestArgs(args)
  }

  const handleFunctionChange = (funcName: string) => {
    setSelectedFunction(funcName)
    const func = functions.find(f => f.name === funcName)
    if (func) {
      initializeArgs(func)
    }
    setTestResult(null)
  }

  const handleArgChange = (argName: string, value: any, type: string) => {
    setTestArgs(prev => ({
      ...prev,
      [argName]: type === 'number' || type === 'integer' ? Number(value) : value
    }))
  }

  const handleTest = async () => {
    if (!selectedFunction) return

    setIsTesting(true)
    setTestResult(null)
    setActiveTab('result')

    try {
      console.log('Testing with params:', {
        skill_name: skillName,
        skill_params: skillParams,
        function_name: selectedFunction,
        test_args: testArgs
      })
      const response = await api.post('/api/skills/test/', {
        skill_name: skillName,
        skill_params: skillParams,
        function_name: selectedFunction,
        test_args: testArgs
      })

      setTestResult(response.data)
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.response?.data?.detail || 'Test failed',
        execution_time: 0,
        logs: []
      })
    } finally {
      setIsTesting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied to clipboard',
      duration: 2000
    })
  }

  const renderArgInput = (arg: NonNullable<SkillFunction['arguments']>[0]) => {
    if (!arg) return null

    const value = testArgs[arg.name] ?? ''

    if (arg.enum) {
      return (
        <Select value={value} onValueChange={(v) => handleArgChange(arg.name, v, arg.type)}>
          <SelectTrigger>
            <SelectValue placeholder={`Select ${arg.name}`} />
          </SelectTrigger>
          <SelectContent>
            {arg.enum.map((option: string) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    switch (arg.type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={arg.name}
              checked={value}
              onChange={(e) => handleArgChange(arg.name, e.target.checked, arg.type)}
              className="h-4 w-4"
            />
            <Label htmlFor={arg.name} className="text-sm font-normal">
              {arg.description || arg.name}
            </Label>
          </div>
        )

      case 'number':
      case 'integer':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleArgChange(arg.name, e.target.value, arg.type)}
            placeholder={arg.description}
          />
        )

      case 'array':
      case 'object':
        return (
          <Textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                handleArgChange(arg.name, parsed, arg.type)
              } catch {
                // Keep as string if invalid JSON
                handleArgChange(arg.name, e.target.value, 'string')
              }
            }}
            placeholder={`Enter JSON ${arg.type}`}
            rows={3}
            className="font-mono text-sm"
          />
        )

      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleArgChange(arg.name, e.target.value, arg.type)}
            placeholder={arg.description}
          />
        )
    }
  }

  const selectedFunc = functions.find(f => f.name === selectedFunction)

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[95vw] md:w-auto h-[90vh] md:h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Test {skillName} Skill</DialogTitle>
          <DialogDescription>
            Test skill functions with your current configuration
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="mx-6 mt-4 grid w-auto grid-cols-2 self-start">
            <TabsTrigger value="configure">Configure Test</TabsTrigger>
            <TabsTrigger value="result" disabled={!testResult}>
              Result {testResult && (testResult.success ? '✓' : '✗')}
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden px-6">
            <TabsContent value="configure" className="h-full mt-4">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6 pb-4">
                  {isLoadingFunctions ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : functions.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No testable functions found for this skill.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      {/* Function Selection */}
                      <div className="space-y-2">
                        <Label>Function to Test</Label>
                        <Select value={selectedFunction} onValueChange={handleFunctionChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a function" />
                          </SelectTrigger>
                          <SelectContent>
                            {functions.map(func => (
                              <SelectItem key={func.name} value={func.name}>
                                <div>
                                  <div className="font-medium">{func.name}</div>
                                  {func.description && (
                                    <div className="text-xs text-muted-foreground">
                                      {func.description}
                                    </div>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Function Arguments */}
                      {selectedFunc && selectedFunc.arguments && selectedFunc.arguments.length > 0 && (
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-3">Function Arguments</h4>
                            <div className="space-y-4">
                              {selectedFunc.arguments.map(arg => (
                                <div key={arg.name} className="space-y-2">
                                  <Label>
                                    {arg.name}
                                    {arg.required && <span className="text-destructive ml-1">*</span>}
                                    <span className="text-xs text-muted-foreground ml-2">
                                      ({arg.type})
                                    </span>
                                  </Label>
                                  {renderArgInput(arg)}
                                  {arg.description && (
                                    <p className="text-xs text-muted-foreground">
                                      {arg.description}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Current Arguments Preview */}
                      <div className="space-y-2">
                        <Label>Test Arguments (JSON)</Label>
                        <div className="relative">
                          <pre className="p-3 bg-muted rounded-lg text-sm font-mono overflow-x-auto">
                            {JSON.stringify(testArgs, null, 2)}
                          </pre>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="absolute top-1 right-1 h-8 w-8"
                            onClick={() => copyToClipboard(JSON.stringify(testArgs, null, 2))}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="result" className="h-full mt-4">
              <ScrollArea className="h-full pr-4">
                {testResult && (
                  <div className="space-y-4 pb-4">
                    {/* Status */}
                    <Alert variant={testResult.success ? 'default' : 'destructive'}>
                      {testResult.success ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <AlertDescription>
                        {testResult.success ? 'Test completed successfully' : 'Test failed'}
                        {' • '}
                        Execution time: {testResult.execution_time.toFixed(3)}s
                      </AlertDescription>
                    </Alert>

                    {/* Error Message */}
                    {testResult.error && (
                      <div className="space-y-2">
                        <Label>Error</Label>
                        <Alert variant="destructive">
                          <AlertDescription className="font-mono text-sm">
                            {testResult.error}
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}

                    {/* Result */}
                    {testResult.result && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Result</Label>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(
                                testResult.result && typeof testResult.result.response === 'string' 
                                  ? testResult.result.response 
                                  : JSON.stringify(testResult.result, null, 2)
                              )}
                              className="text-xs"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy Response
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(JSON.stringify(testResult.result, null, 2))}
                              className="text-xs"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy JSON
                            </Button>
                          </div>
                        </div>
                        
                        {/* Show SWAIG response in a more readable format */}
                        {testResult.result.response && (
                          <div className="space-y-2">
                            <div className="p-3 bg-muted rounded-lg">
                              <p className="text-sm font-medium mb-1">Response:</p>
                              <div className="text-sm whitespace-pre-wrap break-words max-h-[300px] overflow-auto">
                                {typeof testResult.result.response === 'string' 
                                  ? testResult.result.response 
                                  : JSON.stringify(testResult.result.response, null, 2)}
                              </div>
                            </div>
                            
                            {testResult.result.action && testResult.result.action !== 'return' && (
                              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded">
                                <p className="text-xs font-medium">Action: {testResult.result.action}</p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Full JSON collapsible */}
                        <details className="group">
                          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                            View full JSON response
                          </summary>
                          <div className="mt-2 relative">
                            <pre className="p-3 bg-muted rounded-lg text-xs font-mono overflow-auto max-h-[300px] whitespace-pre-wrap break-words">
                              {JSON.stringify(testResult.result, null, 2)}
                            </pre>
                          </div>
                        </details>
                      </div>
                    )}

                    {/* Execution Logs */}
                    {testResult.logs && testResult.logs.length > 0 && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Terminal className="h-4 w-4" />
                          Execution Logs
                        </Label>
                        <div className="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono">
                          {testResult.logs.map((log, i) => (
                            <div key={i} className="leading-relaxed">
                              {log}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-between items-center gap-2 p-6 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedFunc && (
              <span>Testing: {selectedFunc.name}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button 
              onClick={handleTest} 
              disabled={!selectedFunction || isTesting || functions.length === 0}
            >
              {isTesting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Test
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}