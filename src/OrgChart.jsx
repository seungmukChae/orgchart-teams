import { useState, useEffect, useRef, useCallback } from 'react';
import Tree from 'react-d3-tree';

export default function OrgChart({ data }) {
  const containerRef = useRef(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [collapsedMap, setCollapsedMap] = useState({});

  // ✅ 트리 중앙 정렬
  useEffect(() => {
    const updateTranslate = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setTranslate({ x: width / 2, y: 50 });
      }
    };
    updateTranslate();
    window.addEventListener('resize', updateTranslate);
    return () => window.removeEventListener('resize', updateTranslate);
  }, []);

  // ✅ 팀별 그룹핑 트리 구조 만들기
  const groupByTeam = (node) => {
    if (!node.children || node.children.length === 0) return node;

    // 팀별로 자식 분류
    const teamGroups = {};
    node.children.forEach(child => {
      const team = child.팀 || '기타';
      if (!teamGroups[team]) teamGroups[team] = [];
      teamGroups[team].push(groupByTeam(child)); // 재귀로 하위 자식 처리
    });

    // 팀별로 팀 노드 구성
    const groupedChildren = Object.entries(teamGroups).map(([teamName, members]) => ({
      id: `team-${node.id}-${teamName}`,
      이름: teamName,
      직책: '팀',
      팀: '',
      법인: '',
      isTeamNode: true,
      children: members,
    }));

    return {
      ...node,
      children: groupedChildren,
    };
  };

  const processedData = groupByTeam(data);

  // ✅ 클릭 시 팀 노드 접기/펼치기
  const handleNodeToggle = (nodeDatum) => {
    const nodeId = nodeDatum.__rd3t.id;
    if (nodeDatum.isTeamNode) {
      setCollapsedMap(prev => ({
        ...prev,
        [nodeId]: !prev[nodeId],
      }));
    }
  };

  // ✅ 커스텀 노드 렌더링
  const renderNode = ({ nodeDatum }) => {
    const isTeam = nodeDatum.isTeamNode;
    const collapsed = collapsedMap[nodeDatum.__rd3t.id];
    const fillColor = isTeam ? '#f0ad4e' : '#007bff';

    return (
      <g onClick={() => handleNodeToggle(nodeDatum)} style={{ cursor: isTeam ? 'pointer' : 'default' }}>
        <rect
          width={isTeam ? 120 : 100}
          height={isTeam ? 40 : 36}
          x={-60}
          y={-20}
          rx={6}
          ry={6}
          fill={fillColor}
          stroke="#333"
        />
        <text
          textAnchor="middle"
          y={0}
          style={{ fill: '#fff', fontSize: 12, fontWeight: 'bold' }}
        >
          {nodeDatum.이름}
        </text>
        {!isTeam && (
          <text
            textAnchor="middle"
            y={16}
            style={{ fill: '#ddd', fontSize: 11 }}
          >
            {nodeDatum.직책}
          </text>
        )}
        {isTeam && (
          <text
            textAnchor="middle"
            y={16}
            style={{ fill: '#fff', fontSize: 10 }}
          >
            [{collapsed ? '펼치기' : '접기'}]
          </text>
        )}
      </g>
    );
  };

  // ✅ 하위 트리 접기 적용
  const shouldCollapse = (nodeDatum) => {
    return collapsedMap[nodeDatum.__rd3t.id] ?? false;
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        <Tree
          data={processedData}
          orientation="vertical" // ✅ 세로 방향
          translate={translate}
          zoomable
          scaleExtent={{ min: 0.3, max: 1.5 }}
          renderCustomNodeElement={renderNode}
          nodeSize={{ x: 160, y: 100 }}
          collapsible={true}
          shouldCollapseNeighborNodes={false}
          pathFunc="elbow"
          initialDepth={1}
          shouldCollapseNode={shouldCollapse}
        />
      </div>
    </div>
  );
}
