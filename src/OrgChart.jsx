import { useState, useCallback, useEffect, useRef } from 'react';
import Tree from 'react-d3-tree';

export default function OrgChart({ data }) {
  const [highlightedPath, setHighlightedPath] = useState([]);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // 📌 처음 로딩 시 container 크기에 맞게 트리 중앙 정렬
  useEffect(() => {
    if (containerRef.current) {
      const dimensions = containerRef.current.getBoundingClientRect();
      setTranslate({
        x: dimensions.width / 2,
        y: 50,
      });
    }
  }, []);

  // 부모 경로 찾기
  const findPathToRoot = useCallback((nodeId, nodeMap) => {
    const path = [];
    let currentId = nodeId;

    while (currentId) {
      const currentNode = nodeMap[currentId];
      if (currentNode) {
        path.unshift(currentId);
        currentId = currentNode.manager_id;
      } else {
        break;
      }
    }

    return path;
  }, []);

  // 트리를 평탄화해서 ID 맵
  const flattenTree = (node, map = {}, parentId = null) => {
    map[node.id] = { ...node, manager_id: parentId };
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => flattenTree(child, map, node.id));
    }
    return map;
  };

  // 클릭 시 상위 강조
  const handleClick = useCallback(
    (nodeDatum) => {
      const nodeId = nodeDatum.data.id; // ✅ 반드시 data.id
      console.log('✅ Clicked:', nodeId);
      const nodeMap = flattenTree(data);
      const path = findPathToRoot(nodeId, nodeMap);
      console.log('✅ Path:', path);
      setHighlightedPath(path);
    },
    [data, findPathToRoot]
  );

  // 커스텀 노드 렌더링 (텍스트 가독성 개선)
  const renderCustomNode = ({ nodeDatum }) => {
    const id = nodeDatum.data.id; // ✅ 반드시 data.id
    const isHighlighted = highlightedPath.includes(id);

    return (
      <g onClick={() => handleClick(nodeDatum)} style={{ cursor: 'pointer' }}>
        <circle
          r={12}
          fill={isHighlighted ? '#007bff' : '#ccc'}
          stroke="#333"
          strokeWidth="1"
        />
        <text
          y={24}
          textAnchor="middle"
          style={{
            fontSize: '12px',
            fill: isHighlighted ? '#007bff' : '#333',
            fontWeight: 'normal',
          }}
        >
          {nodeDatum.name}
        </text>
      </g>
    );
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: 'calc(100vh - 200px)',
        border: '1px solid #ccc',
        marginTop: '2rem',
      }}
    >
      <Tree
        data={data}
        orientation="vertical"
        renderCustomNodeElement={renderCustomNode}
        translate={translate}
        nodeSize={{ x: 200, y: 100 }}
      />
    </div>
  );
}
