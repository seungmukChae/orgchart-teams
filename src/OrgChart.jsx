import { useState, useCallback, useEffect, useRef } from 'react';
import Tree from 'react-d3-tree';

export default function OrgChart({ data }) {
  const [highlightedPath, setHighlightedPath] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // ✅ 중앙 정렬 (초기 + 리사이즈 대응)
  useEffect(() => {
    const updateTranslate = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setTranslate({
          x: width / 2,
          y: height / 2,
        });
      }
    };

    updateTranslate();
    window.addEventListener('resize', updateTranslate);
    return () => window.removeEventListener('resize', updateTranslate);
  }, []);

  // ✅ 부모 경로 찾기
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

  // ✅ 평탄화
  const flattenTree = (node, map = {}, parentId = null) => {
    map[node.id] = { ...node, manager_id: parentId };
    if (node.children?.length) {
      node.children.forEach(child => flattenTree(child, map, node.id));
    }
    return map;
  };

  // ✅ 법인 색상
  const getCorpColor = (corp) => {
    if (!corp) return '#6c757d';
    switch (corp.trim().toUpperCase()) {
      case 'SEOUL': return '#007bff'; // 파랑
      case 'ETP': return '#28a745';   // 녹색
      case 'BVT': return '#dc3545';   // 빨강
      default: return '#6c757d';
    }
  };

  // ✅ 클릭 시: 강조 OR 해제
  const handleClick = useCallback(
    (nodeDatum) => {
      const nodeId = nodeDatum.id;
      if (nodeId === selectedId) {
        setHighlightedPath([]);
        setSelectedId(null);
      } else {
        const nodeMap = flattenTree(data);
        const path = findPathToRoot(nodeId, nodeMap);
        setHighlightedPath(path);
        setSelectedId(nodeId);
      }
    },
    [data, selectedId, findPathToRoot]
  );

  // ✅ 커스텀 노드 렌더링
  const renderCustomNode = ({ nodeDatum }) => {
    const id = nodeDatum.id;
    const isHighlighted = highlightedPath.includes(id);
    const isSelected = selectedId && id === selectedId;
    const opacity = selectedId ? (isHighlighted ? 1 : 0.2) : 1;

    // 선택된 노드 기준 색상 통일
    const selectedNode = highlightedPath.length ? data : null;
    const selectedColor = selectedNode ? getCorpColor(nodeDatum.법인) : '#ccc';
    const fillColor = isHighlighted ? getCorpColor(nodeDatum.법인) : '#ccc';

    return (
      <g onClick={() => handleClick(nodeDatum)} style={{ cursor: 'pointer', opacity }}>
        <circle
          r={14}
          fill={fillColor}
          stroke="#333"
          strokeWidth="1"
        />
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
        height: '100vh',
        overflow: 'auto',
        border: '1px solid #ccc',
        marginTop: '1rem',
      }}
    >
      <Tree
        data={data}
        orientation="horizontal"               // ✅ 좌 → 우 방향
        renderCustomNodeElement={renderCustomNode}
        translate={translate}
        nodeSize={{ x: 150, y: 80 }}          // ✅ 노드 간격 축소
        zoomable={true}
      />
    </div>
  );
}
