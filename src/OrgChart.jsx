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

  // 상위 부모 경로 찾기
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

  // 트리를 평탄화 해서 ID-노드 맵 만들기
  const flattenTree = (node, map = {}, parentId = null) => {
    map[node.id] = { ...node, manager_id: parentId };
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => flattenTree(child, map, node.id));
    }
    return map;
  };

  const handleClick = useCallback(
    (nodeData) => {
      const nodeMap = flattenTree(data);
      const path = findPathToRoot(nodeData.__rd3t.id, nodeMap);
      setHighlightedPath(path);
    },
    [data, findPathToRoot]
  );

  const renderCustomNode = ({ nodeDatum }) => {
    const id = nodeDatum.__rd3t.id;
    const isHighlighted = highlightedPath.includes(id);

    return (
      <g onClick={() => handleClick(nodeDatum)}>
        <circle r="10" fill={isHighlighted ? '#007bff' : '#ccc'} />
        <text
          y={20}
          textAnchor="middle"
          style={{
            fontSize: '12px',
            fill: isHighlighted ? '#007bff' : '#999',
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
