import React, { useState, useEffect, useRef, useCallback } from 'react';
import Tree from 'react-d3-tree';

export default function OrgChart({ data }) {
  const containerRef = useRef(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [openSection, setOpenSection] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Section 루트로 사용할 ID 목록
  const sectionIds = ['100', '101', '102'];

  // 전체 노드를 ID → 노드 맵으로 빠르게 검색하기 위한 평탄화
  const flatten = useCallback((node, map = {}) => {
    map[node.id] = node;
    (node.children || []).forEach((c) => flatten(c, map));
    return map;
  }, []);
  const nodeMap = flatten(data);

  // 컨테이너 크기가 바뀔 때나 최초 렌더링 시 트렁크를 중앙에 위치시키기
  useEffect(() => {
    const updateTranslate = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setTranslate({ x: width / 2, y: 50 });
      }
    };
    updateTranslate();
    window.addEventListener('resize', updateTranslate);
    return () => window.removeEventListener('resize', updateTranslate);
  }, []);

  // 노드 클릭: Section 루트만 열고 닫음
  const handleTrunkClick = (nodeDatum) => {
    if (sectionIds.includes(nodeDatum.id)) {
      setOpenSection((prev) => (prev === nodeDatum.id ? null : nodeDatum.id));
      console.log('노드 클릭됨:', nodeDatum);
    }
  };

  // 1) 트렁크 데이터 생성: 전체 트리 중 Section 루트까지만 펼치고, 그 아래는 collapsed 처리
  const buildTrunk = useCallback((node) => {
    // 검색 필터링
    const q = searchQuery.trim().toLowerCase();
    const match =
      !q ||
      node.이름.toLowerCase().includes(q) ||
      node.직책.toLowerCase().includes(q);

    // 자식들 재귀처리 및 필터
    const children = (node.children || [])
      .map(buildTrunk)
      .filter((c) => c != null);

    // Section 루트 아이디이면 children을 숨기거나(접힘) 표시
    if (sectionIds.includes(node.id)) {
      return {
        ...node,
        children: children.length && openSection !== node.id ? [] : children,
      };
    }

    // 그 외 일반 노드는 match  || children이 있으면 그대로 노출
    if (match || children.length > 0) {
      return { ...node, children };
    }
    return null;
  }, [openSection, searchQuery]);

  const trunkData = buildTrunk(data);

  // 2) 가로 트리용 데이터: 선택된 Section 노드 전체 subtree (검색 필터 적용)
  const buildSection = useCallback(
    (node) => {
      const q = searchQuery.trim().toLowerCase();
      const match =
        !q ||
        node.이름.toLowerCase().includes(q) ||
        node.직책.toLowerCase().includes(q);
      const children = (node.children || [])
        .map(buildSection)
        .filter((c) => c != null);
      if (match || children.length > 0) {
        return { ...node, children };
      }
      return null;
    },
    [searchQuery]
  );

  const sectionData = openSection
    ? buildSection(nodeMap[openSection])
    : null;

  // ---- UI 렌더링 ----
  const baseTextStyle = {
    fontFamily: '맑은 고딕',
    fontWeight: 'normal',
    fill: '#000',
  };

  const renderNode = ({ nodeDatum }) => {
    const isSection = sectionIds.includes(nodeDatum.id);
    // 색상
    const fill = isSection
      ? nodeDatum.id === '100'
        ? '#007bff'
        : nodeDatum.id === '101'
        ? '#28a745'
        : '#ff9999'
      : '#e0e0e0';

    return (
      <g
        onClick={() => handleTrunkClick(nodeDatum)}
        style={{ cursor: isSection ? 'pointer' : 'default' }}
      >
        <rect
          width={160}
          height={60}
          x={-80}
          y={-30}
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
          style={{ ...baseTextStyle, fontSize: 13 }}
        >
          {nodeDatum.이름}
        </text>
        <text
          x={0}
          y={14}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ ...baseTextStyle, fontSize: 11, fill: '#555' }}
        >
          {nodeDatum.직책}
        </text>
        {isSection && (
          <text
            x={0}
            y={28}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ ...baseTextStyle, fontSize: 10 }}
          >
            [{openSection === nodeDatum.id ? '접기' : '펼치기'}]
          </text>
        )}
      </g>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* 검색창 */}
      <div style={{ padding: '1rem' }}>
        <label>
          검색:{' '}
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="이름 또는 직책"
          />
        </label>
      </div>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
        }}
      >
        {/* 1) 위쪽: 세로 트렁크 */}
        {trunkData && (
          <div style={{ width: '100%', height: '50%' }}>
            <Tree
              data={trunkData}
              orientation="vertical"
              translate={translate}
              zoomable
              pathFunc="elbow"
              collapsible={false}
              renderCustomNodeElement={renderNode}
              nodeSize={{ x: 200, y: 100 }}
              styles={{
                links: { stroke: '#555', strokeWidth: 1.5 },
              }}
            />
          </div>
        )}

        {/* 2) 아래쪽: 선택된 섹션만 가로로 */}
        {sectionData && (
          <div style={{ width: '100%', height: '50%' }}>
            <Tree
              data={sectionData}
              orientation="horizontal"
              translate={{ x: 100, y: 50 }}
              zoomable
              pathFunc="elbow"
              collapsible={false}
              renderCustomNodeElement={renderNode}
              nodeSize={{ x: 200, y: 100 }}
              styles={{
                links: { stroke: '#555', strokeWidth: 1.5 },
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
