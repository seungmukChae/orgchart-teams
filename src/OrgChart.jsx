import { useState, useEffect, useRef } from 'react';
import Tree from 'react-d3-tree';

export default function OrgChart({ data }) {
  const containerRef = useRef(null);
  const [translate, setTranslate] = useState({ x: 0, y: 100 }); // 초기 y offset 고정
  const [openIds, setOpenIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [treeData, setTreeData] = useState(null);

  // 접기/펼치기 가능한 섹션 ID
  const collapsibleIds = ['100', '101', '102'];

  // 화면 크기 및 중앙 정렬 (x축만 중앙)
  const updateTranslate = () => {
    if (!containerRef.current) return;
    const { width } = containerRef.current.getBoundingClientRect();
    setTranslate({ x: width / 2, y: 100 });
  };

  useEffect(() => {
    updateTranslate();
    window.addEventListener('resize', updateTranslate);
    return () => window.removeEventListener('resize', updateTranslate);
  }, []);

  // 노드 토글 핸들러
  const toggleSection = (id) => {
    setOpenIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // 검색 필터 재귀
  const filterTree = (node) => {
    if (!node) return null;
    const term = searchQuery.trim().toLowerCase();
    const match =
      !term ||
      node.이름?.toLowerCase().includes(term) ||
      node.직책?.toLowerCase().includes(term);
    const filteredChildren = (node.children || [])
      .map(child => filterTree(child))
      .filter(Boolean);
    if (match || filteredChildren.length) {
      return { ...node, children: filteredChildren };
    }
    return null;
  };

  // 트리 빌드: openIds에 따라 하위 노드 포함 여부
  const buildTree = (node) => {
    if (!node) return null;
    let children = node.children || [];
    if (collapsibleIds.includes(node.id) && !openIds.includes(node.id)) {
      children = [];
    }
    return { ...node, children: children.map(buildTree) };
  };

  // 데이터/검색/openIds 변화 시 트리 업데이트
  useEffect(() => {
    if (!data) return;
    const filtered = filterTree(data);
    const built = buildTree(filtered);
    setTreeData(built);
  $1

  // 트리 데이터 변경 시 translate 재계산
  useEffect(() => {
    updateTranslate();
  }, [treeData, searchQuery]);

  // 노드 색상
  const getColor = (id) => {
    if (id === '100') return '#007bff';
    if (id === '101') return '#28a745';
    if (id === '102') return '#ff9999';
    return '#e0e0e0';
  };

  // 커스텀 노드 렌더링
  const renderNode = ({ nodeDatum }) => {
    const isSection = collapsibleIds.includes(nodeDatum.id);
    const isOpen = openIds.includes(nodeDatum.id);
    const w = 160, h = 60;
    const fill = getColor(nodeDatum.id);
    const textStyle = {
      fontFamily: '맑은 고딕',
      fontWeight: 'normal',
      letterSpacing: '0.5px',
      fill: '#000',
    };

    return (
      <g
        onClick={() => isSection && toggleSection(nodeDatum.id)}
        style={{ cursor: isSection ? 'pointer' : 'default' }}
      >
        <rect
          x={-w/2} y={-h/2}
          width={w} height={h}
          rx={8} ry={8}
          fill={fill}
          stroke="#444"
          strokeWidth={1.5}
        />
        <text
          x={0} y={-8}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ ...textStyle, fontSize: 13 }}
        >
          {nodeDatum.이름}
        </text>
        <text
          x={0} y={12}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ ...textStyle, fontSize: 11, fill: '#555' }}
        >
          {nodeDatum.직책}
        </text>
        {isSection && (
          <text
            x={0} y={28}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ ...textStyle, fontSize: 10 }}
          >
            [{isOpen ? '접기' : '펼치기'}]
          </text>
        )}
      </g>
    );
  };

  if (!treeData) {
    return <div style={{ padding: '2rem', color: '#888' }}>데이터 없음</div>;
  }

  return (
    <div className="orgchart-container" style={{ width: '100vw', height: '100vh' }}>
      <div style={{ padding: '0.5rem 1rem' }}>
        <label>
          검색:
          <input
            type="text"
            placeholder="이름 또는 직책"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ marginLeft: '0.5rem' }}
          />
        </label>
      </div>
      <div ref={containerRef} style={{ width: '100%', height: 'calc(100vh - 60px)' }}>
        <Tree
          data={treeData}
          orientation="vertical"
          translate={translate}
          zoomable
          scaleExtent={{ min: 0.3, max: 1.5 }}
          renderCustomNodeElement={renderNode}
          nodeSize={{ x: 200, y: 100 }}
          collapsible={false}
          pathFunc="elbow"
          separation={{ siblings: 1, nonSiblings: 2 }} // 자식 노드 간 간격 설정
          styles={{ links: { stroke: '#555', strokeWidth: 1.5 } }}
        />
          data={treeData}
          orientation="vertical"
          translate={translate}
          zoomable
          scaleExtent={{ min: 0.3, max: 1.5 }}
          renderCustomNodeElement={renderNode}
          nodeSize={{ x: 200, y: 100 }}
          collapsible={false}
          pathFunc="elbow"
          styles={{ links: { stroke: '#555', strokeWidth: 1.5 } }}
        />
      </div>
    </div>
  );
}
