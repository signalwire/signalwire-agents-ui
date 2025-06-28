#!/usr/bin/env python3
"""
Utility module for extracting skill parameter definitions programmatically.

This module provides a clean API for extracting parameter information
from SignalWire skill files, which can be used by other parts of the application.
"""

import ast
import re
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path


class SkillParameterExtractor:
    """Extract parameter definitions from SignalWire skill files."""
    
    @staticmethod
    def extract_from_file(file_path: str) -> Dict[str, Any]:
        """
        Extract parameter definitions from a skill file.
        
        Args:
            file_path: Path to the skill.py file
            
        Returns:
            Dictionary containing:
            - skill_name: Name of the skill
            - skill_description: Description of the skill
            - parameters: Dict of parameter definitions
            - required_params: List of required parameter names
            - optional_params: Dict of optional parameters with defaults
        """
        try:
            with open(file_path, 'r') as f:
                content = f.read()
                
            tree = ast.parse(content)
            
            # Find the skill class
            skill_class = None
            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef):
                    for base in node.bases:
                        if isinstance(base, ast.Name) and base.id == 'SkillBase':
                            skill_class = node
                            break
                            
            if not skill_class:
                return {'error': 'No SkillBase class found'}
                
            # Extract class attributes
            skill_info = {
                'skill_name': None,
                'skill_description': None,
                'parameters': {},
                'required_params': [],
                'optional_params': {}
            }
            
            # Get SKILL_NAME and SKILL_DESCRIPTION
            for node in skill_class.body:
                if isinstance(node, ast.Assign):
                    for target in node.targets:
                        if isinstance(target, ast.Name):
                            if target.id == 'SKILL_NAME' and isinstance(node.value, ast.Constant):
                                skill_info['skill_name'] = node.value.value
                            elif target.id == 'SKILL_DESCRIPTION' and isinstance(node.value, ast.Constant):
                                skill_info['skill_description'] = node.value.value
                                
            # Extract parameters from setup method
            setup_method = None
            for node in skill_class.body:
                if isinstance(node, ast.FunctionDef) and node.name == 'setup':
                    setup_method = node
                    break
                    
            if setup_method:
                # Extract required_params list
                required_params = set()
                for node in ast.walk(setup_method):
                    if isinstance(node, ast.Assign):
                        for target in node.targets:
                            if isinstance(target, ast.Name) and target.id == 'required_params':
                                if isinstance(node.value, ast.List):
                                    for elem in node.value.elts:
                                        if isinstance(elem, ast.Constant):
                                            required_params.add(elem.value)
                                            
                # Extract parameter usage
                for node in ast.walk(setup_method):
                    # Handle self.params.get() calls
                    if isinstance(node, ast.Call):
                        if (isinstance(node.func, ast.Attribute) and
                            node.func.attr == 'get' and
                            isinstance(node.func.value, ast.Attribute) and
                            isinstance(node.func.value.value, ast.Name) and
                            node.func.value.value.id == 'self' and
                            node.func.value.attr == 'params'):
                            
                            if node.args and isinstance(node.args[0], ast.Constant):
                                param_name = node.args[0].value
                                param_info = {
                                    'name': param_name,
                                    'required': param_name in required_params
                                }
                                
                                # Get default value if provided
                                if len(node.args) > 1:
                                    if isinstance(node.args[1], ast.Constant):
                                        param_info['default'] = node.args[1].value
                                        param_info['type'] = type(node.args[1].value).__name__
                                    elif isinstance(node.args[1], ast.List):
                                        param_info['default'] = []
                                        param_info['type'] = 'list'
                                    elif isinstance(node.args[1], ast.Dict):
                                        param_info['default'] = {}
                                        param_info['type'] = 'dict'
                                        
                                skill_info['parameters'][param_name] = param_info
                                
                                if not param_info['required'] and 'default' in param_info:
                                    skill_info['optional_params'][param_name] = param_info['default']
                                    
                    # Handle self.params['key'] direct access
                    elif isinstance(node, ast.Subscript):
                        if (isinstance(node.value, ast.Attribute) and
                            isinstance(node.value.value, ast.Name) and
                            node.value.value.id == 'self' and
                            node.value.attr == 'params'):
                            
                            if isinstance(node.slice, ast.Constant):
                                param_name = node.slice.value
                                required_params.add(param_name)
                                skill_info['parameters'][param_name] = {
                                    'name': param_name,
                                    'required': True,
                                    'type': 'unknown'
                                }
                                
                skill_info['required_params'] = list(required_params)
                
            # Try to extract parameter descriptions from __init__ method
            init_method = None
            for node in skill_class.body:
                if isinstance(node, ast.FunctionDef) and node.name == '__init__':
                    init_method = node
                    break
                    
            if init_method and ast.get_docstring(init_method):
                docstring = ast.get_docstring(init_method)
                # Extract parameter descriptions from docstring
                for param_name in skill_info['parameters']:
                    param_pattern = rf'{param_name}:\s*(.+?)(?:\n|$)'
                    match = re.search(param_pattern, docstring, re.MULTILINE)
                    if match:
                        skill_info['parameters'][param_name]['description'] = match.group(1).strip()
                        
            return skill_info
            
        except Exception as e:
            return {'error': str(e)}
            
    @staticmethod
    def extract_from_skill_name(skill_name: str, skills_dir: str = None) -> Dict[str, Any]:
        """
        Extract parameters for a skill by its name.
        
        Args:
            skill_name: Name of the skill (e.g., 'web_search')
            skills_dir: Directory containing skill folders (optional)
            
        Returns:
            Parameter information for the skill
        """
        if skills_dir is None:
            # Try default locations
            possible_dirs = [
                "/home/devuser/src/signalwire-agent-builder/signalwire-agents/signalwire_agents/skills",
                "./signalwire_agents/skills",
                "../signalwire-agents/signalwire_agents/skills"
            ]
            
            for dir_path in possible_dirs:
                if Path(dir_path).exists():
                    skills_dir = dir_path
                    break
                    
        if not skills_dir:
            return {'error': 'Could not find skills directory'}
            
        skill_path = Path(skills_dir) / skill_name / 'skill.py'
        
        if not skill_path.exists():
            return {'error': f'Skill file not found: {skill_path}'}
            
        return SkillParameterExtractor.extract_from_file(str(skill_path))
        
    @staticmethod
    def get_parameter_schema(skill_name: str, skills_dir: str = None) -> Dict[str, Any]:
        """
        Get a JSON Schema-like representation of skill parameters.
        
        Args:
            skill_name: Name of the skill
            skills_dir: Directory containing skill folders (optional)
            
        Returns:
            JSON Schema-like dictionary
        """
        skill_info = SkillParameterExtractor.extract_from_skill_name(skill_name, skills_dir)
        
        if 'error' in skill_info:
            return skill_info
            
        schema = {
            'type': 'object',
            'properties': {},
            'required': skill_info.get('required_params', [])
        }
        
        for param_name, param_info in skill_info.get('parameters', {}).items():
            prop = {
                'type': param_info.get('type', 'string')
            }
            
            if 'description' in param_info:
                prop['description'] = param_info['description']
                
            if 'default' in param_info:
                prop['default'] = param_info['default']
                
            schema['properties'][param_name] = prop
            
        return schema


# Example usage
if __name__ == "__main__":
    # Test with a specific skill
    skill_name = "web_search"
    
    print(f"Extracting parameters for '{skill_name}' skill...")
    
    # Extract basic parameter info
    params = SkillParameterExtractor.extract_from_skill_name(skill_name)
    
    if 'error' not in params:
        print(f"\nSkill: {params['skill_name']}")
        print(f"Description: {params['skill_description']}")
        print(f"\nRequired Parameters: {params['required_params']}")
        print(f"\nOptional Parameters: {list(params['optional_params'].keys())}")
        
        print("\nDetailed Parameters:")
        for name, info in params['parameters'].items():
            print(f"  - {name}:")
            print(f"    Required: {info['required']}")
            if 'type' in info:
                print(f"    Type: {info['type']}")
            if 'default' in info:
                print(f"    Default: {info['default']}")
            if 'description' in info:
                print(f"    Description: {info['description']}")
                
        # Get JSON Schema
        print("\nJSON Schema:")
        schema = SkillParameterExtractor.get_parameter_schema(skill_name)
        import json
        print(json.dumps(schema, indent=2))
    else:
        print(f"Error: {params['error']}")