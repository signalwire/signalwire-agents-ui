"""Extract skill parameters from SignalWire SDK skills."""
import ast
import importlib
import inspect
import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


class SkillParameterExtractor:
    """Extract parameter information from skill classes."""
    
    @staticmethod
    def extract_from_skill_module(module_name: str) -> Dict[str, Any]:
        """Extract parameters from a skill module by analyzing its code."""
        try:
            # Try to import the module
            module = importlib.import_module(module_name)
            
            # Find the skill class
            skill_class = None
            for name, obj in inspect.getmembers(module):
                if (inspect.isclass(obj) and 
                    hasattr(obj, '__bases__') and
                    any('SkillBase' in str(base) for base in obj.__bases__)):
                    skill_class = obj
                    break
            
            if not skill_class:
                return {}
            
            # Get source code
            source = inspect.getsource(skill_class)
            tree = ast.parse(source)
            
            # Extract parameters
            params_info = {
                'required': [],
                'optional': {},
                'all_params': []
            }
            
            # Visit AST nodes
            visitor = ParameterVisitor()
            visitor.visit(tree)
            
            # Process found parameters
            for param_name, info in visitor.parameters.items():
                param_def = {
                    'name': param_name,
                    'type': info.get('type', 'string'),
                    'required': info.get('required', False),
                    'description': info.get('description', f'{param_name} parameter')
                }
                
                if 'default' in info:
                    param_def['default'] = info['default']
                
                params_info['all_params'].append(param_def)
                
                if info.get('required'):
                    params_info['required'].append(param_name)
                else:
                    params_info['optional'][param_name] = info.get('default')
            
            return params_info
            
        except Exception as e:
            logger.debug(f"Could not extract parameters from {module_name}: {e}")
            return {}
    
    @staticmethod
    def get_skill_parameters(skill_name: str) -> List[Dict[str, Any]]:
        """Get formatted parameter list for a skill."""
        # Try different module names
        module_names = [
            f'signalwire_agents.skills.{skill_name}_skill',
            f'signalwire_agents.skills.{skill_name}',
        ]
        
        for module_name in module_names:
            params_info = SkillParameterExtractor.extract_from_skill_module(module_name)
            if params_info and params_info.get('all_params'):
                return params_info['all_params']
        
        # Return default parameters based on skill name
        return get_default_skill_parameters(skill_name)


class ParameterVisitor(ast.NodeVisitor):
    """AST visitor to extract parameter usage."""
    
    def __init__(self):
        self.parameters = {}
        self.in_setup = False
        self.required_params_list = []
    
    def visit_FunctionDef(self, node):
        """Track when we're in the setup method."""
        if node.name == 'setup':
            self.in_setup = True
            self.generic_visit(node)
            self.in_setup = False
        elif node.name == '__init__':
            # Check constructor parameters
            self.generic_visit(node)
        else:
            self.generic_visit(node)
    
    def visit_Assign(self, node):
        """Look for required_params assignments."""
        if isinstance(node.targets[0], ast.Name) and node.targets[0].id == 'required_params':
            if isinstance(node.value, ast.List):
                for elt in node.value.elts:
                    if isinstance(elt, ast.Constant):
                        self.required_params_list.append(elt.value)
        self.generic_visit(node)
    
    def visit_Subscript(self, node):
        """Track self.params['key'] access."""
        if (isinstance(node.value, ast.Attribute) and 
            isinstance(node.value.value, ast.Name) and 
            node.value.value.id == 'self' and 
            node.value.attr == 'params'):
            
            if isinstance(node.slice, ast.Constant):
                param_name = node.slice.value
                if param_name not in self.parameters:
                    self.parameters[param_name] = {
                        'required': True,
                        'type': 'string'
                    }
        
        self.generic_visit(node)
    
    def visit_Call(self, node):
        """Track self.params.get() calls."""
        if (isinstance(node.func, ast.Attribute) and 
            node.func.attr == 'get' and
            isinstance(node.func.value, ast.Attribute) and
            node.func.value.attr == 'params'):
            
            if node.args and isinstance(node.args[0], ast.Constant):
                param_name = node.args[0].value
                default = None
                param_type = 'string'
                
                # Get default value
                if len(node.args) > 1:
                    if isinstance(node.args[1], ast.Constant):
                        default = node.args[1].value
                        # Infer type from default
                        if isinstance(default, bool):
                            param_type = 'boolean'
                        elif isinstance(default, int):
                            param_type = 'number'
                        elif isinstance(default, float):
                            param_type = 'number'
                
                if param_name not in self.parameters:
                    self.parameters[param_name] = {
                        'required': param_name in self.required_params_list,
                        'type': param_type
                    }
                    if default is not None:
                        self.parameters[param_name]['default'] = default
        
        self.generic_visit(node)


