import { useState, useEffect, useRef } from 'react';
import Tree from 'react-d3-tree';

export default function OrgChart({ data }) {
  const containerRef = useRef(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [selectedCorp, setSelectedCorp] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [treeData, setTreeData] = useState(null); // 트리 재렌더링 용도

  useEffect(() => {
    if (containerRef.current) {
      const { width } = containerRef.current.getBoundingClientRect();
      setTranslate({ x: width / 2, y: 50 });
    }
  }, []);

  const isTeamLeader = (person) =>
    ['팀장', 'manager', 'Manager'].some((t) =>
      person.직책?.toLowerCase().includes(t)
    );

  const groupByTeam = (node) => {
    if (!node.children || node.children.length === 0) return { ...node };

    const teamGroups = {};
    node.children.forEach((child) => {
      const team = child.팀 || '기타';
      if (!teamGroups[team]) teamGroups[team] = [];
      teamGroups[team].push(groupByTeam(child));
    });

    const groupedChildren = Object.entries(teamGroups).map(([teamName, members]) => {
      const leader = members.find(isTeamLeader);
      const label = leader ? `${teamName} (${leader.이름})` : `${teamName} (미정)`;

      return {
        id: `team-${node.id}-${teamName}`,
        이름: label,
        직책: '팀',
        팀: '',
        법인: '',
        isTeamNode: true,
        collapsed: true, // 초기에 접혀 있음
        children: members,
      };
    });

    return { ...node, children: groupedChildren };
  };

  const filterByCorp = (node) => {
    if (selectedCorp === 'ALL') return true;
    if (node.법인?.toUpperCase() === selectedCorp) return true;
    if (node.children?.some(filterByCorp)) return true;
    return false;
  };

  const applyCorpFilter = (node) => {
    if (!filterByCorp(node)) return null;
    const children = (node.children || [])
      .map(applyCorpFilter)
      .filter(Boolean);
    return { ...node, children };
  };

  const matchesSearch = (node) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      node.이름?.toLowerCase().includes(q) ||
      node.직책?.toLowerCase().includes(q)
    );
  };

  const applySearchFilter = (node) => {
    const match = matchesSearch(node);
    const filteredChildren = (node.children || [])
      .map(applySearchFilter)
      .filter(Boolean);
    if (match || filteredChildren.length > 0) {
      return { ...node, children: filteredChildren };
    }
    return null;
  };

  useEffect(() => {
    const grouped = groupByTeam(data);
    const corpFiltered = selectedCorp === 'ALL' ? grouped : applyCorpFilter(grouped);
    const searched = searchQuery.trim() ? applySearchFilter(corpFiltered) : corpFiltered;
    setTreeData(searched);
  }, [data, selectedCorp, searchQuery]);

  const handleToggle = (nodeDatum) => {
    if (nodeDatum.isTeamNode) {
      nodeDatum.collapsed = !nodeDatum.collapsed;
      setTreeData({ ...treeData }); // 강제로 리렌더링
    }
  };

  const renderNode = ({ nodeDatum }) => {
    const isTeam = nodeDatum.isTeamNode;
    const fill = isTeam ? '#f0ad4e' : '#007bff';
    const collapsed = nodeDatum.collapsed;

    return (
      <g onClick={() => handleToggle(nodeDatum)} style={{ cursor: isTeam ? 'pointer' : 'default' }}>
        <rect
          width={isTeam ? 180 : 140}
          height={isTeam ? 48 : 38}
          x={-90}
          y={-24}
          rx={6}
          ry={6}
          fill={fill}
          stroke="#333"
        />
        <text
          textAnchor="middle"
          y={-2}
          style={{ fontFamily: '맑은 고딕', fontSize: 12, fill: '#fff' }}
        >
          {nodeDatum.이름}
        </text>
        {!isTeam && (
          <text
            textAnchor="middle"
            y={14}
            style={{ fontFamily: '맑은 고딕', fontSize: 11, fill: '#ddd' }}
          >
            {nodeDatum.직책}
          </text>
        )}
        {isTeam && (
          <text
            textAnchor="middle"
            y={16}
            style={{ fontFamily: '맑은 고딕', fontSize: 10, fill: '#fff' }}
          >
            [{collapsed ? '펼치기' : '접기'}]
          </text>
        )}
      </g>
    );
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
        {treeData ? (
          <Tree
            data={treeData}
            orientation="vertical"
            translate={translate}
            zoomable
            scaleExtent={{ min: 0.3, max: 1.5 }}
            renderCustomNodeElement={renderNode}
            nodeSize={{ x: 180, y: 100 }}
            collapsible={true}
            pathFunc="elbow"
          />
        ) : (
          <div style={{ padding: '2rem', color: '#888' }}>검색 결과가 없습니다.</div>
        )}
      </div>
    </div>
  );
}
