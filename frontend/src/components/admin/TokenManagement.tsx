import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Copy, Trash2, RefreshCw, Calendar, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/use-toast'
import { tokensApi } from '@/api/tokens'
import { formatDistanceToNow } from 'date-fns'

interface Token {
  id: string
  name: string
  token: string
  created_at: string
  expires_at: string
  last_used_at?: string
  is_active: boolean
}

export function TokenManagement() {
  const queryClient = useQueryClient()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newTokenName, setNewTokenName] = useState('')
  const [newTokenExpiry, setNewTokenExpiry] = useState(30)

  const { data: tokens, isLoading } = useQuery({
    queryKey: ['tokens'],
    queryFn: tokensApi.list,
  })

  const createMutation = useMutation({
    mutationFn: tokensApi.create,
    onSuccess: (data) => {
      toast({ 
        title: 'Token created successfully',
        description: 'Make sure to copy the token now - it won\'t be shown again!'
      })
      queryClient.invalidateQueries({ queryKey: ['tokens'] })
      setShowCreateDialog(false)
      setNewTokenName('')
      
      // Copy token to clipboard automatically
      copyToClipboard(data.token)
    },
    onError: () => {
      toast({
        title: 'Failed to create token',
        variant: 'destructive',
      })
    },
  })

  const revokeMutation = useMutation({
    mutationFn: tokensApi.revoke,
    onSuccess: () => {
      toast({ title: 'Token revoked successfully' })
      queryClient.invalidateQueries({ queryKey: ['tokens'] })
    },
    onError: () => {
      toast({
        title: 'Failed to revoke token',
        variant: 'destructive',
      })
    },
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Token copied to clipboard' })
  }

  const handleCreate = () => {
    if (newTokenName) {
      createMutation.mutate({
        name: newTokenName,
        expiry_days: newTokenExpiry,
      })
    }
  }

  const handleRevoke = (tokenId: string, tokenName: string) => {
    if (confirm(`Are you sure you want to revoke the token "${tokenName}"?`)) {
      revokeMutation.mutate(tokenId)
    }
  }

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          JWT tokens are used by the Universal SWAIG Handler to authenticate skill execution requests.
          Keep these tokens secure and revoke them if compromised.
        </AlertDescription>
      </Alert>

      {/* Token List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-heading-secondary">API Tokens</CardTitle>
              <CardDescription>
                Manage JWT tokens for skill authentication
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Token
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tokens && tokens.length > 0 ? (
            <div className="space-y-4">
              {tokens.map((token: Token) => {
                const expired = isExpired(token.expires_at)
                return (
                  <div
                    key={token.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{token.name}</span>
                        {expired ? (
                          <Badge variant="destructive">Expired</Badge>
                        ) : !token.is_active ? (
                          <Badge variant="secondary">Revoked</Badge>
                        ) : (
                          <Badge variant="default">Active</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center gap-4">
                          <span>Created {formatDistanceToNow(new Date(token.created_at))} ago</span>
                          {token.last_used_at && (
                            <span>Last used {formatDistanceToNow(new Date(token.last_used_at))} ago</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Expires {expired ? 'expired' : 'in'} {formatDistanceToNow(new Date(token.expires_at))}
                            {expired ? ' ago' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {token.is_active && !expired && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(token.token)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                      {token.is_active && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => handleRevoke(token.id, token.name)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No tokens created yet
              </p>
              <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Token
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Token Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Token</DialogTitle>
            <DialogDescription>
              Create a new JWT token for skill authentication
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="token-name">Token Name</Label>
              <Input
                id="token-name"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                placeholder="e.g., Production Skills Token"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token-expiry">Expiry (days)</Label>
              <Input
                id="token-expiry"
                type="number"
                value={newTokenExpiry}
                onChange={(e) => setNewTokenExpiry(parseInt(e.target.value))}
                min={1}
                max={365}
              />
              <p className="text-sm text-muted-foreground">
                Token will expire in {newTokenExpiry} days
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={!newTokenName || createMutation.isPending}
            >
              Create Token
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}