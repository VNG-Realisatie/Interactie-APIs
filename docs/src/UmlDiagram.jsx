import React, { useMemo, useState, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

function UmlClassNode({ data }) {
  const { label, properties, isExternal, isSelected, title, mimMeta, description } = data;
  return (
    <div
      title={description || mimMeta?.Definitie || ""}
      style={{
        background: isExternal ? "#fef3c7" : "#fff",
        border: `2px solid ${isSelected ? "#e11d48" : isExternal ? "#d97706" : "#1a56db"}`,
        borderRadius: 8,
        minWidth: 260,
        fontSize: 13,
        boxShadow: isSelected ? "0 0 0 4px rgba(225, 29, 72, 0.2)" : "0 4px 12px rgba(0,0,0,0.08)",
        transition: "all 0.2s ease",
      }}
    >
      {/* Top/Bottom targets for vertical flow */}
      <Handle type="target" position={Position.Top} id="t" style={{ background: "#1a56db" }} />
      <Handle type="target" position={Position.Left} id="l" style={{ background: "#1a56db" }} />
      <Handle type="target" position={Position.Right} id="r" style={{ background: "#1a56db" }} />
      <Handle type="target" position={Position.Bottom} id="b" style={{ background: "#1a56db" }} />

      <div
        style={{
          background: isExternal ? "#d97706" : "#1a56db",
          color: "#fff",
          padding: "10px 14px",
          fontWeight: 700,
          textAlign: "center",
          borderBottom: "1px solid rgba(0,0,0,0.1)",
          fontSize: "14px",
        }}
      >
        {title || label}
      </div>
      <div style={{ padding: "6px 0" }}>
        {properties.map((prop, i) => (
          <div
            key={`${prop.name}-${i}`}
            title={prop.description || ""}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 14px",
              borderTop: i > 0 ? "1px solid #f3f4f6" : "none",
              cursor: "help",
            }}
          >
            <span style={{ fontWeight: prop.required ? 600 : 400, color: "#374151" }}>
              {prop.displayName || prop.name}
            </span>
            <span
              style={{ color: prop.isRef ? "#1a56db" : "#9ca3af", fontSize: 11, fontWeight: 500 }}
            >
              {prop.type}
            </span>
          </div>
        ))}
      </div>
      {/* Sources directly on the handles for cleaner lines */}
      <Handle type="source" position={Position.Bottom} id="sb" style={{ background: "#1a56db" }} />
      <Handle type="source" position={Position.Top} id="st" style={{ background: "#1a56db" }} />
      <Handle type="source" position={Position.Right} id="sr" style={{ background: "#1a56db" }} />
      <Handle type="source" position={Position.Left} id="sl" style={{ background: "#1a56db" }} />
    </div>
  );
}

const nodeTypes = { umlClass: UmlClassNode };

/**
 * Smart Grid Layout Algorithm
 * Places root in center-top, then expands in a structured way
 */
