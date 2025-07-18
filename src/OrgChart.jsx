import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Tree from 'react-d3-tree';

export default function OrgChart({ data, searchQuery }) {
  const containerRef = useRef(null);
  const treeRef = useRef(null);

  const CORP_IDS = ['100', '101', '102'];
  const isCorp = (id) => CORP_IDS.includes(String(id));
  const isTeam = (id) => {
    const n = Number(id);
    return n >= 103 && n <= 199;
  };

  const [openSection, setOpenSection] = useState([]);
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    email: '',
  });

  // ⬇️⬇️⬇️⬇️⬇️ 핵심! 검색 시 경로 자동 open
  useEffect(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) {
      setOpenSection([]);  // 검색 없으면 닫힘
      return;
    }
    const ids = new Set();
    function traverse(node, parentChain = []) {
      if (!node) return;
      const idStr = String(node.id);
      const children = node.children || [];
      const teamMatch = isTeam(idStr) && node.팀?.toLowerCase().includes(term);
      const corpMatch = isCorp(idStr) && node.이름?.toLowerCase().includes(term);
      const nameMatch = node.이름?.toLowerCase().includes(term);
      const titleMatch = node.직책?.toLowerCase().includes(term);

      if (teamMatch || corpMatch || nameMatch || titleMatch) {
        parentChain.forEach(pid => ids.add(pid));
        ids.add(idStr);
      }
      children.forEach(child => traverse(child, [...parentChain, idStr]));
    }
    if (Array.isArray(data)) data.forEach(d => traverse(d));
    else traverse(data);
    setOpenSection(Array.from(ids));
  }, [searchQuery, data]);
  // ⬆️⬆️⬆️⬆️⬆️

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

  const buildTree = useCallback(
    (node) => {
      if (!node) return null;
      const idStr = String(node.id);
      const term = searchQuery.trim().toLowerCase();

      const originalChildren = node.children || [];
      let children = originalChildren.map(buildTree).filter(Boolean);

      // [A] 검색어가 없으면: 법인/팀 모두 collapse(닫힘)
      if (!term) {
        if (isCorp(idStr) || isTeam(idStr)) {
          children = openSection.includes(idStr) ? children : [];
          return { ...node, children };
        }
        return { ...node, children };
      }

      // [B] 팀명 검색 (매치되는 팀만 보여주고, 초기 상태는 collapse)
      const teamMatch = isTeam(idStr) && node.팀?.toLowerCase().includes(term);
      if (teamMatch) {
        if (!openSection.includes(idStr)) return { ...node };
        return { ...node, children };
      }

      // [C] 법인명 검색
      const corpMatch = isCorp(idStr) && node.이름?.toLowerCase().includes(term);
      if (corpMatch) {
        children = openSection.includes(idStr) ? children : [];
        return { ...node, children };
      }

      // [D] 이름/직책 검색
      const nameMatch = node.이름?.toLowerCase().includes(term);
      const titleMatch = node.직책?.toLowerCase().includes(term);

      if (nameMatch || titleMatch) {
        if ((isCorp(idStr) || isTeam(idStr)) && !openSection.includes(idStr)) {
          return { ...node };
        }
        return { ...node, children };
      }

      // [E] 하위에 매치되는 자식 있으면: collapse/expand 지원
      if (children.length) {
        if ((isCorp(idStr) || isTeam(idStr)) && !openSection.includes(idStr)) {
          return { ...node };
        }
        return { ...node, children };
      }

      return null;
    },
    [searchQuery, openSection]
  );

  const treeData = useMemo(() => {
    const fullTree = buildTree(rootData);
    if (!fullTree) return null;
    return fullTree.id === 'root' ? fullTree.children : fullTree;
  }, [buildTree, rootData]);

  if (!treeData || (Array.isArray(treeData) && treeData.length === 0)) {
    return (
      <div style={{ padding: '2rem', color: '#888' }}>
        Sorry, we couldn’t find any results.
      </div>
    );
  }

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
            fontWeight: 'normal',
          }}
        >
          {nodeDatum.직책}
        </text>
        {isSection && (
          <text
            x={0}
            y={12}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontFamily: '맑은 고딕', fontSize: 10, fontWeight: 'normal', }}
          >
            [{openSection.includes(idStr) ? 'Collapse' : 'Expand'}]
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
