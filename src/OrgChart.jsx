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

  // 법인/팀 ID
  const corpIds = ['100', '101', '102'];
  const teamIds = Array.from({ length: 199 - 103 + 1 }, (_, i) => String(103 + i));

  // 팀/법인 구분 헬퍼
  const isCorp = (id) => corpIds.includes(String(id));
  const isTeam = (id) => teamIds.includes(String(id));

  // 노드 클릭(팀/법인: 펼치기, 그 외: 이메일 복사)
  const handleClick = useCallback((nodeDatum) => {
    if (isTeam(nodeDatum.id) || isCorp(nodeDatum.id)) {
      setOpenSection((prev) => (prev === nodeDatum.id ? null : nodeDatum.id));
    } else if (nodeDatum.email) {
      navigator.clipboard.writeText(nodeDatum.email);
    }
  }, []);

  // 항상 배열로 변환(루트가 여러 개일 때)
  const rootArray = useMemo(() => (Array.isArray(data) ? data : data ? [data] : []), [data]);

  // 트리 빌드 (팀 노드만 펼쳐지게)
  const buildTree = useCallback((node) => {
    if (!node) return null;
    const idStr = String(node.id);
    const term = searchQuery.trim().toLowerCase();

    // [검색어 없을 때] 팀/법인 노드는 openSection 일치 시에만 자식 펼침
    if (!term && (isTeam(idStr) || isCorp(idStr))) {
      const children = openSection === idStr ? (node.children || []).map(buildTree).filter(x => x !== null && x !== undefined) : [];
      return { ...node, children };
    }

    // [검색어 있을 때] 기존 검색 로직 유지
    const nameMatch = node.이름?.toLowerCase().includes(term);
    const titleMatch = node.직책?.toLowerCase().includes(term);
    const teamMatch = node.팀?.toLowerCase().includes(term);

    // 매치 시 전체 자식 유지
    let children = (node.children || []).map(buildTree).filter(Boolean);
    if (!term) return { ...node, children };

    if (nameMatch || titleMatch) return { ...node, children };
    if (teamMatch) {
      // 팀명으로 검색: 자식 전체
      const allDesc = (node.children || []).map(buildTree).filter(Boolean);
      return { ...node, children: allDesc };
    }
    if (children.length) return { ...node, children };
    if (isTeam(idStr) || isCorp(idStr)) return { ...node, children: [] };
    return null;
  }, [searchQuery, openSection]);

  // 트리 데이터 변환
  const filteredRoots = useMemo(() => {
    if (!rootArray.length) return [];
    return rootArray.map(buildTree).filter(Boolean);
  }, [rootArray, buildTree]);

  // 에러 방지
  if (!filteredRoots.length) {
    return <div style={{ padding: '2rem', color: '#888' }}>검색 결과가 없습니다.</div>;
  }

  // 커스텀 노드 렌더러
  const renderNode = ({ nodeDatum }) => {
    const idStr = String(nodeDatum.id);
    let fill = isTeam(idStr) ? '#ffa500' : '#e0e0e0';
    if (isCorp(idStr)) {
      fill = idStr === '100' ? '#007bff' : idStr === '101' ? '#28a745' : '#ff9999';
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
            nodeDatum.email || isTeam(idStr) || isCorp(idStr)
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
        {(isTeam(idStr) || isCorp(idStr)) && (
          <text
            x={0}
            y={14}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontFamily: '맑은 고딕', fontSize: 10 }}
          >
            [{openSection === idStr ? 'Collapse' : 'Expand'}]
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
        separation={{ siblings: 1, nonSiblings: 1 }}
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
