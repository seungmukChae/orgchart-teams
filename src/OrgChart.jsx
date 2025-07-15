import React, { useState, useEffect, useRef, useCallback } from 'react';
import Tree from 'react-d3-tree';

export default function OrgChart({ data }) {
  const containerRef = useRef(null);
  const [translate, setTranslate] = useState({ x: 50, y: 0 });
  const [openSection, setOpenSection] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const sectionIds = ['100', '101', '102'];

  // 검색 + 접기/펼치기 중첩 빌드
  const buildTree = useCallback((node) => {
    if (!node) return null;
    const term = searchQuery.trim().toLowerCase();
    const match = !term || node.이름.toLowerCase().includes(term) || node.직책.toLowerCase().includes(term);

    let children = (node.children || [])
      .map(buildTree)
      .filter(Boolean);

    // Section toggle: children hidden or shown
    if (sectionIds.includes(node.id)) {
      children = openSection === node.id
        ? (node.children || []).map(buildTree).filter(Boolean)
        : [];
    }

    // Always include root
    if (node === data) {
      return { ...node, children };
    }

    if (match || children.length) {
      return { ...node, children };
    }
    return null;
  }, [searchQuery, openSection, data]);

  const treeData = buildTree(data);

  // 중앙 정렬: y축 가운데, x 고정 좌측
  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return;
      const { height } = containerRef.current.getBoundingClientRect();
      setTranslate({ x: 50, y: height / 2 });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const handleClick = (node) => {
    if (sectionIds.includes(node.id)) {
      setOpenSection(prev => prev === node.id ? null : node.id);
    }
  };

  const baseText = { fontFamily: '맑은 고딕', fontWeight: 'normal', fill: '#000', letterSpacing: '0.5px' };
  const renderNode = ({ nodeDatum }) => {
    const isSection = sectionIds.includes(nodeDatum.id);
    const fill = isSection
      ? nodeDatum.id === '100' ? '#007bff'
      : nodeDatum.id === '101' ? '#28a745'
      : '#ff9999'
      : '#e0e0e0';
    return (
      <g onClick={() => handleClick(nodeDatum)} style={{ cursor: isSection ? 'pointer' : 'default' }}>
        <rect x={-80} y={-30} width={160} height={60} rx={8} ry={8} fill={fill} stroke="#444" strokeWidth={1.5} />
        <text x={0} y={-6} textAnchor="middle" dominantBaseline="middle" style={{ ...baseText, fontSize: 13 }}>
          {nodeDatum.이름}
        </text>
        <text x={0} y={14} textAnchor="middle" dominantBaseline="middle" style={{ ...baseText, fontSize: 11, fill: '#555' }}>
          {nodeDatum.직책}
        </text>
        {isSection && (
          <text x={0} y={28} textAnchor="middle" dominantBaseline="middle" style={{ ...baseText, fontSize: 10 }}>
            [{openSection === nodeDatum.id ? '접기' : '펼치기'}]
          </text>
        )}
      </g>
    );
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <div style={{ padding: '1rem' }}>
        <label>검색: <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="이름 또는 직책" /></label>
      </div>
      <div ref={containerRef} style={{ width: '100%', height: 'calc(100vh - 80px)' }}>
        {treeData ? (
          <Tree
            data={treeData}
            orientation="horizontal"
            translate={translate}
            zoomable
            collapsible={false}
            pathFunc="elbow"
            renderCustomNodeElement={renderNode}
            nodeSize={{ x: 200, y: 80 }}
            separation={{ siblings: 1, nonSiblings: 1 }}
            styles={{ links: { stroke: '#555', strokeWidth: 1.5 } }}
          />
        ) : (
          <div style={{ padding: '2rem', color: '#888' }}>검색 결과 없음</div>
        )}
      </div>
    </div>
  );
}
