import { useState, useCallback } from 'react';
import Tree from 'react-d3-tree';

export default function OrgChart({ data }) {
  const [highlightedPath, setHighlightedPath] = useState([]);

  const containerStyles = {
    width: '100%',
    height: '600px',
    border: '1px solid #ccc',
    marginTop: '2rem',
  };

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

  // 클릭 시
  const handleClick = useCallback(
    (nodeDatum) => {
      console.log('✅ Clicked:', nodeDatum);
      const nodeMap = flattenTree(data);
      const path = findPathToRoot(nodeDatum.id, nodeMap);
      console.log('✅ Path:', path);
      setHighlightedPath(path);
    },
    [data, findPathToRoot]
  );

  const renderCustomNode = ({ nodeDatum }) => {
    const id = nodeDatum.id; // 반드시 nodeDatum.id 사용
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
            fill: isHighlighted ? '#007bff' : '#000',
            fontWeight: isHighlighted ? 'bold' : 'normal',
          }}
        >
          {nodeDatum.name}
        </text>
      </g>
    );
  };

  return (
    <div style={containerStyles}>
      <Tree
        data={data}
        orientation="vertical"
        renderCustomNodeElement={renderCustomNode}
        translate={{ x: 500, y: 50 }}
        nodeSize={{ x: 200, y: 100 }}
      />
    </div>
  );
}
