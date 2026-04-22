import React, { useMemo, useState, useCallback, useEffect } from "react";
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
import dagre from "dagre";

// --- Custom Nodes ---

function UmlClassNode({ data }) {
  const { label, properties, isExternal, isSelected, title, mimMeta, description } = data;

  const isYellow =
    mimMeta?.isExternal ||
    mimMeta?.stereotype === "Referentielijst" ||
    label.toLowerCase() === "partij" ||
    label.toLowerCase() === "actor" ||
    label.toLowerCase() === "land";
  const accentColor = isYellow ? "#d97706" : "#1a56db";
  const bgColor = isYellow ? "#fef3c7" : "#fff";

  return (
    <div
      title={description || mimMeta?.Definitie || ""}
      style={{
        background: bgColor,
        border: `1.5px solid ${isSelected ? "#e11d48" : accentColor}`,
        borderRadius: 2,
        minWidth: 220,
        fontSize: "11px", // Smaller font for EA look
        boxShadow: isSelected ? "0 0 0 4px rgba(225, 29, 72, 0.2)" : "0 2px 8px rgba(0,0,0,0.05)",
        transition: "all 0.2s ease",
      }}
    >
      <Handle type="target" position={Position.Top} id="t" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="l" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right} id="r" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} id="b" style={{ opacity: 0 }} />

      <div
        style={{
          background: accentColor,
          color: "#fff",
          padding: "6px 10px",
          fontWeight: 700,
          textAlign: "center",
          borderBottom: "1px solid rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ fontSize: "8px", fontWeight: 400, opacity: 0.9, marginBottom: "2px" }}>
          «{mimMeta?.stereotype || "Objecttype"}»
          {mimMeta?.packageName && (
            <div style={{ fontSize: "7px", fontStyle: "italic", opacity: 0.8 }}>
              ({mimMeta.packageName})
            </div>
          )}
        </div>
        <span style={{ fontSize: "13px" }}>{title || label}</span>
      </div>

      <div style={{ padding: "3px 0" }}>
        {properties.map((prop, i) => (
          <div
            key={i}
            title={prop.description || ""}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "2px 10px",
              borderTop: i > 0 ? "1px solid #f1f5f9" : "none",
            }}
          >
            <span style={{ fontWeight: prop.required ? 600 : 400, color: "#1e293b" }}>
              + {prop.displayName || prop.name}
            </span>
            <span style={{ color: "#64748b", fontSize: "10px", marginLeft: "8px" }}>
              {prop.type} {prop.cardinality || ""} {prop.isId ? "{id}" : ""}
            </span>
          </div>
        ))}
      </div>

      <Handle type="source" position={Position.Top} id="st" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left} id="sl" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="sr" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="sb" style={{ opacity: 0 }} />
    </div>
  );
}

function UmlNoteNode({ data }) {
  return (
    <div
      style={{
        background: "#fefce8",
        border: "1px solid #fde047",
        borderRadius: "0 8px 0 0",
        padding: "10px",
        width: 180,
        fontSize: 10,
        color: "#713f12",
        boxShadow: "2px 2px 5px rgba(0,0,0,0.03)",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 0,
          height: 0,
          borderBottom: "10px solid #fef3c7",
          borderRight: "10px solid #f8fafc",
        }}
      ></div>
      <Handle type="target" position={Position.Left} id="tl" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top} id="tt" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right} id="tr" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} id="tb" style={{ opacity: 0 }} />
      <div style={{ lineHeight: 1.4 }}>{data.text}</div>
    </div>
  );
}

const nodeTypes = { umlClass: UmlClassNode, umlNote: UmlNoteNode };

// --- Layout Logic ---