function schemaToUml(schema) {
  const nodes = [];
  const edges = [];
  const defs = schema.$defs || schema.definitions || {};

  const classes = {};
  if (schema.properties) {
    classes["root"] = { id: "root", name: schema.title || "Hoofdmodel", def: schema };
  }
  Object.entries(defs).forEach(([key, def]) => {
    classes[key] = { id: key, name: def.title || key, def };
  });

  const ids = Object.keys(classes);
  const rootId = ids.includes("agendaAfspraak")
    ? "agendaAfspraak"
    : ids.includes("root")
      ? "root"
      : ids[0];

  // 1. Build Adjacency for connections
  const connections = {};
  ids.forEach((id) => (connections[id] = new Set()));

  ids.forEach((id) => {
    const propEntries = classes[id].def.properties || {};
    Object.values(propEntries).forEach((p) => {
      const refs = [];
      if (p.$ref) refs.push(p.$ref);
      if (p.items?.$ref) refs.push(p.items.$ref);
      if (p.oneOf) p.oneOf.forEach((s) => s.$ref && refs.push(s.$ref));

      refs.forEach((ref) => {
        const m = ref.match(/#\/\$defs\/(.+)/);
        const targetId = m ? m[1] : null;
        if (targetId && classes[targetId]) {
          connections[id].add(targetId);
          connections[targetId].add(id);
        }
      });
    });
  });

  // 2. Simple Circle/Grid Hybrid Layout
  // We place the root at 0,0 and others in rows
  const COLS = 3;
  const X_GAP = 450;
  const Y_GAP = 350;

  // Order nodes by distance from root
  const orderedIds = [];
  const visited = new Set();
  const queue = [rootId];
  visited.add(rootId);

  while (queue.length > 0) {
    const id = queue.shift();
    orderedIds.push(id);
    Array.from(connections[id]).forEach((neighbor) => {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    });
  }
  // Add any remaining
  ids.forEach((id) => {
    if (!visited.has(id)) orderedIds.push(id);
  });

  // 3. Create actual Nodes and Edges
  orderedIds.forEach((id, index) => {
    const cls = classes[id];
    const col = index % COLS;
    const row = Math.floor(index / COLS);

    const x = col * X_GAP;
    const y = row * Y_GAP;

    const propEntries = cls.def.properties || {};
    const required = new Set(cls.def.required || []);

    const properties = Object.entries(propEntries).map(([propName, propDef]) => {
      const pMeta = propDef["x-mim-metadata"] || (propDef.items && propDef.items["x-mim-metadata"]);
      const description = propDef.description || (propDef.items && propDef.items.description);

      const refs = [];
      if (propDef.$ref) refs.push(propDef.$ref);
      if (propDef.items?.$ref) refs.push(propDef.items.$ref);
      if (propDef.oneOf) propDef.oneOf.forEach((s) => s.$ref && refs.push(s.$ref));

      refs.forEach((ref) => {
        const m = ref.match(/#\/\$defs\/(.+)/);
        const targetId = m ? m[1] : null;
        if (targetId && classes[targetId]) {
          edges.push({
            id: `${id}-${propName}->${targetId}`,
            source: id,
            target: targetId,
            type: "smoothstep",
            style: { stroke: "#1a56db", strokeWidth: 2, opacity: 0.4 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#1a56db" },
          });
        }
      });

      return {
        name: propName,
        displayName: pMeta?.naam,
        type: propDef.$ref ? propDef.$ref.split("/").pop() : propDef.type || "Object",
        isRef: refs.length > 0,
        required: required.has(propName),
        meta: pMeta,
        description,
      };
    });

    nodes.push({
      id,
      type: "umlClass",
      position: { x, y },
      data: {
        label: id,
        title: cls.name,
        description: cls.def.description,
        properties,
        mimMeta: cls.def["x-mim-metadata"],
      },
    });
  });

  return { nodes, edges };
}

export default function UmlDiagram({ schema }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => schemaToUml(schema), [schema]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback(
    (event, node) => {
      setSelectedNode(node);
      setNodes((nds) =>
        nds.map((n) => ({ ...n, data: { ...n.data, isSelected: n.id === node.id } })),
      );
    },
    [setNodes],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, isSelected: false } })));
  }, [setNodes]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: "#f8fafc",
      }}
    >
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#cbd5e1" gap={24} size={1} />
          <Controls />
        </ReactFlow>
      </div>
      {selectedNode && (
        <div className="diagram-inspector">
          <button className="inspector-close" onClick={() => setSelectedNode(null)}>
            ×
          </button>
          <h3>{selectedNode.data.title}</h3>
          {selectedNode.data.description && (
            <div className="inspector-section">
              <p
                style={{
                  fontSize: "0.95em",
                  color: "#4b5563",
                  lineHeight: "1.5",
                  marginBottom: "20px",
                }}
              >
                {selectedNode.data.description}
              </p>
            </div>
          )}
          <div className="inspector-section">
            <h4>Conceptuele Details</h4>
            {selectedNode.data.mimMeta ? (
              Object.entries(selectedNode.data.mimMeta).map(
                ([k, v]) =>
                  !["id", "naam", "stereotype"].includes(k) && (
                    <div key={k} className="meta-row">
                      <strong>{k}:</strong> <span>{v}</span>
                    </div>
                  ),
              )
            ) : (
              <p style={{ fontSize: "0.9em", color: "#9ca3af" }}>Geen metadata beschikbaar.</p>
            )}
          </div>
          <div className="inspector-section">
            <h4>Attributen / Velden</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {selectedNode.data.properties.map((p, i) => (
                <div key={`${p.name}-${i}`} className="inspector-prop">
                  <div className="prop-main">
                    <strong>{p.displayName || p.name}</strong> <code>{p.type}</code>
                  </div>
                  {p.description && (
                    <p style={{ margin: "4px 0 0 0", fontSize: "0.88em", color: "#374151" }}>
                      {p.description}
                    </p>
                  )}
                  {p.meta &&
                    Object.entries(p.meta).map(
                      ([k, v]) =>
                        !["naam", "type"].includes(k) && (
                          <div key={k} className="prop-sub-meta">
                            <small>
                              <strong>{k}:</strong> {v}
                            </small>
                          </div>
                        ),
                    )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
