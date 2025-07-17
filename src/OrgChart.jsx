import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Tree, { MiniMap } from 'react-d3-tree';

export default function OrgChart({ data, searchQuery }) {
  const containerRef = useRef(null);
  const treeRef = useRef(null);
  const [openSection, setOpenSection] = useState([]);
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    email: '',
  });

  // 법인/팀 헬퍼
  const isCorp = (id) => ['100', '101', '102'].includes(String(id));
  const isTeam = (id) => {
    const n = Number(id);
    return n >= 103 && n <= 199;
  };

  // 가상 루트
  const rootData = useMemo(() => {
    if (Array.isArray(data)) {
      return {
        id: 'root',
        이름: '',
        직책: '',
        팀: '',
        email: '',
        children: data,
      };
    }
    return data;
  }, [data]);

  // 미니맵 및 트리 중앙 정렬
  useEffect(() => {
    const handleResize = () => {
      if (treeRef.current?.centerNode) {
        const targetId = Array.isArray(data) ? data[0]?.id : data?.id;
        if (targetId) treeRef.current.centerNode(targetId);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [data]);

  // ---- 팀명 검색시 자동 Open 기능 ----
  const [autoExpandTeam, setAutoExpandTeam] = useState(null);

  useEffect(() => {
    const teamIds = [];
    const term = searchQuery.trim().toLowerCase();
    if (!term) {
      setAutoExpandTeam(null);
      return;
    }
    function findTeamId(node) {
      if (!node) return;
      if (
        isTeam(node.id) &&
        node.팀 &&
        node.팀.toLowerCase().includes(term)
      ) {
        teamIds.push(String(node.id));
      }
      (node.children || []).forEach(findTeamId);
    }
    if (Array.isArray(data)) data.forEach(findTeamId);
    else findTeamId(data);

    setAutoExpandTeam(teamIds.length ? teamIds : null);
  }, [searchQuery, data]);

  const openSectionAll = useMemo(() => {
    if (autoExpandTeam && autoExpandTeam.length) return autoExpandTeam;
    return openSection;
  }, [autoExpandTeam, openSection]);

  // 클릭 핸들러
  const handleClick = useCallback((nodeDatum) => {
    const idStr = String(nodeDatum.id);
    if (isTeam(idStr) || isCorp(idStr)) {
      setOpenSection((prev) =>
        prev.includes(idStr)
          ? prev.filter((id) => id !== idStr)
          : [...prev, idStr]
      );
    } else if (nodeDatum.email) {
      navigator.clipboard.writeText(nodeDatum.email);
    }
  }, []);

  // 트리 빌드
  const buildTree = useCallback(
    (node) => {
      if (!node) return null;
      const idStr = String(node.id);
      const term = searchQuery.trim().toLowerCase();

      let children = (node.children || []).map(buildTree).filter(Boolean);

      if (!term) {
        if (isCorp(idStr) || isTeam(idStr)) {
          children = openSectionAll.includes(idStr) ? children : [];
          return { ...node, children };
        }
        return { ...node, children };
      }

      const nameMatch = node.이름?.toLowerCase().includes(term);
      const titleMatch = node.직책?.toLowerCase().includes(term);
      const teamMatch = node.팀?.toLowerCase().includes(term);

      if (teamMatch && isTeam(idStr)) {
        return { ...node, children: (node.children || []).map(buildTree).filter(Boolean) };
      }
      if (nameMatch || titleMatch) return { ...node, children };
      if (children.length) return { ...node, children };
      return null;
    },
    [searchQuery, openSectionAll]
  );

  // 트리 데이터
  const treeData = useMemo(() => {
    const fullTree = buildTree(rootData);
    if (!fullTree) return null;
    return fullTree.id === 'root' ? fullTree.children : fullTree;
  }, [buildTree, rootData]);

  if (!treeData || (Array.isArray(treeData) && treeData.length === 0)) {
    return (
      <div style={{ padding: '2rem', color: '#888' }}>
        검색 결과가 없습니다.
      </div>
    );
  }

  // 커스텀 노드 렌더러
  const renderNode = ({ nodeDatum }) => {
    const idStr = String(nodeDatum.id);
    let fill =
      isCorp(idStr) ? (
        idStr === '100' ? '#007bff' :
        idStr === '101' ? '#28a745' :
        '#ff9999'
      ) : isTeam(idStr)
        ? '#ffa500'
        : '#e0e0e0';

    const isSection = isCorp(idStr) || isTeam(idStr);

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
            setTooltip((t) => ({
              ...t,
              x: evt.clientX + 10,
              y: evt.clientY + 10,
            }));
          }
        }}
        onMouseLeave={() =>
          setTooltip({ visible: false, x: 0, y: 0, email: '' })
        }
        style={{
          cursor: nodeDatum.email || isSection ? 'pointer' : 'default',
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
        {isSection && (
          <text
            x={0}
            y={24}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontFamily: '맑은 고딕', fontSize: 10 }}
          >
            [{openSectionAll.includes(idStr) ? 'Collapse' : 'Expand'}]
          </text>
        )}
      </g>
    );
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
    >
      <Tree
        ref={treeRef}
        data={treeData}
        orientation="horizontal"
        translate={{
          x: window.innerWidth / 2,
          y: 100,
        }}
        zoomable
        collapsible={false}
        pathFunc="elbow"
        renderCustomNodeElement={renderNode}
        nodeSize={{ x: 200, y: 80 }}
        separation={{ siblings: 1, nonSiblings: 1 }}
        styles={{
          links: { stroke: '#555', strokeWidth: 1.5 },
        }}
      >
        {/* 미니맵 적용! */}
        <MiniMap
          position="bottom-right"
          nodeStroke="#333"
          nodeFill="#eee"
          nodeRadius={7}
          highlight="viewport"
          width={200}
          height={120}
        />
      </Tree>

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