function schemaToUml(schema) {
  const initialNodes = [];
  const initialEdges = [];
  const defs = schema.$defs || schema.definitions || {};
  const classes = {};

  Object.entries(defs).forEach(([key, def]) => {
    classes[key] = { id: key, name: def.title || key, def };
  });

  Object.values(classes).forEach((cls) => {
    const mim = cls.def["x-mim-metadata"] || {};

    const properties = Object.entries(cls.def.properties || {}).map(([pName, pDef]) => {
      const pMeta = pDef["x-mim-metadata"] || {};
      let typeLabel = pDef.$ref ? pDef.$ref.split("/").pop() : pDef.type || "string";
      if (pMeta.umlType) typeLabel = pMeta.umlType;

      return {
        name: pName,
        displayName: pMeta.naam || pName,
        type: typeLabel,
        required: (cls.def.required || []).includes(pName),
        cardinality: pMeta.cardinality,
        isId: pMeta.isId,
        visibility: pMeta.visibility,
        description: pDef.description || pMeta.Definitie,
      };
    });

    const position = mim.position ? { x: mim.position.x, y: mim.position.y } : { x: 0, y: 0 };

    initialNodes.push({
      id: cls.id,
      type: "umlClass",
      position,
      data: {
        label: cls.id,
        title: cls.name,
        mimMeta: mim,
        description: cls.def.description || mim.Definitie,
        properties,
      },
    });

    if (mim.supertype && classes[mim.supertype]) {
      initialEdges.push({
        id: `gen-${cls.id}->${mim.supertype}`,
        source: cls.id,
        target: mim.supertype,
        type: "step",
        label: "«generalization»",
        labelStyle: { fontSize: 9, fontStyle: "italic", fill: "#94a3b8" },
        markerEnd: { type: MarkerType.Arrow, color: "#94a3b8", width: 22, height: 22 },
        style: { stroke: "#cbd5e1", strokeWidth: 1.5 },
      });
    }

    if (mim.associations) {
      mim.associations.forEach((a) => {
        if (classes[a.target]) {
          initialEdges.push({
            id: `assoc-${cls.id}->${a.target}-${a.name}`,
            source: cls.id,
            target: a.target,
            type: "step",
            label: `${a.direction === "Source -> Destination" ? "►" : ""} ${a.name || ""} ${a.targetCard ? `[${a.targetCard}]` : ""}`,
            labelStyle: { fontSize: 10, fontWeight: 600, fill: "#1a56db" },
            labelBgStyle: { fill: "rgba(255,255,255,0.9)", padding: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#1a56db" },
            style: { stroke: "#1a56db", strokeWidth: 1.5, opacity: 0.6 },
          });
        }
      });
    }

    if (mim.notes && mim.notes.length > 0) {
      mim.notes.forEach((note, idx) => {
        const noteId = `note-${cls.id}-${idx}`;
        const notePos = note.position
          ? { x: note.position.x, y: note.position.y }
          : { x: position.x + 280, y: position.y + idx * 80 + 40 };
        initialNodes.push({
          id: noteId,
          type: "umlNote",
          position: notePos,
          data: { text: note.text },
        });
        initialEdges.push({
          id: `link-${noteId}`,
          source: cls.id,
          target: noteId,
          type: "straight",
          style: { stroke: "#94a3b8", strokeWidth: 1.2, strokeDasharray: "4,4" },
        });
      });
    }
  });

  const hasPositions =
    initialNodes.filter((n) => n.position.x !== 0 || n.position.y !== 0).length >
    initialNodes.length / 2;
  return hasPositions
    ? assignHandles(initialNodes, initialEdges)
    : getLayoutedElements(initialNodes, initialEdges);
}

function assignHandles(nodes, edges) {
  const finalEdges = edges.map((edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);

    if (sourceNode && targetNode) {
      const dx = targetNode.position.x - sourceNode.position.x;
      const dy = targetNode.position.y - sourceNode.position.y;
      let sourceHandle = "sb";
      let targetHandle = "t";
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) {
          sourceHandle = "sr";
          targetHandle = "l";
        } else {
          sourceHandle = "sl";
          targetHandle = "r";
        }
      } else {
        if (dy > 0) {
          sourceHandle = "sb";
          targetHandle = "t";
        } else {
          sourceHandle = "st";
          targetHandle = "b";
        }
      }
      if (edge.id.startsWith("gen-") && dy < -50) {
        sourceHandle = "st";
        targetHandle = "b";
      }
      return { ...edge, sourceHandle, targetHandle };
    }
    return edge;
  });
  return { nodes, edges: finalEdges };
}

const getLayoutedElements = (nodes, edges, direction = "TB") => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, ranksep: 120, nodesep: 80 });
  nodes.forEach((node) => {
    const width = node.type === "umlNote" ? 200 : 260;
    const height = node.type === "umlNote" ? 60 : 80 + (node.data.properties?.length || 0) * 24;
    dagreGraph.setNode(node.id, { width, height });
  });
  edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));
  dagre.layout(dagreGraph);
  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.position = {
      x: nodeWithPosition.x - nodeWithPosition.width / 2,
      y: nodeWithPosition.y - nodeWithPosition.height / 2,
    };
  });
  return assignHandles(nodes, edges);
};

export default function UmlDiagram({ schema }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => schemaToUml(schema), [schema]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    const { nodes: n, edges: e } = schemaToUml(schema);
    setNodes(n);
    setEdges(e);
  }, [schema, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (e, node) => {
      if (node.type === "umlNote") return;
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
        background: "#fcfcfc",
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
          fitViewOptions={{ padding: 0.1 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#f1f5f9" gap={20} />
          <Controls />
        </ReactFlow>
      </div>
      {selectedNode && (
        <div className="diagram-inspector">
          <button className="inspector-close" onClick={() => setSelectedNode(null)}>
            ×
          </button>
          <h3>{selectedNode.data.title}</h3>
          <div className="inspector-section">
            <h4>Conceptual Details</h4>
            {selectedNode.data.mimMeta ? (
              Object.entries(selectedNode.data.mimMeta).map(
                ([k, v]) =>
                  ![
                    "id",
                    "naam",
                    "stereotype",
                    "associations",
                    "supertype",
                    "notes",
                    "isExternal",
                    "packageName",
                    "position",
                  ].includes(k) && (
                    <div key={k} className="meta-row">
                      <strong>{k}:</strong> <span>{String(v)}</span>
                    </div>
                  ),
              )
            ) : (
              <p>No extra metadata.</p>
            )}
          </div>
          <div className="inspector-section">
            <h4>Attributes</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {selectedNode.data.properties.map((p, i) => (
                <div key={`${p.name}-${i}`} className="inspector-prop">
                  <div className="prop-main">
                    <strong>{p.displayName || p.name}</strong> <code>{p.type}</code>
                  </div>
                  {p.description && (
                    <p style={{ margin: "4px 0 0 0", fontSize: "0.85em", color: "#475569" }}>
                      {p.description}
                    </p>
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
