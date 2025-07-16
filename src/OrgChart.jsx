import React, { 
  useState, useEffect, useRef, 
  useCallback, useMemo 
} from 'react';
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

  // 1) data를 무조건 배열로 통일
  const rawNodes = useMemo(
    () => (Array.isArray(data) ? data : [data]),
    [data]
  );

  // 2) 가상 루트(dummyRoot) 생성
  const dummyRoot = useMemo(
    () => ({
      id: 'root',
      이름: '',
      직책: '',
      팀: '',
      email: '',
      children: rawNodes,
    }),
    [rawNodes]
  );

  // 3) 리사이즈 시 현재 중앙 노드 유지
  useEffect(() => {
    const handleResize = () => {
      if (treeRef.current?.centerNode) {
        // 첫 번째 실제 루트로 포커스
        const firstId = rawNodes[0]?.id;
        if (firstId) treeRef.current.centerNode(firstId);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [rawNodes]);

  // 4) 노드 클릭: 섹션 토글 OR 이메일 복사
  const handleClick = useCallback((node) => {
    if (sectionIds.includes(node.id)) {
      setOpenSection((prev) =>
        prev === node.id ? null : node.id
      );
    } else if (node.email) {
      navigator.clipboard.writeText(node.email);
    }
  }, []);

  // 5) 재귀로 트리 필터링 + 검색 로직
  const buildTree = useCallback(
    (node) => {
      if (!node) return null;
      const term = searchQuery.trim().toLowerCase();

      // (1) 자식부터 재귀
      let children = (node.children || [])
        .map(buildTree)
        .filter(Boolean);

      // (2) 검색어 없으면 “항상 렌더 + 섹션만 토글”
      if (!term) {
        if (sectionIds.includes(node.id)) {
          children =
            openSection === node.id ? children : [];
        }
        return { ...node, children };
      }

      // (3) 검색어 있을 때: 이름/직책/팀 match
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
        // 팀 매치 시 해당 노드의 전체 자손 렌더
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

  // 6) 가상 루트에 buildTree ▶︎ 실제 루트 배열만 꺼내기
  const treeData = useMemo(() => {
    const full = buildTree(dummyRoot);
    if (!full) return null;
    return full.children; // dummyRoot.children ⇒ 실제 루트들
  }, [buildTree, dummyRoot]);

  if (!treeData || treeData.length === 0) {
    return (
      <div style={{ padding: '2rem', color: '#888' }}>
        검색 결과가 없습니다.
      </div>
    );
  }

  // 7) 커스텀 노드 렌더러 (툴팁 포함)
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
            [{openSection === nodeDatum.id ? 'Collapse' : 'Expand'}]
          </text>
        )}
      </g>
    );
  };

  // 8) 최종 Tree 렌더
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
        separation={(a, b) => {
          // 같은 부모(형제)일 때만 동적 간격
          
  // 1) a.parent가 있고, 그 부모가 '팀 루트' 레벨(예: sectionIds에 포함된 id)일 때만 동적 spacing
  const pd = a.parent && a.parent.data;
  if (pd && sectionIds.includes(pd.id)) {
    // D3 hierarchy의 children 배열
    const sibs = Array.isArray(a.parent.children)
      ? a.parent.children.filter(Boolean)
      : [];
    const count = Math.max(sibs.length, 1);      // 항상 최소 1
    const spacing = 1 + Math.log(count);         // 원하는 스케일
    return Number.isFinite(spacing) ? spacing : 1;
  }
  // 그 외에는 절대 NaN이 나올 일이 없도록 기본 간격 1
  return 1;
        }}
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

