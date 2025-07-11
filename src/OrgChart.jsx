import { useState, useCallback, useEffect, useRef } from 'react';
import Tree from 'react-d3-tree';

export default function OrgChart({ data }) {
  const [highlightedPath, setHighlightedPath] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // 중앙 정렬
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

  // 트리를 평탄화
  const flattenTree = (node, map = {}, parentId = null) => {
    map[node.id] = { ...node, manager_id: parentId };
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => flattenTree(child, map, node.id));
    }
    return map;
  };

  // 클릭 핸들러
  const handleClick = useCallback(
    (nodeDatum) => {
      const nodeId = nodeDatum.id;
      const nodeMap = flattenTree(data);
      const path = findPathToRoot(nodeId, nodeMap);
      setHighlightedPath(path);
      setSelectedId(nodeId);
    },
    [data, findPathToRoot]
  );

  // 커스텀 노드
  const renderCustomNode = ({ nodeDatum }) => {
    const id = nodeDatum.id;
    const isHighlighted = highlightedPath.includes(id);
    const isSelected = selectedId && id === selectedId; // ✅ null 방지!
  
    const opacity = selectedId ? (isHighlighted ? 1 : 0.3) : 1;
  
    return (
      <g onClick={() => handleClick(nodeDatum)} style={{ cursor: 'pointer', opacity }}>
        <circle
          r={14}
          fill={isHighlighted ? '#007bff' : '#ccc'}
          stroke="#333"
          strokeWidth="1"
        />
        <text
          y={24}
          textAnchor="middle"
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: '11px',
            fill: isHighlighted ? '#007bff' : '#333',
            fontWeight: isSelected ? 'bold' : 'normal', // ✅
          }}
        >
          {nodeDatum.이름}
        </text>
        <text
          y={42}
          textAnchor="middle"
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: '11px',
            fill: isHighlighted ? '#007bff' : '#555',
            fontWeight: isSelected ? 'bold' : 'normal', // ✅
          }}
        >
          ({nodeDatum.직책}, {nodeDatum.팀})
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
        nodeSize={{ x: 200, y: 120 }}
      />
    </div>
  );
}
