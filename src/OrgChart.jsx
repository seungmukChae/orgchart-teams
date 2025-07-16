// OrgChart.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Tree from 'react-d3-tree';

export default function OrgChart({ data, searchQuery }) {
  const containerRef = useRef(null);
  const treeRef = useRef(null);
  const [openSection, setOpenSection] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, email: '' });

  const sectionIds = ['100','101','102'];

  useEffect(() => {
    const handleResize = () => {
      treeRef.current?.centerNode?.(data.id);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data]);

  const handleClick = (nodeDatum) => {
    if (sectionIds.includes(nodeDatum.id)) {
      setOpenSection(prev => prev === nodeDatum.id ? null : nodeDatum.id);
    } else if (nodeDatum.email) {
      navigator.clipboard.writeText(nodeDatum.email);
    }
  };

  const buildTree = useCallback((node) => {
    if (!node) return null;
    const term = searchQuery.trim().toLowerCase();
    let children = (node.children || []).map(buildTree).filter(Boolean);

    if (!term) {
      if (sectionIds.includes(node.id)) {
        children = openSection === node.id ? children : [];
      }
      return { ...node, children };
    }

    const isNameMatch  = node.이름?.toLowerCase().includes(term);
    const isTitleMatch = node.직책?.toLowerCase().includes(term);
    const isTeamMatch  = node.팀?.toLowerCase().includes(term);

    if (isNameMatch || isTitleMatch) {
      return { ...node, children };
    }
    if (isTeamMatch) {
      const allDescendants = (node.children || []).map(buildTree).filter(Boolean);
      return { ...node, children: allDescendants };
    }
    if (children.length) {
      return { ...node, children };
    }
    return null;
  }, [searchQuery, openSection, data]);

  const filteredTree = useMemo(() => buildTree(data), [buildTree, data]);
  if (!filteredTree) {
    return <div style={{ padding: '2rem', color: '#888' }}>검색 결과가 없습니다.</div>;
  }

  const renderNode = ({ nodeDatum }) => {
    const idNum = parseInt(nodeDatum.id, 10);
    let fill = idNum >= 100 && idNum <= 199 ? '#ffa500' : '#e0e0e0';
    if (sectionIds.includes(nodeDatum.id)) {
      fill = nodeDatum.id === '100' ? '#007bff'
           : nodeDatum.id === '101' ? '#28a745'
           : '#ff9999';
    }

    return (
      <g
        onClick={() => handleClick(nodeDatum)}
        onMouseEnter={evt => {
          if (nodeDatum.email) {
            setTooltip({
              visible: true,
              x: evt.clientX + 10,
              y: evt.clientY + 10,
              email: `Business Mail: ${nodeDatum.email}`,
            });
          }
        }}
        onMouseMove={evt => {
          if (tooltip.visible) {
            setTooltip(t => ({ ...t, x: evt.clientX + 10, y: evt.clientY + 10 }));
          }
        }}
        onMouseLeave={() => setTooltip({ visible: false, x: 0, y: 0, email: '' })}
        style={{
          cursor: nodeDatum.email || sectionIds.includes(nodeDatum.id)
            ? 'pointer'
            : 'default'
        }}
      >
        <rect
          x={-80}
          y={-30}
          width={160}
          height={60}
          rx={8}
          ry={8}
          fill={fill}
          stroke="#444"
          strokeWidth={1.5}
        />
        <text
          x={0}
          y={-6}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontFamily: '맑은 고딕', fontSize: 13, fontWeight: 'normal' }}
        >
          {nodeDatum.이름}
        </text>
        <text
          x={0}
          y={14}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontFamily: '맑은 고딕', fontSize: 11, fill: '#555' }}
        >
          {nodeDatum.직책}
        </text>
        {sectionIds.includes(nodeDatum.id) && (
          <text
            x={0}
            y={14}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontFamily: '맑은 고딕', fontSize: 10 }}
          >
            [{openSection === nodeDatum.id ? 'Collapse' : 'Expand'}]
          </text>
        )}
      </g>
    );
  };

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <Tree
        ref={treeRef}
        data={filteredTree}
        orientation="horizontal"
        translate={{ x: window.innerWidth / 2, y: 100 }}
        zoomable
        collapsible={false}
        pathFunc="elbow"
        renderCustomNodeElement={renderNode}
        nodeSize={{ x: 200, y: 80 }}

        {/* 수정된 separation */}
        separation={(a, b) => {
          // 형제 노드 간격만 동적 조절
          if (a.parent === b.parent && a.parent) {
            // children 배열이 없거나 길이가 0이면 최소 1로 치환
            const raw = Array.isArray(a.parent.children) ? a.parent.children.length : 1;
            const cnt = Math.max(raw, 1);
            // 1 + log(cnt) 방식 (cnt=1일 땐 1)
            return 1 + Math.log(cnt);
          }
            // 비형제 노드는 기본 간격 1
            return 1;
    }}

        styles={{ links: { stroke: '#555', strokeWidth: 1.5 } }}
      />

      {tooltip.visible && (
        <div
          style={{
            position: 'fixed',
            top: tooltip.y,
            left: tooltip.x,
            background: '#fff',
            border: '1px solid #ccc',
            padding: '4px 8px',
            borderRadius: '4px',
            pointerEvents: 'none',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {tooltip.email}
        </div>
      )}
    </div>
  );
}
