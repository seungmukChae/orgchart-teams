import { useState, useCallback, useEffect, useRef } from 'react';
import Tree from 'react-d3-tree';

export default function OrgChart({ data }) {
  const [highlightedPath, setHighlightedPath] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedCorp, setSelectedCorp] = useState(null);
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

  // 법인별 색상 반환
  const getCorpColor = (corp) => {
    if (!corp) return '#6c757d'; // null 방지

    switch (corp.trim().toUpperCase()) {
      case 'SEOUL':
        return '#007bff'; // 파랑
      case 'ETP':
        return '#28a745'; // 녹색
      case 'BVT':
        return '#dc3545'; // 빨강
      default:
        return '#6c757d'; // 기본 연회색
    }
  };

  // 클릭 핸들러
  const handleClick = useCallback(
    (nodeDatum) => {
      const nodeId = nodeDatum.id;

      if (nodeId === selectedId) {
        // 동일 노드를 다시 클릭하면 해제
        setHighlightedPath([]);
        setSelectedId(null);
        setSelectedCorp(null); // ✅ 리셋!
      } else {
        const nodeMap = flattenTree(data);
        const path = findPathToRoot(nodeId, nodeMap);
        setHighlightedPath(path);
        setSelectedId(nodeId);
        setSelectedCorp(nodeDatum.법인); // ✅ 선택한 노드의 법인 기억
      }
    },
    [data, selectedId, findPathToRoot]
  );

  // 커스텀 노드
  const renderCustomNode = ({ nodeDatum }) => {
    const id = nodeDatum.id;
    const isHighlighted = highlightedPath.includes(id);

    const opacity = selectedId ? (isHighlighted ? 1 : 0.3) : 1;

    // 강조 색상: 경로에 포함되면 클릭한 노드의 법인 색, 아니면 연회색
    const fillColor = isHighlighted
      ? getCorpColor(selectedCorp) // ✅ 선택한 노드의 법인색
      : '#ccc';

    return (
      <g onClick={() => handleClick(nodeDatum)} style={{ cursor: 'pointer', opacity }}>
        <circle
          r={14}
          fill={fillColor}
          stroke="#333"
          strokeWidth="1"
        />
        {/* 이름 */}
        <text
          y={24}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: '12px',
            fill: '#333',
            fontWeight: isHighlighted ? 'bold' : 'normal',
          }}
        >
          {nodeDatum.이름}
        </text>
        {/* 직책, 팀 */}
        <text
          y={42}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: '11px',
            fill: '#555',
            fontWeight: isHighlighted ? 'bold' : 'normal',
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
