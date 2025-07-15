import React, { useState, useEffect, useRef, useCallback } from 'react';
import Tree from 'react-d3-tree';

export default function OrgChart({ data }) {
  const containerRef = useRef(null);
  const [translate, setTranslate] = useState({ x: 0, y: 100 });
  const [openSection, setOpenSection] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 섹션 루트 ID 목록 (100, 101, 102)
  const sectionIds = ['100', '101', '102'];

  // 컨테이너 리사이즈 시 중앙 정렬 계산
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const { width } = containerRef.current.getBoundingClientRect();
      setTranslate({ x: width / 2, y: 100 });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 트리 빌드: 검색 필터 + 섹션 토글 반영
  const buildTree = useCallback(
    (node) => {
      if (!node) return null;
      const term = searchQuery.trim().toLowerCase();
      const match =
        !term ||
        node.이름?.toLowerCase().includes(term) ||
        node.직책?.toLowerCase().includes(term);

      // 자식 재귀 처리
      let children = (node.children || [])
        .map(buildTree)
        .filter(Boolean);

      // 섹션이면 openSection 상태에 따라 자식 숨김/표시
      if (sectionIds.includes(node.id)) {
        children = openSection === node.id ? children : [];
      }

      // 루트(data)는 항상 렌더
      if (node === data) {
        return { ...node, children };
      }

      // 매치되거나 자식 존재 시 렌더
      if (match || children.length) {
        return { ...node, children };
      }
      return null;
    },
    [searchQuery, openSection, data]
  );

  const treeData = buildTree(data);

  // 노드 클릭: 섹션 노드만 토글
  const handleClick = (nodeDatum) => {
    if (sectionIds.includes(nodeDatum.id)) {
      setOpenSection((prev) => (prev === nodeDatum.id ? null : nodeDatum.id));
    }
  };

  // 노드 렌더링 스타일
  const baseText = {
    fontFamily: '맑은 고딕',
    fontWeight: 'normal',
    fill: '#000',
    letterSpacing: '0.5px',
  };
  const renderNode = ({ nodeDatum }) => {
    // ID 숫자 파싱
    const idNum = parseInt(nodeDatum.id, 10);
    // 100~199 범위 주황색
    let fill = (idNum >= 100 && idNum <= 199)
      ? '#ffa500'
      : '#e0e0e0';
    // 섹션 루트 색상 재정의
    if (sectionIds.includes(nodeDatum.id)) {
      fill = nodeDatum.id === '100'
        ? '#007bff'
        : nodeDatum.id === '101'
        ? '#28a745'
        : '#ff9999';
    }

    return (
      <g
        onClick={() => handleClick(nodeDatum)}
        style={{ cursor: sectionIds.includes(nodeDatum.id) ? 'pointer' : 'default' }}
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
          style={{ ...baseText, fontSize: 13 }}
        >
          {nodeDatum.이름}
        </text>
        <text
          x={0}
          y={14}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ ...baseText, fontSize: 11, fill: '#555' }}
        >
          {nodeDatum.직책}
        </text>
        {sectionIds.includes(nodeDatum.id) && (
          <text
            x={0}
            y={14}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ ...baseText, fontSize: 10 }}
          >
            [{openSection === nodeDatum.id ? 'Collapse' : 'Expand'}]
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="orgchart-container" style={{ width: '100vw', height: '100vh' }}>
      {/* 검색 UI */}
      <div style={{ padding: '1rem' }}>
        <label>
          Search:{' '}
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter a name"
          />
        </label>
      </div>

      {/* OrgChart Tree */}
      <div
        ref={containerRef}
        style={{ width: '100%', height: 'calc(100vh - 80px)' }}
      >
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
          <div style={{ padding: '2rem', color: '#888' }}>
            Sorry, we couldn’t find any results.
          </div>
        )}
      </div>
    </div>
  );
}
