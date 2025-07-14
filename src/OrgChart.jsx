import { useState, useEffect, useRef, useCallback } from 'react';
import Tree from 'react-d3-tree';

export default function OrgChart({ data }) {
  const containerRef = useRef(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [collapsedMap, setCollapsedMap] = useState({});
  const [selectedCorp, setSelectedCorp] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const updateTranslate = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setTranslate({ x: width / 2, y: 50 });
      }
    };
    updateTranslate();
    window.addEventListener('resize', updateTranslate);
    return () => window.removeEventListener('resize', updateTranslate);
  }, []);

  const isTeamLeader = (person) => {
    return ['팀장', 'Manager', 'manager'].some(title =>
      person.직책?.toLowerCase().includes(title.toLowerCase())
    );
  };

  const groupByTeamWithLeader = (node) => {
    if (!node.children || node.children.length === 0) return node;

    const teamGroups = {};
    node.children.forEach(child => {
      const team = child.팀 || '기타';
      if (!teamGroups[team]) teamGroups[team] = [];
      teamGroups[team].push(groupByTeamWithLeader(child));
    });

    const groupedChildren = Object.entries(teamGroups).map(([teamName, members]) => {
      const leader = members.find(isTeamLeader);
      const label = leader
        ? `${teamName} (${leader.이름})`
        : `${teamName} (미정)`;

      return {
        id: `team-${node.id}-${teamName}`,
        이름: label,
        직책: '팀',
        팀: '',
        법인: '',
        isTeamNode: true,
        children: members,
      };
    });

    return { ...node, children: groupedChildren };
  };

  const filteredByCorp = (node) => {
    if (selectedCorp === 'ALL') return true;
    if (node.법인?.toUpperCase() === selectedCorp) return true;
    if (node.children?.some(filteredByCorp)) return true;
    return false;
  };

  const filterByCorpRecursive = (node) => {
    if (!filteredByCorp(node)) return null;
    const filteredChildren = (node.children || [])
      .map(filterByCorpRecursive)
      .filter(child => child !== null);
    return { ...node, children: filteredChildren };
  };

  const processedData = groupByTeamWithLeader(data);
  const corpFilteredData = selectedCorp === 'ALL' ? processedData : filterByCorpRecursive(processedData);

  const matchesSearch = (node) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      node.이름?.toLowerCase().includes(q) ||
      node.직책?.toLowerCase().includes(q)
    );
  };

  const filterBySearch = (node) => {
    const match = matchesSearch(node);
    const filteredChildren = (node.children || [])
      .map(filterBySearch)
      .filter(child => child !== null);
    if (match || filteredChildren.length > 0) {
      return { ...node, children: filteredChildren };
    }
    return null;
  };

  const finalData = filterBySearch(corpFilteredData);

  const handleNodeToggle = (nodeDatum) => {
    const nodeId = nodeDatum.__rd3t.id;
    if (nodeDatum.isTeamNode) {
      setCollapsedMap(prev => ({
        ...prev,
        [nodeId]: !prev[nodeId],
      }));
    }
  };

  const renderNode = ({ nodeDatum }) => {
    const isTeam = nodeDatum.isTeamNode;
    const collapsed = collapsedMap[nodeDatum.__rd3t.id];
    const fillColor = isTeam ? '#f0ad4e' : '#007bff';

    return (
      <g onClick={() => handleNodeToggle(nodeDatum)} style={{ cursor: isTeam ? 'pointer' : 'default' }}>
        <rect
          width={isTeam ? 160 : 120}
          height={isTeam ? 44 : 36}
          x={-80}
          y={-22}
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
            y={18}
            style={{ fill: '#fff', fontSize: 10 }}
          >
            [{collapsed ? '펼치기' : '접기'}]
          </text>
        )}
      </g>
    );
  };

  const shouldCollapse = (nodeDatum) => {
    return collapsedMap[nodeDatum.__rd3t.id] ?? false;
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <div style={{ padding: '0.5rem 1rem', display: 'flex', gap: '1rem' }}>
        <label>
          법인:
          <select
            value={selectedCorp}
            onChange={(e) => setSelectedCorp(e.target.value)}
            style={{ marginLeft: '0.5rem' }}
          >
            <option value="ALL">전체</option>
            <option value="SEOUL">SEOUL</option>
            <option value="ETP">ETP</option>
            <option value="BVT">BVT</option>
          </select>
        </label>

        <label>
          검색:
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="이름 또는 직책"
            style={{ marginLeft: '0.5rem' }}
          />
        </label>
      </div>

      <div ref={containerRef} style={{ width: '100%', height: 'calc(100vh - 60px)' }}>
        <Tree
          data={finalData}
          orientation="vertical"
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
