import React, { useState, useEffect, useRef, useCallback } from 'react';
import Tree from 'react-d3-tree';

export default function OrgChart({ data }) {
  const containerRef = useRef(null);
  const [translate, setTranslate] = useState({ x: 0, y: 50 });
  const [openSection, setOpenSection] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Section 루트 ID 목록
  const sectionIds = ['100', '101', '102'];

  // flatten map for quick lookup
  const flatten = useCallback((node, map = {}) => {
    map[node.id] = node;
    (node.children || []).forEach(c => flatten(c, map));
    return map;
  }, []);
  const nodeMap = flatten(data);

  // 중앙 정렬 계산
  useEffect(() => {
    const updateTranslate = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setTranslate({ x: width / 2, y: 50 });
      }
    };
    updateTranslate();
    window.addEventListener('resize', updateTranslate);
    return () => window.removeEventListener('resize', updateTranslate);
  }, []);

  // 트렁크용 데이터 생성 (세로)
  const buildTrunk = useCallback((node) => {
    const term = searchQuery.toLowerCase().trim();
    const match = !term || node.이름.toLowerCase().includes(term) || node.직책.toLowerCase().includes(term);
    // 자식 처리
    let children = (node.children || [])
      .map(buildTrunk)
      .filter(Boolean);
    // Section 레벨까지만 노출, 그 아래는 숨김
    if (sectionIds.includes(node.id)) {
      return { ...node, children: [] };
    }
    if (match || children.length) {
      return { ...node, children };
    }
    return null;
  }, [searchQuery]);

  const trunkData = buildTrunk(data);

  // Section용 데이터 생성 (가로)
  const buildSection = useCallback((node) => {
    const term = searchQuery.toLowerCase().trim();
    const match = !term || node.이름.toLowerCase().includes(term) || node.직책.toLowerCase().includes(term);
    const children = (node.children || [])
      .map(buildSection)
      .filter(Boolean);
    if (match || children.length) {
      return { ...node, children };
    }
    return null;
  }, [searchQuery]);

  const sectionData = openSection ? buildSection(nodeMap[openSection]) : null;

  // Section 클릭
  const onTrunkClick = (nodeDatum) => {
    if (sectionIds.includes(nodeDatum.id)) {
      setOpenSection(prev => (prev === nodeDatum.id ? null : nodeDatum.id));
    }
  };

  const baseText = { fontFamily: '맑은 고딕', fontWeight: 'normal', fill: '#000' };
  const renderNode = ({ nodeDatum }) => {
    const isSection = sectionIds.includes(nodeDatum.id);
    const fill = isSection
      ? nodeDatum.id === '100' ? '#007bff' : nodeDatum.id === '101' ? '#28a745' : '#ff9999'
      : '#e0e0e0';
    return (
      <g onClick={() => isSection && onTrunkClick(nodeDatum)}
         style={{ cursor: isSection ? 'pointer' : 'default' }}>
        <rect x={-80} y={-30} width={160} height={60} rx={8} ry={8}
              fill={fill} stroke="#444" strokeWidth={1.5} />
        <text x={0} y={-6} textAnchor="middle" dominantBaseline="middle"
              style={{ ...baseText, fontSize: 13 }}>{nodeDatum.이름}</text>
        <text x={0} y={14} textAnchor="middle" dominantBaseline="middle"
              style={{ ...baseText, fontSize: 11, fill: '#555' }}>{nodeDatum.직책}</text>
        {isSection && (
          <text x={0} y={28} textAnchor="middle" dominantBaseline="middle"
                style={{ ...baseText, fontSize: 10 }}>
            [{openSection === nodeDatum.id ? '접기' : '펼치기'}]
          </text>)}
      </g>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ padding: '1rem' }}>
        <label>검색: <input value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                              placeholder="이름 또는 직책" /></label>
      </div>
      <div ref={containerRef} style={{ flex: 1, position: 'relative' }}>
        {trunkData && (
          <div style={{ width: '100%', height: '50%' }}>
            <Tree data={trunkData}
                  orientation="vertical"
                  translate={translate}
                  zoomable
                  collapsible={false}
                  pathFunc="elbow"
                  renderCustomNodeElement={renderNode}
                  nodeSize={{ x: 200, y: 100 }}
                  styles={{ links: { stroke: '#555', strokeWidth: 1.5 } }} />
          </div>
        )}
        {sectionData && (
          <div style={{ width: '100%', height: '50%' }}>
            <Tree data={sectionData}
                  orientation="horizontal"
                  translate={{ x: 100, y: 50 }}
                  zoomable
                  collapsible={false}
                  pathFunc="elbow"
                  renderCustomNodeElement={renderNode}
                  nodeSize={{ x: 200, y: 100 }}
                  styles={{ links: { stroke: '#555', strokeWidth: 1.5 } }} />
          </div>
        )}
      </div>
    </div>
  );
}
