import { useState } from 'react'
import { Settings, Key, Shield, Database, Languages } from 'lucide-react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GlobalSettings } from '@/components/admin/GlobalSettings'
import { TokenManagement } from '@/components/admin/TokenManagement'
import { SecuritySettings } from '@/components/admin/SecuritySettings'
import { SystemInfo } from '@/components/admin/SystemInfo'
import { VoiceLanguageSettings } from '@/components/admin/VoiceLanguageSettings'

export function AdminPage() {
  const [activeTab, setActiveTab] = useState('settings')

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-heading-primary">Admin Panel</h1>
          <p className="text-muted-foreground">
            Manage system settings, tokens, and security configuration
          </p>
        </div>

        {/* Admin Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 lg:grid-cols-5 w-full">
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="voice-language" className="gap-2">
              <Languages className="h-4 w-4" />
              <span className="hidden sm:inline">Voice & Language</span>
            </TabsTrigger>
            <TabsTrigger value="tokens" className="gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">Tokens</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">System</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="mt-6">
            <GlobalSettings />
          </TabsContent>

          <TabsContent value="voice-language" className="mt-6">
            <VoiceLanguageSettings />
          </TabsContent>

          <TabsContent value="tokens" className="mt-6">
            <TokenManagement />
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <SecuritySettings />
          </TabsContent>

          <TabsContent value="system" className="mt-6">
            <SystemInfo />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}