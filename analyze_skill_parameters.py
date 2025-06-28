#!/usr/bin/env python3
"""
Analyze SignalWire skill parameter definitions.

This script examines skill files to understand how they define and use parameters,
and provides a way to extract parameter definitions programmatically.
"""

import ast
import os
import json
from typing import Dict, List, Any, Optional
from pathlib import Path


class SkillParameterAnalyzer(ast.NodeVisitor):
    """AST visitor to analyze skill parameter usage patterns."""
    
    def __init__(self):
        self.param_accesses = []
        self.param_validations = []
        self.required_params = []
        self.optional_params = {}
        self.param_descriptions = {}
        
    def visit_Subscript(self, node):
        """Detect self.params.get() and self.params['key'] patterns."""
        if isinstance(node.value, ast.Attribute):
            if (isinstance(node.value.value, ast.Name) and 
                node.value.value.id == 'self' and 
                node.value.attr == 'params'):
                
                # Handle self.params['key']
                if isinstance(node.slice, ast.Constant):
                    self.param_accesses.append({
                        'type': 'direct_access',
                        'key': node.slice.value,
                        'required': True
                    })
                    
        self.generic_visit(node)
        
    def visit_Call(self, node):
        """Detect self.params.get() calls."""
        if (isinstance(node.func, ast.Attribute) and
            node.func.attr == 'get' and
            isinstance(node.func.value, ast.Attribute) and
            isinstance(node.func.value.value, ast.Name) and
            node.func.value.value.id == 'self' and
            node.func.value.attr == 'params'):
            
            # Extract parameter name and default value
            if node.args and isinstance(node.args[0], ast.Constant):
                param_name = node.args[0].value
                default_value = None
                
                if len(node.args) > 1:
                    if isinstance(node.args[1], ast.Constant):
                        default_value = node.args[1].value
                    elif isinstance(node.args[1], ast.List):
                        default_value = []
                    elif isinstance(node.args[1], ast.Dict):
                        default_value = {}
                        
                self.param_accesses.append({
                    'type': 'get_access',
                    'key': param_name,
                    'default': default_value,
                    'required': default_value is None
                })
                
                if default_value is not None:
                    self.optional_params[param_name] = default_value
                    
        self.generic_visit(node)
        
    def visit_ListComp(self, node):
        """Detect required parameter validation patterns."""
        # Look for patterns like:
        # [param for param in required_params if not self.params.get(param)]
        for comp in node.generators:
            if (isinstance(comp.iter, ast.Name) and 
                comp.iter.id == 'required_params'):
                # Found required params validation
                self.generic_visit(node)
                return
                
        self.generic_visit(node)


def extract_skill_parameters(file_path: str) -> Dict[str, Any]:
    """Extract parameter information from a skill file."""
    with open(file_path, 'r') as f:
        content = f.read()
        
    try:
        tree = ast.parse(content)
    except SyntaxError:
        return {'error': 'Failed to parse file'}
        
    analyzer = SkillParameterAnalyzer()
    analyzer.visit(tree)
    
    # Also look for literal required_params lists
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == 'required_params':
                    if isinstance(node.value, ast.List):
                        for elem in node.value.elts:
                            if isinstance(elem, ast.Constant):
                                analyzer.required_params.append(elem.value)
                                
    # Extract class-level metadata
    skill_info = {
        'file': file_path,
        'skill_name': None,
        'skill_description': None,
        'parameters': {},
        'required_params': [],
        'optional_params': {}
    }
    
    # Find the skill class
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            # Check if it inherits from SkillBase
            for base in node.bases:
                if isinstance(base, ast.Name) and base.id == 'SkillBase':
                    skill_info['class_name'] = node.name
                    
                    # Extract class attributes
                    for item in node.body:
                        if isinstance(item, ast.Assign):
                            for target in item.targets:
                                if isinstance(target, ast.Name):
                                    if target.id == 'SKILL_NAME' and isinstance(item.value, ast.Constant):
                                        skill_info['skill_name'] = item.value.value
                                    elif target.id == 'SKILL_DESCRIPTION' and isinstance(item.value, ast.Constant):
                                        skill_info['skill_description'] = item.value.value
                                        
    # Consolidate parameter information
    all_params = set()
    required_params = set()
    optional_params = {}
    
    # From analyzer results
    for access in analyzer.param_accesses:
        param_name = access['key']
        all_params.add(param_name)
        
        if access.get('required', False) or access.get('default') is None:
            required_params.add(param_name)
        else:
            optional_params[param_name] = access.get('default')
            
    # From explicit required_params list
    required_params.update(analyzer.required_params)
    all_params.update(analyzer.required_params)
    
    # Build final parameter dictionary
    for param in all_params:
        param_info = {
            'name': param,
            'required': param in required_params,
            'type': 'unknown'  # Would need more analysis to determine
        }
        
        if param in optional_params:
            param_info['default'] = optional_params[param]
            
        skill_info['parameters'][param] = param_info
        
    skill_info['required_params'] = list(required_params)
    skill_info['optional_params'] = optional_params
    
    return skill_info


def analyze_all_skills(skills_dir: str) -> List[Dict[str, Any]]:
    """Analyze all skill files in a directory."""
    results = []
    skills_path = Path(skills_dir)
    
    # Find all skill.py files
    for skill_file in skills_path.rglob('*/skill.py'):
        # Skip __pycache__ directories
        if '__pycache__' in str(skill_file):
            continue
            
        print(f"Analyzing: {skill_file}")
        skill_info = extract_skill_parameters(str(skill_file))
        results.append(skill_info)
        
    return results


def main():
    """Main function to analyze skills."""
    # Analyze skills in the signalwire-agents directory
    skills_dir = "/home/devuser/src/signalwire-agent-builder/signalwire-agents/signalwire_agents/skills"
    
    if not os.path.exists(skills_dir):
        print(f"Skills directory not found: {skills_dir}")
        return
        
    results = analyze_all_skills(skills_dir)
    
    # Print summary
    print("\n" + "="*80)
    print("SKILL PARAMETER ANALYSIS SUMMARY")
    print("="*80 + "\n")
    
    for skill in results:
        if 'error' in skill:
            print(f"❌ {skill['file']}: {skill['error']}")
            continue
            
        print(f"📦 Skill: {skill.get('skill_name', 'Unknown')} ({skill.get('class_name', 'Unknown')})")
        print(f"   File: {skill['file']}")
        print(f"   Description: {skill.get('skill_description', 'N/A')}")
        
        if skill['required_params']:
            print(f"   Required Parameters:")
            for param in sorted(skill['required_params']):
                print(f"     - {param}")
                
        if skill['optional_params']:
            print(f"   Optional Parameters:")
            for param, default in sorted(skill['optional_params'].items()):
                print(f"     - {param} (default: {default})")
                
        print()
        
    # Save detailed results to JSON
    output_file = "skill_parameters_analysis.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\nDetailed results saved to: {output_file}")
    
    # Print parameter patterns summary
    print("\n" + "="*80)
    print("COMMON PARAMETER PATTERNS")
    print("="*80 + "\n")
    
    # Collect all parameter names
    all_param_names = set()
    param_usage_count = {}
    
    for skill in results:
        for param_name in skill.get('parameters', {}).keys():
            all_param_names.add(param_name)
            param_usage_count[param_name] = param_usage_count.get(param_name, 0) + 1
            
    # Sort by usage count
    common_params = sorted(param_usage_count.items(), key=lambda x: x[1], reverse=True)
    
    print("Most common parameters across skills:")
    for param, count in common_params[:10]:
        print(f"  - {param}: used in {count} skills")


if __name__ == "__main__":
    main()