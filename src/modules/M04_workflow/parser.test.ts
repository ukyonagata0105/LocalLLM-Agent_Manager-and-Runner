/**
 * M04 Workflow Parser - Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { parseWorkflowYAML, serializeWorkflowYAML } from './parser';
import { NodeType } from './types';

describe('M04 Workflow Parser', () => {
  describe('parseWorkflowYAML', () => {
    it('should parse a valid workflow YAML', () => {
      const yaml = `
name: Test Workflow
description: A test workflow
nodes:
  - id: start
    type: start
    data:
      label: Start
edges:
  - id: edge-1
    source: start
    target: end
`;
      const result = parseWorkflowYAML(yaml);

      expect(result.name).toBe('Test Workflow');
      expect(result.description).toBe('A test workflow');
      expect(result.nodes).toHaveLength(1);
      expect(result.edges).toHaveLength(1);
    });

    it('should parse node with data', () => {
      const yaml = `
name: Test
nodes:
  - id: node1
    type: prompt
    data:
      label: My Action
      prompt: "Hello"
edges: []
`;
      const result = parseWorkflowYAML(yaml);

      expect(result.nodes[0].id).toBe('node1');
      expect(result.nodes[0].type).toBe('prompt');
    });
  });

  describe('serializeWorkflowYAML', () => {
    it('should serialize a complete workflow to YAML', () => {
      const workflow = {
        id: 'wf-1',
        name: 'My Workflow',
        description: 'Description',
        variables: {},
        nodes: [
          { id: 'n1', type: NodeType.Start, position: { x: 0, y: 0 }, data: { label: 'Start' } },
        ],
        edges: [],
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = serializeWorkflowYAML(workflow);

      expect(result).toContain('name: My Workflow');
      expect(result).toContain('description: Description');
    });
  });
});