def get_default_skill_parameters(skill_name: str) -> List[Dict[str, Any]]:
    """Get default parameters for known skills."""
    defaults = {
        'web_search': [
            {'name': 'api_key', 'type': 'string', 'required': True, 
             'description': 'Google API Key (or set GOOGLE_API_KEY env var)'},
            {'name': 'search_engine_id', 'type': 'string', 'required': True,
             'description': 'Google Search Engine ID (or set GOOGLE_SEARCH_ENGINE_ID env var)'},
            {'name': 'num_results', 'type': 'number', 'default': 1,
             'description': 'Number of results to return'},
            {'name': 'delay', 'type': 'number', 'default': 0.5,
             'description': 'Delay between API calls'},
            {'name': 'tool_name', 'type': 'string', 'default': 'search_web',
             'description': 'Custom tool name'},
            {'name': 'no_results_message', 'type': 'string', 
             'default': 'No search results found for the query.',
             'description': 'Message when no results found'}
        ],
        'weather_api': [
            {'name': 'api_key', 'type': 'string', 'required': False,
             'description': 'OpenWeatherMap API Key (or set OPENWEATHERMAP_API_KEY env var)'},
            {'name': 'tool_name', 'type': 'string', 'default': 'get_weather',
             'description': 'Custom tool name'}
        ],
        'datasphere': [
            {'name': 'base_url', 'type': 'string', 'required': True,
             'description': 'DataSphere base URL'},
            {'name': 'token', 'type': 'string', 'required': True,
             'description': 'DataSphere access token'},
            {'name': 'collection_id', 'type': 'string', 'required': True,
             'description': 'DataSphere collection ID'},
            {'name': 'top_k', 'type': 'number', 'default': 5,
             'description': 'Number of results to return'},
            {'name': 'tool_name', 'type': 'string', 'default': 'search_documents',
             'description': 'Custom tool name'}
        ],
        'wikipedia_search': [
            {'name': 'num_results', 'type': 'number', 'default': 1,
             'description': 'Number of search results'},
            {'name': 'sentences', 'type': 'number', 'default': 3,
             'description': 'Number of sentences per result'},
            {'name': 'tool_name', 'type': 'string', 'default': 'search_wikipedia',
             'description': 'Custom tool name'}
        ],
        'spider': [
            {'name': 'api_key', 'type': 'string', 'required': False,
             'description': 'Spider API Key (or set SPIDER_API_KEY env var)'},
            {'name': 'tool_name', 'type': 'string', 'default': 'scrape_url',
             'description': 'Custom tool name'}
        ],
        'api_ninjas_trivia': [
            {'name': 'api_key', 'type': 'string', 'required': False,
             'description': 'API Ninjas Key (or set API_NINJAS_KEY env var)'},
            {'name': 'tool_name', 'type': 'string', 'default': 'get_trivia',
             'description': 'Custom tool name'}
        ],
        'mcp_gateway': [
            {'name': 'server_command', 'type': 'string', 'required': True,
             'description': 'MCP server command to execute'},
            {'name': 'server_args', 'type': 'string', 'default': '',
             'description': 'Arguments for the MCP server'},
            {'name': 'tool_name', 'type': 'string', 'default': 'call_mcp_tool',
             'description': 'Custom tool name'}
        ],
        'play_background_file': [
            {'name': 'base_url', 'type': 'string', 'required': True,
             'description': 'Base URL for audio files'},
            {'name': 'files', 'type': 'object', 'default': {},
             'description': 'Mapping of file names to paths'}
        ]
    }
    
    return defaults.get(skill_name, [])