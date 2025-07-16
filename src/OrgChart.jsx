import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo
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

  // data를 무조건 배열로 통일
  const rawNodes = useMemo(() => (Array.isArray(data) ? data : [data]), [
    data,
  ]);

  // 가상 루트(dummyRoot) 생성
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

  // 윈도우 리사이즈 시 중앙 노드 유지
  useEffect(() => {
    const handleResize = () => {
      if (treeRef.current?.centerNode) {
        const firstId = rawNodes[0]?.id;
        if (firstId) treeRef.current.centerNode(firstId);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [rawNodes]);

  // 노드 클릭: 섹션 토글 OR 이메일 복사
  const handleClick = useCallback((node) => {
    if (sectionIds.includes(node.id)) {
      setOpenSection((prev) => (prev === node.id ? null : node.id));
    } else if (node.email) {
      navigator.clipboard.writeText(node.email);
    }
  }, []);

  // 재귀로 트리 필터링 + 검색 로직
  const buildTree = useCallback(
    (node) => {
      if (!node) return null;
      const term = searchQuery.trim().toLowerCase();

      let children = (node.children || []).map(buildTree).filter(Boolean);

      if (!term) {
        if (sectionIds.includes(node.id)) {
          children = openSection === node.id ? children : [];
        }
        return { ...node, children };
      }

      const nameMatch = node.이름?.toLowerCase().includes(term);
      const titleMatch = node.직책?.toLowerCase().includes(term);
      const teamMatch = node.팀?.toLowerCase().includes(term);

      if (nameMatch || titleMatch) {
        return { ...node, children };
      }
      if (teamMatch) {
        const allDesc = (node.children || []).map(buildTree).filter(Boolean);
        return { ...node, children: allDesc };
      }
      if (children.length) {
        return { ...node, children };
      }
      return null;
    },
    [searchQuery, openSection]
  );

  // 가상 루트에 buildTree ▶ 실제 루트 배열만 꺼내기
  const treeData = useMemo(() => {
    const full = buildTree(dummyRoot);
    return full ? full.children : null;
  }, [buildTree, dummyRoot]);

  if (!treeData || treeData.length === 0) {
    return (
      <div style={{ padding: '2rem', color: '#888' }}>
        검색 결과가 없습니다.
      </div>
    );
  }

  // 커스텀 노드 렌더러 (툴팁 포함)
  const renderNode = ({ nodeDatum }) => {
    const idNum = parseInt(nodeDatum.id, 10);
    let fill = idNum >= 100 && idNum <= 199 ? '#ffa500' : '#e0e0e0';
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
          setTooltip({ visible: false, x: 0, y: 0, email: '' })
        }
        style={{
          cursor:
            nodeDatum.email || sectionIds.includes(nodeDatum.id)
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
            style={{ fontFamily: '맑은 고딕', fontSize: 10 }}
          >
            [{openSection === nodeDatum.id ? 'Collapse' : 'Expand'}]
          </text>
        )}
      </g>
    );
  };

  // 최종 Tree 렌더
  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <Tree
        ref={treeRef}
        data={treeData}
        orientation="horizontal"
        translate={{ x: window.innerWidth / 2, y: 100 }}
        zoomable
        collapsible={false}
        pathFunc="elbow"
        renderCustomNodeElement={renderNode}
        nodeSize={{ x: 200, y: 80 }}
        separation={(a, b) => {
          // a.depth===1 에서만 siblings 기준 spacing
          if (a.depth === 1 && b.depth === 1 && a.parent) {
            const siblingCount = a.parent.children?.length || 0;
            return 1 + siblingCount / 3;
          }
          return 1;
        }}
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
