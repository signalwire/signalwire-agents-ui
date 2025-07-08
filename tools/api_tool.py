#!/usr/bin/env python3
"""
Simple API testing tool for SignalWire Agent Builder
Handles authentication and provides easy methods for testing endpoints
"""

import os
import sys
import json
import requests
from typing import Optional, Dict, Any
from urllib.parse import urljoin
import urllib3

# Disable SSL warnings for self-signed certificates
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class AgentBuilderAPI:
    def __init__(self, base_url: str = None, token: str = None):
        self.base_url = base_url or os.getenv('API_BASE_URL', 'https://localhost:8430')
        self.auth_token = token or os.getenv('API_AUTH_TOKEN', 'admin-token-changeme')
        self.jwt_token = None
        self.session = requests.Session()
        self.session.verify = False  # For self-signed certs
        
    def login(self, token: str = None) -> bool:
        """Login and store JWT token"""
        token = token or self.auth_token
        try:
            response = self.session.post(
                urljoin(self.base_url, '/api/auth/login'),
                json={'token': token}
            )
            if response.status_code == 200:
                data = response.json()
                self.jwt_token = data['access_token']
                self.session.headers['Authorization'] = f'Bearer {self.jwt_token}'
                print(f"✅ Logged in successfully")
                # Export to environment for other tools
                os.environ['JWT_TOKEN'] = self.jwt_token
                return True
            else:
                print(f"❌ Login failed: {response.status_code}")
                print(response.text)
                return False
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False
    
    def get(self, endpoint: str, params: Dict[str, Any] = None) -> Optional[Dict]:
        """GET request helper"""
        try:
            response = self.session.get(
                urljoin(self.base_url, endpoint),
                params=params
            )
            return self._handle_response(response)
        except Exception as e:
            print(f"❌ GET error: {e}")
            return None
    
    def post(self, endpoint: str, data: Dict[str, Any] = None, files: Dict = None) -> Optional[Dict]:
        """POST request helper"""
        try:
            kwargs = {}
            if files:
                kwargs['files'] = files
                if data:
                    kwargs['data'] = data
            else:
                kwargs['json'] = data
                
            response = self.session.post(
                urljoin(self.base_url, endpoint),
                **kwargs
            )
            return self._handle_response(response)
        except Exception as e:
            print(f"❌ POST error: {e}")
            return None
    
    def put(self, endpoint: str, data: Dict[str, Any]) -> Optional[Dict]:
        """PUT request helper"""
        try:
            response = self.session.put(
                urljoin(self.base_url, endpoint),
                json=data
            )
            return self._handle_response(response)
        except Exception as e:
            print(f"❌ PUT error: {e}")
            return None
    
    def delete(self, endpoint: str) -> bool:
        """DELETE request helper"""
        try:
            response = self.session.delete(
                urljoin(self.base_url, endpoint)
            )
            return response.status_code in [200, 204]
        except Exception as e:
            print(f"❌ DELETE error: {e}")
            return False
    
    def _handle_response(self, response: requests.Response) -> Optional[Dict]:
        """Handle API response"""
        if response.status_code >= 200 and response.status_code < 300:
            try:
                return response.json()
            except:
                return {'status': 'success', 'code': response.status_code}
        else:
            print(f"❌ Request failed: {response.status_code}")
            try:
                print(json.dumps(response.json(), indent=2))
            except:
                print(response.text)
            return None
    
    # Convenience methods for common operations
    
    def list_agents(self) -> Optional[list]:
        """List all agents"""
        result = self.get('/api/agents')
        return result if result else []
    
    def get_agent(self, agent_id: str) -> Optional[Dict]:
        """Get specific agent"""
        return self.get(f'/api/agents/{agent_id}')
    
    def create_agent(self, name: str, config: Dict[str, Any] = None) -> Optional[Dict]:
        """Create new agent"""
        data = {
            'name': name,
            'config': config or {
                'voice': {'engine': 'elevenlabs', 'voice': 'rachel'},
                'prompt': {'sections': [{'title': 'Role', 'body': 'You are a helpful assistant'}]}
            }
        }
        return self.post('/api/agents', data)
    
    def list_media(self, file_type: str = None, search: str = None) -> Optional[Dict]:
        """List media files"""
        params = {}
        if file_type:
            params['file_type'] = file_type
        if search:
            params['search'] = search
        return self.get('/api/media', params)
    
    def list_knowledge_bases(self) -> Optional[list]:
        """List all knowledge bases"""
        result = self.get('/api/knowledge-bases')
        return result if result else []
    
    def get_call_summaries(self, agent_id: str = None, limit: int = 10) -> Optional[list]:
        """Get call summaries"""
        if agent_id:
            result = self.get(f'/api/agents/{agent_id}/summaries', {'limit': limit})
        else:
            result = self.get('/api/call-summaries', {'limit': limit})
        return result.get('summaries', []) if result else None
    
    def get_system_info(self) -> Optional[Dict]:
        """Get system information"""
        return self.get('/api/admin/system')
    
    def test_connection(self) -> bool:
        """Test API connection"""
        try:
            response = self.session.get(urljoin(self.base_url, '/api/health'))
            if response.status_code == 200:
                print(f"✅ Connected to {self.base_url}")
                return True
            else:
                print(f"❌ Connection failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Connection error: {e}")
            return False


