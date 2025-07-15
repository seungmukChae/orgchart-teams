import { useState, useEffect, useRef } from 'react';
import Tree from 'react-d3-tree';

export default function OrgChart({ data }) {
  const containerRef = useRef(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [treeData, setTreeData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [treeKey, setTreeKey] = useState(0);

  const collapsibleIds = ['100', '101', '102'];

  useEffect(() => {
    if (containerRef.current) {
      const { width } = containerRef.current.getBoundingClientRect();
      setTranslate({ x: width / 2, y: 50 });
    }
  }, []);

  const applyCollapsedToRoots = (node) => {
    const isCollapsible = collapsibleIds.includes(node.id);
    return {
      ...node,
      collapsed: isCollapsible ? true : false,
      children: node.children?.map(applyCollapsedToRoots) || [],
    };
  };

  const applySearchFilter = (node, query) => {
    const lowerQ = query.trim().toLowerCase();
    const isMatch =
      node.이름?.toLowerCase().includes(lowerQ) ||
      node.직책?.toLowerCase().includes(lowerQ);

    const filteredChildren = (node.children || [])
      .map((child) => applySearchFilter(child, query))
      .filter(Boolean);

    if (isMatch || filteredChildren.length > 0) {
      return { ...node, children: filteredChildren, collapsed: false };
    }

    return null;
  };

  useEffect(() => {
    const prepared = applyCollapsedToRoots(data);
    setTreeData(prepared);
  }, [data]);

  const getNodeColor = (id) => {
    switch (id) {
      case '100': return '#007bff';
      case '101': return '#28a745';
      case '102': return '#ff9999';
      default: return '#e0e0e0';
    }
  };

  const toggleCollapse = (node, targetId) => {
    if (node.id === targetId) {
      return {
        ...node,
        collapsed: !node.collapsed,
      };
    }
    if (!node.children) return node;
    return {
      ...node,
      children: node.children.map((child) => toggleCollapse(child, targetId)),
    };
  };

  const handleClick = (nodeDatum) => {
    console.log('노드 클릭됨:', nodeDatum);

    if (collapsibleIds.includes(nodeDatum.id)) {
      const updated = toggleCollapse(treeData, nodeDatum.id);
      setTreeData({ ...updated });
      setTreeKey(k => k+1);
    }
  };

  const renderNode = ({ nodeDatum }) => {
    const isCollapsible = collapsibleIds.includes(nodeDatum.id);
    const width = 160;
    const height = 60;
    const fill = getNodeColor(nodeDatum.id);

    const baseTextStyle = {
      fontFamily: '맑은 고딕',
      fontWeight: 'normal',
      fill: '#000',
    };

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
          style={{ ...baseTextStyle, fontSize: 13 }}
        >
          {nodeDatum.이름}
        </text>
        <text
          x={0}
          y={14}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ ...baseTextStyle, fontSize: 11, fill: '#555' }}
        >
          {nodeDatum.직책}
        </text>
        {isCollapsible && (
          <text
            x={0}
            y={28}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ ...baseTextStyle, fontSize: 10 }}
          >
            [{nodeDatum.collapsed ? '펼치기' : '접기'}]
          </text>
        )}
      </g>
    );
  };

  const filteredTree = searchQuery.trim()
    ? applySearchFilter(treeData, searchQuery)
    : treeData;

  return (
    <div className="orgchart-container" style={{ width: '100vw', height: '100vh' }}>
      <div style={{ padding: '0.5rem 1rem' }}>
        <label>
          검색:
          <input
            type="text"
            placeholder="이름 또는 직책"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ marginLeft: '0.5rem' }}
          />
        </label>
      </div>

      <div ref={containerRef} style={{ width: '100%', height: 'calc(100vh - 60px)' }}>
        {filteredTree ? (
          <Tree
            key={treeKey}
            data={filteredTree}
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
          <div style={{ padding: '2rem', color: '#888' }}>데이터 없음</div>
        )}
      </div>
    </div>
  );
}
