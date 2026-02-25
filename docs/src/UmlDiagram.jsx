import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

/**
 * Custom UML class node: shows class name header + property rows with types.
 */
function UmlClassNode({ data }) {
  const { label, properties, isExternal } = data;

  return (
    <div style={{
      background: isExternal ? '#fef3c7' : '#fff',
      border: `2px solid ${isExternal ? '#d97706' : '#1a56db'}`,
      borderRadius: 8,
      minWidth: 200,
      fontSize: 13,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      overflow: 'hidden',
    }}>
      <Handle type="target" position={Position.Left} style={{ background: '#1a56db' }} />
      {/* Class name header */}
      <div style={{
        background: isExternal ? '#d97706' : '#1a56db',
        color: '#fff',
        padding: '6px 12px',
        fontWeight: 600,
        fontSize: 14,
        textAlign: 'center',
      }}>
        {label}
      </div>
      {/* Properties */}
      {properties && properties.length > 0 && (
        <div style={{ padding: '4px 0' }}>
          {properties.map((prop, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              padding: '3px 12px',
              borderTop: i > 0 ? '1px solid #e5e7eb' : 'none',
            }}>
              <span style={{
                fontWeight: prop.required ? 600 : 400,
                color: '#1f2937',
              }}>
                {prop.name}{prop.required ? ' *' : ''}
              </span>
              <span style={{
                color: prop.isRef ? '#1a56db' : '#6b7280',
                fontStyle: prop.isRef ? 'italic' : 'normal',
                fontSize: 12,
              }}>
                {prop.type}
              </span>
            </div>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: '#1a56db' }} />
    </div>
  );
}

const nodeTypes = { umlClass: UmlClassNode };

/**
 * Parse a JSON Schema into ReactFlow nodes and edges for a UML diagram.
 */
function schemaToUml(schema) {
  const nodes = [];
  const edges = [];
  const classNames = new Set();

  // Collect all $defs as classes
  const defs = schema.$defs || schema.definitions || {};
  for (const name of Object.keys(defs)) {
    classNames.add(name);
  }

  // Also treat the root schema as a class if it has properties
  const rootName = schema.title || 'Root';
  if (schema.properties) {
    classNames.add(rootName);
  }

  let col = 0;
  // Track cumulative Y position per column
  const colY = [0];
  const COL_WIDTH = 350;
  const ROW_GAP = 40;
  const HEADER_HEIGHT = 34;
  const ROW_HEIGHT = 28;
  const PADDING = 8;

  function estimateNodeHeight(propCount) {
    return HEADER_HEIGHT + PADDING + Math.max(propCount, 1) * ROW_HEIGHT;
  }

  function addClassNode(name, def, isExternal = false) {
    const required = new Set(def.required || []);
    const properties = [];
    const propEntries = def.properties || {};

    for (const [propName, propDef] of Object.entries(propEntries)) {
      const ref = propDef.$ref;
      if (ref) {
        // Internal ref: #/$defs/CLASSNAME
        const internalMatch = ref.match(/#\/\$defs\/(.+)/);
        if (internalMatch) {
          const targetClass = internalMatch[1];
          properties.push({
            name: propName,
            type: targetClass,
            isRef: true,
            required: required.has(propName),
          });
          edges.push({
            id: `${name}->${targetClass}`,
            source: name,
            target: targetClass,
            label: propName,
            type: 'default',
            style: { stroke: '#1a56db', strokeWidth: 2 },
            labelStyle: { fontSize: 11, fill: '#6b7280' },
            animated: false,
          });
        } else {
          // External ref
          const extName = ref.split('/').pop().replace('.json', '');
          properties.push({
            name: propName,
            type: `→ ${extName}`,
            isRef: true,
            required: required.has(propName),
          });
          // Add external class if not already added
          if (!classNames.has(extName)) {
            classNames.add(extName);
            addClassNode(extName, {}, true);
          }
          edges.push({
            id: `${name}->${extName}`,
            source: name,
            target: extName,
            label: propName,
            type: 'default',
            style: { stroke: '#d97706', strokeWidth: 2, strokeDasharray: '5,5' },
            labelStyle: { fontSize: 11, fill: '#d97706' },
            animated: false,
          });
        }
      } else {
        let type = propDef.type || 'any';
        if (Array.isArray(type)) type = type.join('|');
        if (propDef.format) type += ` (${propDef.format})`;
        if (propDef.enum) type = propDef.enum.join(' | ');
        properties.push({
          name: propName,
          type,
          isRef: false,
          required: required.has(propName),
        });
      }
    }

    // Ensure current column exists in colY tracker
    if (colY[col] === undefined) colY[col] = 0;

    const nodeHeight = estimateNodeHeight(properties.length);

    nodes.push({
      id: name,
      type: 'umlClass',
      position: { x: col * COL_WIDTH, y: colY[col] },
      data: { label: name, properties, isExternal },
    });

    colY[col] += nodeHeight + ROW_GAP;

    // Move to next column if this column gets too tall (> 3 nodes worth)
    if (colY[col] > 900) {
      col++;
      if (colY[col] === undefined) colY[col] = 0;
    }
  }

  // Add root schema as first node
  if (schema.properties) {
    addClassNode(rootName, schema);
  }

  // Add $defs classes
  for (const [name, def] of Object.entries(defs)) {
    if (name !== rootName) {
      addClassNode(name, def);
    }
  }

  return { nodes, edges };
}

export default function UmlDiagram({ schema }) {
  const { initialNodes, initialEdges } = useMemo(() => {
    const { nodes, edges } = schemaToUml(schema);
    return { initialNodes: nodes, initialEdges: edges };
  }, [schema]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.3}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#e5e7eb" gap={20} />
      <Controls />
    </ReactFlow>
  );
}
