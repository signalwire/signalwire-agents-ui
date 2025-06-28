#!/usr/bin/env python3
"""
Extract comprehensive skill metadata including parameter descriptions and types.

This script provides a robust way to extract skill parameter definitions,
including descriptions from comments and docstrings.
"""

import ast
import re
import os
import json
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path


class SkillMetadataExtractor:
    """Extract comprehensive metadata from skill files."""
    
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.content = ""
        self.tree = None
        self.skill_class = None
        
    def load_file(self):
        """Load and parse the skill file."""
        with open(self.file_path, 'r') as f:
            self.content = f.read()
            
        try:
            self.tree = ast.parse(self.content)
        except SyntaxError as e:
            raise ValueError(f"Failed to parse {self.file_path}: {e}")
            
    def find_skill_class(self) -> Optional[ast.ClassDef]:
        """Find the class that inherits from SkillBase."""
        for node in ast.walk(self.tree):
            if isinstance(node, ast.ClassDef):
                for base in node.bases:
                    if isinstance(base, ast.Name) and base.id == 'SkillBase':
                        self.skill_class = node
                        return node
        return None
        
    def extract_class_attributes(self) -> Dict[str, Any]:
        """Extract class-level attributes like SKILL_NAME, SKILL_DESCRIPTION."""
        attributes = {}
        
        if not self.skill_class:
            return attributes
            
        for node in self.skill_class.body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        attr_name = target.id
                        
                        # Extract value based on type
                        if isinstance(node.value, ast.Constant):
                            attributes[attr_name] = node.value.value
                        elif isinstance(node.value, ast.List):
                            # Handle lists like REQUIRED_PACKAGES
                            values = []
                            for elem in node.value.elts:
                                if isinstance(elem, ast.Constant):
                                    values.append(elem.value)
                            attributes[attr_name] = values
                        elif isinstance(node.value, (ast.NameConstant)):
                            attributes[attr_name] = node.value.value
                            
        return attributes
        
    def extract_parameter_info(self) -> Dict[str, Any]:
        """Extract parameter usage and validation patterns."""
        params = {}
        required_params = set()
        optional_params = {}
        
        # Find setup method
        setup_method = None
        for node in self.skill_class.body:
            if isinstance(node, ast.FunctionDef) and node.name == 'setup':
                setup_method = node
                break
                
        if not setup_method:
            return {'parameters': params, 'required': list(required_params), 'optional': optional_params}
            
        # Extract required_params list from setup
        for node in ast.walk(setup_method):
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id == 'required_params':
                        if isinstance(node.value, ast.List):
                            for elem in node.value.elts:
                                if isinstance(elem, ast.Constant):
                                    required_params.add(elem.value)
                                    
        # Extract parameter accesses
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
                        
                        # Get default value if provided
                        default_value = None
                        if len(node.args) > 1:
                            if isinstance(node.args[1], ast.Constant):
                                default_value = node.args[1].value
                            elif isinstance(node.args[1], ast.List):
                                default_value = []
                            elif isinstance(node.args[1], ast.Dict):
                                default_value = {}
                                
                        if default_value is not None:
                            optional_params[param_name] = default_value
                        else:
                            # If no default and not in required_params, it might still be optional
                            if param_name not in required_params:
                                optional_params[param_name] = None
                                
            # Handle self.params['key'] direct access
            elif isinstance(node, ast.Subscript):
                if (isinstance(node.value, ast.Attribute) and
                    isinstance(node.value.value, ast.Name) and
                    node.value.value.id == 'self' and
                    node.value.attr == 'params'):
                    
                    if isinstance(node.slice, ast.Constant):
                        param_name = node.slice.value
                        required_params.add(param_name)
                        
        # Build parameter dictionary
        all_params = set(required_params) | set(optional_params.keys())
        
        for param_name in all_params:
            param_info = {
                'name': param_name,
                'required': param_name in required_params,
                'type': 'string',  # Default type
                'description': self._find_parameter_description(param_name)
            }
            
            if param_name in optional_params:
                param_info['default'] = optional_params[param_name]
                # Infer type from default value
                if optional_params[param_name] is not None:
                    param_info['type'] = self._infer_type(optional_params[param_name])
                    
            params[param_name] = param_info
            
        return {
            'parameters': params,
            'required': list(required_params),
            'optional': optional_params
        }
        
    def _infer_type(self, value: Any) -> str:
        """Infer parameter type from default value."""
        if isinstance(value, bool):
            return 'boolean'
        elif isinstance(value, int):
            return 'integer'
        elif isinstance(value, float):
            return 'number'
        elif isinstance(value, list):
            return 'array'
        elif isinstance(value, dict):
            return 'object'
        else:
            return 'string'
            
    def _find_parameter_description(self, param_name: str) -> str:
        """Try to find description for a parameter from comments or docstrings."""
        # Look for comments near parameter usage
        lines = self.content.split('\n')
        
        # Common patterns to search for
        patterns = [
            rf'#.*{param_name}.*:(.+)',  # Comment with param_name
            rf'{param_name}\s*=.*#(.+)',  # Inline comment
            rf'"{param_name}".*#(.+)',    # String key with comment
        ]
        
        for i, line in enumerate(lines):
            for pattern in patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    return match.group(1).strip()
                    
        # Check __init__ docstring if it exists
        init_method = None
        for node in self.skill_class.body:
            if isinstance(node, ast.FunctionDef) and node.name == '__init__':
                init_method = node
                break
                
        if init_method and ast.get_docstring(init_method):
            docstring = ast.get_docstring(init_method)
            # Look for parameter in docstring
            param_pattern = rf'{param_name}:\s*(.+?)(?:\n|$)'
            match = re.search(param_pattern, docstring, re.MULTILINE)
            if match:
                return match.group(1).strip()
                
        # Default descriptions based on common parameter names
        default_descriptions = {
            'api_key': 'API key for authentication',
            'tool_name': 'Name of the tool/function to register',
            'temperature_unit': 'Temperature unit (fahrenheit or celsius)',
            'count': 'Number of results to return',
            'timeout': 'Request timeout in seconds',
            'max_length': 'Maximum length of response',
            'delay': 'Delay between requests in seconds',
            'no_results_message': 'Message to display when no results are found',
            'description': 'Description of the tool/function',
            'url': 'URL endpoint to connect to',
            'token': 'Authentication token',
            'project_id': 'Project identifier',
            'space_name': 'Space name for the service',
            'document_id': 'Document identifier',
            'search_engine_id': 'Search engine identifier',
            'num_results': 'Number of search results to return',
            'max_content_length': 'Maximum content length to extract',
            'distance': 'Distance threshold for search results',
            'tags': 'Tags to filter results',
            'language': 'Language for query processing',
            'required_fields': 'Fields that must be provided',
            'transfers': 'Transfer configuration mapping',
            'temperature': 'Temperature setting for responses',
            'gateway_url': 'Gateway URL endpoint',
            'services': 'List of services to enable',
            'verify_ssl': 'Whether to verify SSL certificates',
            'cache_enabled': 'Whether caching is enabled',
            'headers': 'HTTP headers to include',
            'selectors': 'CSS/XPath selectors for extraction',
            'follow_patterns': 'URL patterns to follow',
            'max_depth': 'Maximum crawl depth',
            'max_pages': 'Maximum number of pages to crawl',
            'user_agent': 'User agent string for requests',
            'build_index': 'Whether to build the index',
            'index_file': 'Path to index file',
            'source_dir': 'Source directory for indexing',
            'file_types': 'File types to include',
            'verbose': 'Enable verbose logging',
            'categories': 'Categories to include',
            'files': 'List of files to process'
        }
        
        return default_descriptions.get(param_name, f'{param_name} parameter')
        
    def extract_tool_definitions(self) -> List[Dict[str, Any]]:
        """Extract tool/function definitions from register_tools method."""
        tools = []
        
        register_method = None
        for node in self.skill_class.body:
            if isinstance(node, ast.FunctionDef) and node.name == 'register_tools':
                register_method = node
                break
                
        if not register_method:
            return tools
            
        # Look for define_tool or register_swaig_function calls
        for node in ast.walk(register_method):
            if isinstance(node, ast.Call):
                if (isinstance(node.func, ast.Attribute) and
                    node.func.attr in ['define_tool', 'register_swaig_function']):
                    
                    tool_info = self._extract_tool_info_from_call(node)
                    if tool_info:
                        tools.append(tool_info)
                        
        return tools
        
    def _extract_tool_info_from_call(self, call_node: ast.Call) -> Optional[Dict[str, Any]]:
        """Extract tool information from a function call."""
        tool_info = {
            'parameters': {}
        }
        
        # Extract keyword arguments
        for keyword in call_node.keywords:
            if keyword.arg == 'name' and isinstance(keyword.value, ast.Name):
                tool_info['name'] = keyword.value.id
            elif keyword.arg == 'name' and isinstance(keyword.value, ast.Constant):
                tool_info['name'] = keyword.value.value
            elif keyword.arg == 'description' and isinstance(keyword.value, ast.Constant):
                tool_info['description'] = keyword.value.value
            elif keyword.arg == 'parameters' and isinstance(keyword.value, ast.Dict):
                # Extract parameter definitions
                tool_info['parameters'] = self._extract_parameters_from_dict(keyword.value)
                
        return tool_info if 'name' in tool_info else None
        
    def _extract_parameters_from_dict(self, dict_node: ast.Dict) -> Dict[str, Any]:
        """Extract parameter definitions from an AST Dict node."""
        params = {}
        
        for key, value in zip(dict_node.keys, dict_node.values):
            if isinstance(key, ast.Constant):
                param_name = key.value
                param_info = {'name': param_name}
                
                # Extract parameter properties from nested dict
                if isinstance(value, ast.Dict):
                    for k, v in zip(value.keys, value.values):
                        if isinstance(k, ast.Constant) and isinstance(v, ast.Constant):
                            param_info[k.value] = v.value
                            
                params[param_name] = param_info
                
        return params
        
    def extract_all_metadata(self) -> Dict[str, Any]:
        """Extract all metadata from the skill file."""
        self.load_file()
        
        if not self.find_skill_class():
            return {'error': 'No SkillBase class found'}
            
        # Extract class attributes
        attributes = self.extract_class_attributes()
        
        # Extract parameter information
        param_info = self.extract_parameter_info()
        
        # Extract tool definitions
        tools = self.extract_tool_definitions()
        
        # Get class docstring
        class_docstring = ast.get_docstring(self.skill_class) or ""
        
        return {
            'file': self.file_path,
            'class_name': self.skill_class.name,
            'skill_name': attributes.get('SKILL_NAME'),
            'skill_description': attributes.get('SKILL_DESCRIPTION'),
            'skill_version': attributes.get('SKILL_VERSION', '1.0.0'),
            'supports_multiple_instances': attributes.get('SUPPORTS_MULTIPLE_INSTANCES', False),
            'required_packages': attributes.get('REQUIRED_PACKAGES', []),
            'required_env_vars': attributes.get('REQUIRED_ENV_VARS', []),
            'class_docstring': class_docstring,
            'parameters': param_info['parameters'],
            'required_params': param_info['required'],
            'optional_params': param_info['optional'],
            'tools': tools
        }


