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

  // 평탄화 맵
  const flattenTree = (node, map = {}, parentId = null) => {
    map[node.id] = { ...node, manager_id: parentId };
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => flattenTree(child, map, node.id));
    }
    return map;
  };

  // 상위 부모 경로 찾기
  const findPathToRoot = (nodeId, map) => {
    const path = [];
    let currentId = nodeId;

    while (currentId) {
      const currentNode = map[currentId];
      if (currentNode) {
        path.unshift(currentId);
        currentId = currentNode.manager_id;
      } else {
        break;
      }
    }

    return path;
  };

  const handleClick = (nodeDatum) => {
    const nodeId = nodeDatum.data.id; // ✅ 무조건 data.id 사용
    console.log('✅ Click:', nodeId);

    const nodeMap = flattenTree(data);
    const path = findPathToRoot(nodeId, nodeMap);
    console.log('✅ Path:', path);

    setHighlightedPath(path);
  };

  const renderCustomNode = ({ nodeDatum }) => {
    const nodeId = nodeDatum.data.id; // ✅ 무조건 data.id 사용
    const isHighlighted = highlightedPath.includes(nodeId);

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