def main():
    """Interactive CLI for API testing"""
    print("🚀 SignalWire Agent Builder API Tool")
    print("-" * 40)
    
    # Initialize API client
    api = AgentBuilderAPI()
    
    # Test connection
    if not api.test_connection():
        sys.exit(1)
    
    # Login
    if not api.login():
        sys.exit(1)
    
    # Interactive menu
    while True:
        print("\n📋 Available Commands:")
        print("1. List agents")
        print("2. Get agent details")
        print("3. Create test agent")
        print("4. List media files")
        print("5. List knowledge bases")
        print("6. Get call summaries")
        print("7. Get system info")
        print("8. Custom GET request")
        print("9. Custom POST request")
        print("0. Exit")
        
        choice = input("\nSelect command (0-9): ").strip()
        
        if choice == '0':
            break
        elif choice == '1':
            agents = api.list_agents()
            if agents:
                print(f"\n📦 Found {len(agents)} agents:")
                for agent in agents:
                    print(f"  - {agent['name']} (ID: {agent['id']})")
        
        elif choice == '2':
            agent_id = input("Enter agent ID: ").strip()
            agent = api.get_agent(agent_id)
            if agent:
                print(json.dumps(agent, indent=2))
        
        elif choice == '3':
            name = input("Enter agent name: ").strip()
            agent = api.create_agent(name)
            if agent:
                print(f"✅ Created agent: {agent['id']}")
        
        elif choice == '4':
            file_type = input("Filter by type (audio/video/all): ").strip()
            if file_type == 'all':
                file_type = None
            media = api.list_media(file_type)
            if media:
                files = media.get('files', [])
                print(f"\n📁 Found {len(files)} media files:")
                for file in files:
                    print(f"  - {file['original_filename']} ({file['file_type']}, {file['file_size']} bytes)")
        
        elif choice == '5':
            kbs = api.list_knowledge_bases()
            if kbs:
                print(f"\n📚 Found {len(kbs)} knowledge bases:")
                for kb in kbs:
                    print(f"  - {kb['name']} ({kb['document_count']} docs, {kb['total_chunks']} chunks)")
        
        elif choice == '6':
            agent_id = input("Filter by agent ID (or press Enter for all): ").strip()
            summaries = api.get_call_summaries(agent_id if agent_id else None)
            if summaries:
                print(f"\n📞 Found {len(summaries)} call summaries:")
                for summary in summaries[:5]:  # Show first 5
                    print(f"  - {summary['caller_id_name']} ({summary['caller_id_number']}) - {summary.get('total_minutes', 0):.1f} min")
        
        elif choice == '7':
            info = api.get_system_info()
            if info:
                print(json.dumps(info, indent=2))
        
        elif choice == '8':
            endpoint = input("Enter endpoint (e.g., /api/agents): ").strip()
            result = api.get(endpoint)
            if result:
                print(json.dumps(result, indent=2))
        
        elif choice == '9':
            endpoint = input("Enter endpoint (e.g., /api/agents): ").strip()
            data_str = input("Enter JSON data (or press Enter for empty): ").strip()
            data = json.loads(data_str) if data_str else {}
            result = api.post(endpoint, data)
            if result:
                print(json.dumps(result, indent=2))
        
        else:
            print("Invalid choice")
    
    print("\n👋 Goodbye!")


if __name__ == '__main__':
    # Allow running specific commands directly
    if len(sys.argv) > 1:
        api = AgentBuilderAPI()
        if api.test_connection() and api.login():
            cmd = sys.argv[1]
            if cmd == 'agents':
                agents = api.list_agents()
                print(json.dumps(agents, indent=2))
            elif cmd == 'media':
                media = api.list_media()
                print(json.dumps(media, indent=2))
            elif cmd == 'kb':
                kbs = api.list_knowledge_bases()
                print(json.dumps(kbs, indent=2))
            elif cmd == 'system':
                info = api.get_system_info()
                print(json.dumps(info, indent=2))
            else:
                print(f"Unknown command: {cmd}")
    else:
        main()