def extract_skill_metadata(file_path: str) -> Dict[str, Any]:
    """Extract metadata from a single skill file."""
    try:
        extractor = SkillMetadataExtractor(file_path)
        return extractor.extract_all_metadata()
    except Exception as e:
        return {'file': file_path, 'error': str(e)}


def analyze_all_skills(skills_dir: str) -> List[Dict[str, Any]]:
    """Analyze all skill files in a directory."""
    results = []
    skills_path = Path(skills_dir)
    
    # Find all skill.py files
    for skill_file in sorted(skills_path.rglob('*/skill.py')):
        # Skip __pycache__ directories
        if '__pycache__' in str(skill_file):
            continue
            
        print(f"Extracting metadata from: {skill_file}")
        metadata = extract_skill_metadata(str(skill_file))
        results.append(metadata)
        
    return results


def create_skill_documentation(metadata: Dict[str, Any]) -> str:
    """Create markdown documentation for a skill."""
    if 'error' in metadata:
        return f"## Error\n\n{metadata['error']}\n"
        
    doc = f"## {metadata.get('skill_name', 'Unknown')} Skill\n\n"
    doc += f"**Class:** `{metadata.get('class_name', 'Unknown')}`\n\n"
    doc += f"**Description:** {metadata.get('skill_description', 'No description')}\n\n"
    
    if metadata.get('class_docstring'):
        doc += f"### Details\n\n{metadata['class_docstring']}\n\n"
        
    if metadata.get('supports_multiple_instances'):
        doc += "**Supports Multiple Instances:** Yes\n\n"
        
    if metadata.get('required_packages'):
        doc += f"**Required Packages:** {', '.join(metadata['required_packages'])}\n\n"
        
    if metadata.get('required_env_vars'):
        doc += f"**Required Environment Variables:** {', '.join(metadata['required_env_vars'])}\n\n"
        
    # Parameters section
    if metadata.get('parameters'):
        doc += "### Parameters\n\n"
        
        # Required parameters
        required = [p for p in metadata['parameters'].values() if p['required']]
        if required:
            doc += "#### Required Parameters\n\n"
            for param in required:
                doc += f"- **{param['name']}** (`{param['type']}`): {param['description']}\n"
            doc += "\n"
            
        # Optional parameters
        optional = [p for p in metadata['parameters'].values() if not p['required']]
        if optional:
            doc += "#### Optional Parameters\n\n"
            for param in optional:
                default = f" (default: `{param.get('default', 'None')}`)" if 'default' in param else ""
                doc += f"- **{param['name']}** (`{param['type']}`){default}: {param['description']}\n"
            doc += "\n"
            
    # Tools section
    if metadata.get('tools'):
        doc += "### Registered Tools\n\n"
        for tool in metadata['tools']:
            doc += f"#### {tool.get('name', 'Unknown')}\n\n"
            if 'description' in tool:
                doc += f"{tool['description']}\n\n"
            if tool.get('parameters'):
                doc += "**Parameters:**\n\n"
                for param_name, param_info in tool['parameters'].items():
                    doc += f"- **{param_name}**: {param_info.get('description', 'No description')}\n"
                doc += "\n"
                
    return doc


