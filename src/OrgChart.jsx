import { useState, useEffect, useRef } from 'react';
import Tree from 'react-d3-tree';

export default function OrgChart({ data }) {
  const containerRef = useRef(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [treeData, setTreeData] = useState(null);
  const collapsibleIds = ['100', '101', '102']; // root로 접기 허용할 ID

  useEffect(() => {
    if (containerRef.current) {
      const { width } = containerRef.current.getBoundingClientRect();
      setTranslate({ x: width / 2, y: 50 });
    }
  }, []);

  // ✅ 트리 재귀적으로 가공 (collapsed 상태 적용)
  const applyCollapsedToRoots = (node) => {
    const isCollapsible = collapsibleIds.includes(node.id);
    return {
      ...node,
      collapsed: isCollapsible ? true : false,
      children: node.children
        ? node.children.map(applyCollapsedToRoots)
        : [],
    };
  };

  // ✅ 첫 로딩 시 접기 적용
  useEffect(() => {
    const processed = applyCollapsedToRoots(data);
    setTreeData(processed);
  }, [data]);

  // ✅ 색상 설정
  const getNodeColor = (id) => {
    switch (id) {
      case '100':
        return '#007bff'; // blue
      case '101':
        return '#28a745'; // green
      case '102':
        return '#ff9999'; // light red
      default:
        return '#e0e0e0'; // gray
    }
  };

  // ✅ 클릭 핸들러
  const handleClick = (nodeDatum) => {
    console.log('노드 클릭됨:', nodeDatum);

    if (collapsibleIds.includes(nodeDatum.id)) {
      nodeDatum.collapsed = !nodeDatum.collapsed;
      setTreeData({ ...treeData });
    }
  };

  // ✅ 커스텀 노드 렌더링
  const renderNode = ({ nodeDatum }) => {
    const isCollapsible = collapsibleIds.includes(nodeDatum.id);
    const width = 160;
    const height = 60;
    const fill = getNodeColor(nodeDatum.id);

    return (
      <g
        onClick={() => handleClick(nodeDatum)}
        style={{ cursor: isCollapsible ? 'pointer' : 'default' }}
      >
        <rect
          width={width}
          height={height}
          x={-width / 2}
          y={-height / 2}
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
            fill: '#000',
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
            fontWeight: 'normal',
          }}
        >
          {nodeDatum.직책}
        </text>
        {isCollapsible && (
          <text
            x={0}
            y={28}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontFamily: '맑은 고딕',
              fontSize: 10,
              fill: '#000',
              fontWeight: 'normal',
            }}
          >
            [{nodeDatum.collapsed ? '펼치기' : '접기'}]
          </text>
        )}
      </g>
    );
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
      >
        {treeData ? (
          <Tree
            data={treeData}
            orientation="vertical"
            translate={translate}
            zoomable
            scaleExtent={{ min: 0.3, max: 1.5 }}
            renderCustomNodeElement={renderNode}
            nodeSize={{ x: 200, y: 100 }}
            collapsible={true}
            pathFunc="elbow"
            styles={{
              links: {
                stroke: '#555',
                strokeWidth: 1.5,
              },
            }}
          />
        ) : (
          <div style={{ padding: '2rem', color: '#888' }}>데이터를 불러오는 중...</div>
        )}
      </div>
    </div>
  );
}
