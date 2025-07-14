import { useState, useCallback, useEffect, useRef } from 'react';
import Tree from 'react-d3-tree';

export default function OrgChart({ data }) {
  const [highlightedPath, setHighlightedPath] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [selectedCorp, setSelectedCorp] = useState('ALL');
  const containerRef = useRef(null);

  // ✅ 중앙 정렬
  useEffect(() => {
    const updateTranslate = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setTranslate({ x: width / 2, y: height / 2 });
      }
    };
    updateTranslate();
    window.addEventListener('resize', updateTranslate);
    return () => window.removeEventListener('resize', updateTranslate);
  }, []);

  const findPathToRoot = useCallback((nodeId, nodeMap) => {
    const path = [];
    let currentId = nodeId;
    while (currentId) {
      const currentNode = nodeMap[currentId];
      if (currentNode) {
        path.unshift(currentId);
        currentId = currentNode.manager_id;
      } else break;
    }
    return path;
  }, []);

  const flattenTree = (node, map = {}, parentId = null) => {
    map[node.id] = { ...node, manager_id: parentId };
    if (node.children?.length) {
      node.children.forEach(child => flattenTree(child, map, node.id));
    }
    return map;
  };

  const getCorpColor = (corp) => {
    if (!corp) return '#6c757d';
    switch (corp.trim().toUpperCase()) {
      case 'SEOUL': return '#007bff';
      case 'ETP': return '#28a745';
      case 'BVT': return '#dc3545';
      default: return '#6c757d';
    }
  };

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

  const renderCustomNode = ({ nodeDatum }) => {
    const id = nodeDatum.id;
    const isHighlighted = highlightedPath.includes(id);
    const opacity = selectedId ? (isHighlighted ? 1 : 0.2) : 1;
    const fillColor = isHighlighted ? getCorpColor(nodeDatum.법인) : '#ccc';

    return (
      <g onClick={() => handleClick(nodeDatum)} style={{ cursor: 'pointer', opacity }}>
        <circle r={14} fill={fillColor} stroke="#333" strokeWidth="1" />
        <text y={24} textAnchor="middle" style={{ fontSize: 12 }}>
          {nodeDatum.이름}
        </text>
        <text y={42} textAnchor="middle" style={{ fontSize: 11, fill: '#555' }}>
          ({nodeDatum.직책}, {nodeDatum.팀})
        </text>
      </g>
    );
  };

  // ✅ 법인 필터링 적용
  const filterByCorp = (node) => {
    if (selectedCorp === 'ALL') return true;
    if (node.법인?.toUpperCase() === selectedCorp.toUpperCase()) return true;
    if (node.children?.some(filterByCorp)) return true;
    return false;
  };

  const filterTree = (node) => {
    if (!filterByCorp(node)) return null;
    const filteredChildren = (node.children || [])
      .map(filterTree)
      .filter(child => child !== null);
    return { ...node, children: filteredChildren };
  };

  const filteredData = selectedCorp === 'ALL' ? data : filterTree(data);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {/* ✅ 법인 선택 필터 */}
      <div style={{ padding: '0.5rem 1rem' }}>
        <label htmlFor="corpSelect">법인 필터: </label>
        <select
          id="corpSelect"
          value={selectedCorp}
          onChange={(e) => setSelectedCorp(e.target.value)}
        >
          <option value="ALL">전체</option>
          <option value="SEOUL">SEOUL</option>
          <option value="ETP">ETP</option>
          <option value="BVT">BVT</option>
        </select>
      </div>

      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: 'calc(100vh - 60px)',
          overflow: 'auto',
        }}
      >
        <Tree
          data={filteredData}
          orientation="horizontal"
          renderCustomNodeElement={renderCustomNode}
          translate={translate}
          nodeSize={{ x: 150, y: 80 }}
          zoomable={true}
          scaleExtent={{ min: 0.3, max: 2 }}
          separation={{ siblings: 1, nonSiblings: 2 }}
        />
      </div>
    </div>
  );
}
