import React, { useState, useRef, useCallback, useMemo } from 'react';
import Tree from 'react-d3-tree';

export default function OrgChart({ data, searchQuery }) {
  const containerRef = useRef(null);
  const treeRef = useRef(null);
  const [openSection, setOpenSection] = useState(null);
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    email: '',
  });
  const sectionIds = ['100', '101', '102'];

  // 노드 클릭(섹션 토글, 이메일 복사)
  const handleClick = useCallback((nodeDatum) => {
    if (sectionIds.includes(nodeDatum.id)) {
      setOpenSection((prev) => (prev === nodeDatum.id ? null : nodeDatum.id));
    } else if (nodeDatum.email) {
      navigator.clipboard.writeText(nodeDatum.email);
    }
  }, []);

  // 데이터 → 항상 배열 형태로 변환
  const rootArray = useMemo(() => (Array.isArray(data) ? data : data ? [data] : []), [data]);

  // buildTree: 검색/정렬/섹션 토글 반영
  const buildTree = useCallback((node) => {
    if (!node) return null;
    const term = searchQuery.trim().toLowerCase();

    let children = (node.children || []).map(buildTree).filter(Boolean);

    // === [추가] 팀/법인 정렬 ===
    const idNum = Number(node.id);
    // 팀 노드: 103~199
    if (idNum >= 103 && idNum <= 199) {
      children = children.sort((a, b) => (a.이름 || '').localeCompare(b.이름 || ''));
    }
    // 법인 노드: 100~102
    if (sectionIds.includes(node.id)) {
      children = children.sort((a, b) => (b.children?.length || 0) - (a.children?.length || 0));
    }

    // === 검색/토글 기존 로직 ===
    if (!term) {
      if (sectionIds.includes(node.id)) {
        children = openSection === node.id ? children : [];
      }
      return { ...node, children };
    }
    const nameMatch = node.이름?.toLowerCase().includes(term);
    const titleMatch = node.직책?.toLowerCase().includes(term);
    const teamMatch = node.팀?.toLowerCase().includes(term);

    if (nameMatch || titleMatch) return { ...node, children };
    if (teamMatch) {
      const allDesc = (node.children || []).map(buildTree).filter(Boolean);
      return { ...node, children: allDesc };
    }
    if (children.length) return { ...node, children };
    return null;
  }, [searchQuery, openSection, sectionIds]);

  // 트리 데이터(검색 반영)
  const filteredRoots = useMemo(() => {
    if (!rootArray.length) return [];
    return rootArray.map(buildTree).filter(Boolean);
  }, [rootArray, buildTree]);

  if (!filteredRoots.length) {
    return <div style={{ padding: '2rem', color: '#888' }}>검색 결과가 없습니다.</div>;
  }

  // 커스텀 노드 렌더러
  const renderNode = ({ nodeDatum }) => {
    const idNum = parseInt(nodeDatum.id, 10);
    let fill = idNum >= 100 && idNum <= 199 ? '#ffa500' : '#e0e0e0';
    if (sectionIds.includes(nodeDatum.id)) {
      fill = nodeDatum.id === '100' ? '#007bff' : nodeDatum.id === '101' ? '#28a745' : '#ff9999';
    }
    return (
      <g
        onClick={() => handleClick(nodeDatum)}
        onMouseEnter={(evt) => {
          if (nodeDatum.email) {
            setTooltip({
              visible: true,
              x: evt.clientX + 10,
              y: evt.clientY + 10,
              email: `Business Mail: ${nodeDatum.email}`,
            });
          }
        }}
        onMouseMove={(evt) => {
          if (tooltip.visible) {
            setTooltip((t) => ({ ...t, x: evt.clientX + 10, y: evt.clientY + 10 }));
          }
        }}
        onMouseLeave={() => setTooltip({ visible: false, x: 0, y: 0, email: '' })}
        style={{
          cursor:
            nodeDatum.email || sectionIds.includes(nodeDatum.id)
              ? 'pointer'
              : 'default',
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
          style={{
            fontFamily: '맑은 고딕',
            fontSize: 13,
            fontWeight: 'normal',
          }}
        >
          {nodeDatum.이름}
        </text>
        <text
          x={0}
          y={14}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontFamily: '맑은 고딕',
            fontSize: 11,
            fill: '#555',
          }}
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
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Tree
        ref={treeRef}
        data={filteredRoots}
        orientation="horizontal"
        translate={{ x: window.innerWidth / 2, y: 100 }}
        zoomable
        collapsible={false}
        pathFunc="elbow"
        renderCustomNodeElement={renderNode}
        nodeSize={{ x: 200, y: 80 }}
        separation={(a, b) => {
          const siblingCount = Array.isArray(a.parent?.children)
            ? a.parent.children.length
            : 0;
          if (a.depth === 1 && b.depth === 1 && siblingCount > 0) {
            const sep = 1 + siblingCount / 3;
            return Math.max(1, Math.min(4, sep)); // 1~4 사이
          }
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
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          {tooltip.email}
        </div>
      )}
    </div>
  );
}