def main():
    """Main function to extract and document skill metadata."""
    skills_dir = "/home/devuser/src/signalwire-agent-builder/signalwire-agents/signalwire_agents/skills"
    
    if not os.path.exists(skills_dir):
        print(f"Skills directory not found: {skills_dir}")
        return
        
    results = analyze_all_skills(skills_dir)
    
    # Save detailed metadata
    with open("skill_metadata.json", 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\nDetailed metadata saved to: skill_metadata.json")
    
    # Create documentation
    doc_content = "# SignalWire Skills Documentation\n\n"
    doc_content += "This document provides detailed information about all available skills.\n\n"
    
    for metadata in results:
        if 'error' not in metadata:
            doc_content += create_skill_documentation(metadata)
            doc_content += "\n---\n\n"
            
    with open("skills_documentation.md", 'w') as f:
        f.write(doc_content)
    print(f"Documentation saved to: skills_documentation.md")
    
    # Print summary
    print("\n" + "="*80)
    print("SKILL METADATA EXTRACTION SUMMARY")
    print("="*80 + "\n")
    
    for skill in results:
        if 'error' in skill:
            print(f"❌ {skill['file']}: {skill['error']}")
        else:
            print(f"✅ {skill.get('skill_name', 'Unknown')} - {len(skill.get('parameters', {}))} parameters extracted")


if __name__ == "__main__":
    main()