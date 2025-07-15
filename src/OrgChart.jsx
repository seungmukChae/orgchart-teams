import React, { useState, useEffect, useRef, useCallback } from 'react';
import Tree from 'react-d3-tree';

export default function OrgChart({ data }) {
  const containerRef = useRef(null);
  const [translate, setTranslate] = useState({ x: 0, y: 100 });
  const [openSection, setOpenSection] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 펼치기 가능한 Section ID 목록
  const sectionIds = ['100', '101', '102'];

  // 중앙 정렬 (x만 가운데, y 고정)
  useEffect(() => {
    const updateTranslate = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setTranslate({ x: width / 2, y: 100 });
      }
    };
    updateTranslate();
    window.addEventListener('resize', updateTranslate);
    return () => window.removeEventListener('resize', updateTranslate);
  }, []);

  // 재귀 빌드: 검색+접기/펼치기 반영하여 단일 트리 생성
  const buildTree = useCallback((node) => {
    if (!node) return null;
    const term = searchQuery.trim().toLowerCase();
    const match = !term || node.이름.toLowerCase().includes(term) || node.직책.toLowerCase().includes(term);

    // 기본 children 재귀 구축
    let children = (node.children || [])
      .map(buildTree)
      .filter(Boolean);

    // Section 루트 접기/펼치기 제어
    if (sectionIds.includes(node.id)) {
      if (openSection === node.id) {
        // 펼쳐진 상태: include filtered children, 간격 조정 위해 nodeSize 조정
        children = (node.children || [])
          .map(buildTree)
          .filter(Boolean);
      } else {
        // 접힌 상태: hide children
        children = [];
      }
    }

    // 루트(data)가 항상 렌더링되도록
    if (node === data) {
      return { ...node, children };
    }

    // 필터된 결과 또는 하위가 있으면 렌더
    if (match || children.length) {
      return { ...node, children };
    }
    return null;
  }, [searchQuery, openSection, data]);

  const treeData = buildTree(data);

  // 노드 클릭 핸들러: Section 루트만 토글
  const handleClick = (nodeDatum) => {
    if (sectionIds.includes(nodeDatum.id)) {
      setOpenSection(prev => (prev === nodeDatum.id ? null : nodeDatum.id));
    }
  };

  // 노드 렌더링 스타일
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
      {/* 검색 UI */}
      <div style={{ padding: '1rem' }}>
        <label>
          검색: <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="이름 또는 직책" />
        </label>
      </div>
      {/* OrgChart Tree */}
      <div ref={containerRef} style={{ width: '100%', height: 'calc(100vh - 80px)' }}>
        {treeData ? (
          <Tree
            data={treeData}
            orientation="vertical"
            translate={translate}
            zoomable
            pathFunc="elbow"
            collapsible={false}
            renderCustomNodeElement={renderNode}
            nodeSize={{ x: openSection ? 140 : 200, y: openSection ? 60 : 100 }}
            styles={{ links: { stroke: '#555', strokeWidth: 1.5 } }}
          />
        ) : (
          <div style={{ padding: '2rem', color: '#888' }}>검색 결과 없음</div>
        )}
      </div>
    </div>
  );
}
