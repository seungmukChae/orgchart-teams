import { useState, useEffect, useRef } from 'react';
import Tree from 'react-d3-tree';

export default function OrgChart({ data }) {
  const containerRef = useRef(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [treeData, setTreeData] = useState(null);
  const [treeKey, setTreeKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // 접기/펼치기 가능한 루트 ID
  const collapsibleIds = ['100', '101', '102'];

  // 화면 중앙 정렬
  useEffect(() => {
    if (containerRef.current) {
      const { width } = containerRef.current.getBoundingClientRect();
      setTranslate({ x: width / 2, y: 50 });
    }
  }, []);

  // 초기 collapsed 상태 설정
  const applyCollapsed = node => {
    const isRoot = collapsibleIds.includes(node.id);
    return {
      ...node,
      collapsed: isRoot ? true : false,
      children: node.children?.map(applyCollapsed) || []
    };
  };

  // 검색 필터 재귀
  const filterSearch = (node, q) => {
    const term = q.trim().toLowerCase();
    const match = !term || node.이름?.toLowerCase().includes(term) || node.직책?.toLowerCase().includes(term);
    const children = node.children
      ?.map(child => filterSearch(child, q))
      .filter(Boolean) || [];
    if (match || children.length) return { ...node, children };
    return null;
  };

  // 데이터 초기 로드 및 검색 적용
  useEffect(() => {
    let tree = applyCollapsed(data);
    tree = filterSearch(tree, searchQuery) || null;
    setTreeData(tree);
  }, [data, searchQuery]);

  // 색상
  const getColor = id => {
    if (id === '100') return '#007bff';
    if (id === '101') return '#28a745';
    if (id === '102') return '#ff9999';
    return '#e0e0e0';
  };

  // collapse 토글 (immutable)
  const toggleNode = (node, target) => {
    if (node.id === target) return { ...node, collapsed: !node.collapsed };
    return {
      ...node,
      children: node.children?.map(c => toggleNode(c, target)) || []
    };
  };

  // 클릭 핸들러
  const handleClick = node => {
    console.log('노드 클릭됨:', node);
    if (!collapsibleIds.includes(node.id)) return;
    const updated = toggleNode(treeData, node.id);
    setTreeData(updated);
    setTreeKey(k => k + 1);
  };

  // 커스텀 노드 렌더링
  const renderNode = ({ nodeDatum }) => {
    const isRoot = collapsibleIds.includes(nodeDatum.id);
    const w = 160, h = 60;
    const fill = getColor(nodeDatum.id);
    const textStyle = { fontFamily: '맑은 고딕', fontWeight: 'normal', fill: '#000' };

    return (
      <g onClick={() => handleClick(nodeDatum)} style={{ cursor: isRoot ? 'pointer' : 'default' }}>
        <rect
          x={-w/2} y={-h/2} width={w} height={h}
          rx={8} ry={8} fill={fill} stroke="#444" strokeWidth={1.5}
        />
        <text x={0} y={-8} textAnchor="middle" dominantBaseline="middle" style={{ ...textStyle, fontSize: 13 }}>
          {nodeDatum.이름}
        </text>
        <text x={0} y={12} textAnchor="middle" dominantBaseline="middle" style={{ ...textStyle, fontSize: 11, fill: '#555' }}>
          {nodeDatum.직책}
        </text>
        {isRoot && (
          <text x={0} y={28} textAnchor="middle" dominantBaseline="middle" style={{ ...textStyle, fontSize: 10 }}>
            [{nodeDatum.collapsed ? '펼치기' : '접기'}]
          </text>
        )}
      </g>
    );
  };

  if (!treeData) return <div style={{padding: '2rem', color:'#888'}}>데이터 없음</div>;

  return (
    <div className="orgchart-container" style={{width: '100vw', height: '100vh'}}>
      <div style={{padding: '0.5rem 1rem'}}>
        <label>검색:
          <input type="text" value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="이름 또는 직책" style={{marginLeft:'0.5rem'}}
          />
        </label>
      </div>
      <div ref={containerRef} style={{width:'100%', height:'calc(100vh-60px)'}}>
        <Tree
          key={treeKey}
          data={treeData}
          orientation="vertical"
          translate={translate}
          zoomable
          scaleExtent={{min:0.3, max:1.5}}
          renderCustomNodeElement={renderNode}
          nodeSize={{x:200, y:100}}
          collapsible={true}
          shouldCollapseNeighborNodes={false}
          shouldCollapseNode={({ nodeDatum }) => nodeDatum.collapsed}
          pathFunc="elbow"
          styles={{links:{stroke:'#555', strokeWidth:1.5}}}
        />
      </div>
    </div>
  );
}
