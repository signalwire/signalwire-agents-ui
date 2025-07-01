import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { getErrorMessage } from '@/api/client'
import { ThemeToggle } from '@/components/theme-toggle'
import { useTheme } from '@/components/theme-provider'

interface LoginForm {
  token: string
  remember_me: boolean
}

export function LoginPage() {
  const { login } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    defaultValues: {
      remember_me: true
    }
  })
  const { theme } = useTheme()
  const rememberMe = watch('remember_me')

  const onSubmit = async (data: LoginForm) => {
    try {
      setError(null)
      await login(data)
    } catch (err: any) {
      // Provide more specific error messages
      if (err.response?.status === 401) {
        setError('Invalid access token. Please check your token and try again.')
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.')
      } else if (!navigator.onLine) {
        setError('No internet connection. Please check your network.')
      } else {
        setError(getErrorMessage(err))
      }
    }
  }

  // Determine which logo to use based on theme
  const logoSrc = theme === 'dark' || 
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) 
    ? '/sw-white.svg' 
    : '/sw-black.svg'

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <img 
              src={logoSrc} 
              alt="SignalWire" 
              className="h-12 w-auto"
            />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl text-center">Agent Builder</CardTitle>
            <CardDescription className="text-center">
              Enter your access token to continue
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter your access token"
                {...register('token', { required: 'Token is required' })}
                disabled={isSubmitting}
              />
              {errors.token && (
                <p className="text-sm text-destructive">{errors.token.message}</p>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="remember" 
                checked={rememberMe}
                onCheckedChange={(checked: boolean) => setValue('remember_me', checked)}
              />
              <Label 
                htmlFor="remember" 
                className="text-sm font-normal cursor-pointer"
              >
                Remember me for 30 days
              </Label>
            </div>
            
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}