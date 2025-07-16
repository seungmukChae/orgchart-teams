import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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

  // 1) “가상 루트” 만들기: data가 배열이면 dummy root 생성
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

  // 2) 윈도우 리사이즈 시 중앙 노드 유지
  useEffect(() => {
    const handleResize = () => {
      if (treeRef.current?.centerNode) {
        // 빈 검색 시 첫 번째 루트, 아니면 단일 data.id
        const targetId = Array.isArray(data) ? data[0]?.id : data.id;
        treeRef.current.centerNode(targetId);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // 마운트 시에도 한 번 실행
    return () => window.removeEventListener('resize', handleResize);
  }, [data]);

  // 3) 노드 클릭 핸들러: 섹션 토글 or 이메일 복사
  const handleClick = useCallback((nodeDatum) => {
    if (sectionIds.includes(nodeDatum.id)) {
      setOpenSection((prev) =>
        prev === nodeDatum.id ? null : nodeDatum.id
      );
    } else if (nodeDatum.email) {
      navigator.clipboard.writeText(nodeDatum.email);
    }
  }, []);

  // 4) buildTree: 검색어 없으면 전체 렌더 + 섹션 토글만
  //    검색어 있을 땐 이름/직책/팀 match 로직
  const buildTree = useCallback(
    (node) => {
      if (!node) return null;
      const term = searchQuery.trim().toLowerCase();

      // (1) 자식 먼저 재귀
      let children = (node.children || [])
        .map(buildTree)
        .filter(Boolean);

      // ----- (2) 팀 노드면(103~199) 자식 개수 기준 내림차순 정렬 -----
      const idNum = parseInt(node.id, 10);
      if (idNum >= 103 && idNum <= 199 && children.length > 1) {
      // 팀장 등 직계 자식의 하위 전체 자손(=팀원수)을 센다
      const getTeamCount = (n) =>
        n.children && n.children.length > 0
          ? n.children.reduce((sum, c) => sum + getTeamCount(c), 0) + 1
          : 1;
      children = [...children].sort((a, b) => getTeamCount(a) - getTeamCount(b));
    }

      // (3) 검색어 없으면 항상 렌더 + 섹션 토글만
      if (!term) {
        if (sectionIds.includes(node.id)) {
          children = openSection === node.id ? children : [];
        }
        return { ...node, children };
      }

      // (4) 검색어 있을 때: 이름/직책/팀 match
      const nameMatch = node.이름
        ?.toLowerCase()
        .includes(term);
      const titleMatch = node.직책
        ?.toLowerCase()
        .includes(term);
      const teamMatch = node.팀
        ?.toLowerCase()
        .includes(term);

      if (nameMatch || titleMatch) {
        return { ...node, children };
      }
      if (teamMatch) {
        const allDesc = (node.children || [])
          .map(buildTree)
          .filter(Boolean);
        return { ...node, children: allDesc };
      }
      if (children.length) {
        return { ...node, children };
      }
      return null;
    },
    [searchQuery, openSection]
  );

  // 5) buildTree 적용 후, 가상 루트면 children만 꺼내서 Tree에 전달
  const treeData = useMemo(() => {
    const fullTree = buildTree(rootData);
    if (!fullTree) return null;
    return fullTree.id === 'root'
      ? fullTree.children
      : fullTree;
  }, [buildTree, rootData]);

  if (
    !treeData ||
    (Array.isArray(treeData) && treeData.length === 0)
  ) {
    return (
      <div style={{ padding: '2rem', color: '#888' }}>
        검색 결과가 없습니다.
      </div>
    );
  }

  // 6) 노드 커스텀 렌더러 (툴팁 포함)
  const renderNode = ({ nodeDatum }) => {
    const idNum = parseInt(nodeDatum.id, 10);
    let fill =
      idNum >= 100 && idNum <= 199
        ? '#ffa500'
        : '#e0e0e0';
    if (sectionIds.includes(nodeDatum.id)) {
      fill =
        nodeDatum.id === '100'
          ? '#007bff'
          : nodeDatum.id === '101'
          ? '#28a745'
          : '#ff9999';
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
            setTooltip((t) => ({
              ...t,
              x: evt.clientX + 10,
              y: evt.clientY + 10,
            }));
          }
        }}
        onMouseLeave={() =>
          setTooltip({
            visible: false,
            x: 0,
            y: 0,
            email: '',
          })
        }
        style={{
          cursor:
            nodeDatum.email ||
            sectionIds.includes(nodeDatum.id)
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
            style={{
              fontFamily: '맑은 고딕',
              fontSize: 10,
            }}
          >
            [
            {openSection === nodeDatum.id
              ? 'Collapse'
              : 'Expand'}
            ]
          </text>
        )}
      </g>
    );
  };

  // 7) 최종 렌더
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
            boxShadow:
              '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          {tooltip.email}
        </div>
      )}
    </div>
  );
}
