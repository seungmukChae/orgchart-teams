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

  // 법인/팀 id helpers
  const corpIds = ['100', '101', '102'];
  const teamIds = Array.from({ length: 199 - 103 + 1 }, (_, i) => String(103 + i));
  const isCorp = (id) => corpIds.includes(String(id));
  const isTeam = (id) => teamIds.includes(String(id));

  // 항상 배열로
  const rootArray = useMemo(() => (Array.isArray(data) ? data : data ? [data] : []), [data]);

  // 클릭 핸들러
  const handleClick = useCallback((nodeDatum) => {
    if (isTeam(nodeDatum.id) || isCorp(nodeDatum.id)) {
      setOpenSection((prev) => (prev === nodeDatum.id ? null : nodeDatum.id));
    } else if (nodeDatum.email) {
      navigator.clipboard.writeText(nodeDatum.email);
    }
  }, []);

  // 트리 빌드 (검색, 섹션토글)
  const buildTree = useCallback(
    (node, parentMatched = false) => {
      if (!node) return null;
      const idStr = String(node.id);
      const term = searchQuery.trim().toLowerCase();

      // 1. 검색어 없을 때: 팀/법인은 펼치기, 나머지는 그냥
      if (!term) {
        if (isTeam(idStr) || isCorp(idStr)) {
          const children = openSection === idStr
            ? (node.children || []).map(child => buildTree(child)).filter(Boolean)
            : [];
          return { ...node, children };
        }
        // 직원은 그냥 children 표시
        let children = (node.children || []).map(child => buildTree(child)).filter(Boolean);
        return { ...node, children };
      }

      // 2. 검색 시: 팀/법인 노드의 상위 경로만 남김(경로 보이기)
      const nameMatch = node.이름?.toLowerCase().includes(term);
      const titleMatch = node.직책?.toLowerCase().includes(term);
      const teamMatch = node.팀?.toLowerCase().includes(term);

      const matched = nameMatch || titleMatch || teamMatch;
      // 만약 자식에서 매칭이 되면 부모~팀 경로만 남겨야 함
      let children = (node.children || []).map(child => buildTree(child, matched || parentMatched)).filter(Boolean);

      // 팀/법인일 때 검색어가 직접 매치: 자식까지 다 남김
      if ((isTeam(idStr) || isCorp(idStr)) && matched) {
        return { ...node, children: (node.children || []).map(child => buildTree(child, true)).filter(Boolean) };
      }
      // 자식이 경로상 매치(하위에서 매치): 상위만 표시
      if (children.length) {
        // 팀/법인인 경우에만 자식 보여주기
        if (isTeam(idStr) || isCorp(idStr)) {
          return { ...node, children };
        }
        // 직원 등은 경로만 남김 (children 반환)
        return { ...node, children };
      }
      // 직접 매치, 경로 매치 없으면 제외
      return null;
    },
    [searchQuery, openSection]
  );

  // 트리 적용
  const filteredRoots = useMemo(() => {
    if (!rootArray.length) return [];
    return rootArray.map(node => buildTree(node)).filter(Boolean);
  }, [rootArray, buildTree]);

  // 렌더러
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

  // 결과 없으면 안내
  if (!filteredRoots.length) {
    return <div style={{ padding: '2rem', color: '#888' }}>검색 결과가 없습니다.</div>;
  }

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
