import { useState, useEffect, useRef } from 'react';
import Tree from 'react-d3-tree';

export default function OrgChart({ data }) {
  const containerRef = useRef(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [selectedCorp, setSelectedCorp] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [treeData, setTreeData] = useState(null);

  useEffect(() => {
    if (containerRef.current) {
      const { width } = containerRef.current.getBoundingClientRect();
      setTranslate({ x: width / 2, y: 50 });
    }
  }, []);

  const groupByTeam = (node) => {
    if (!node.children || node.children.length === 0) return { ...node };

    const teamGroups = {};
    node.children.forEach((child) => {
      const team = child.팀 || '기타';
      if (!teamGroups[team]) teamGroups[team] = [];
      teamGroups[team].push(groupByTeam(child));
    });

    const groupedChildren = Object.entries(teamGroups).map(([teamName, members]) => {
      const sorted = members
        .filter((m) => !m.isTeamNode)
        .sort((a, b) => parseInt(a.id) - parseInt(b.id));
      const manager = sorted[0];
      const label = manager ? `${teamName} (${manager.이름})` : `${teamName} (미정)`;

      return {
        id: `team-${node.id}-${teamName}`,
        이름: label,
        직책: '팀',
        팀: '',
        법인: '',
        isTeamNode: true,
        collapsed: true,
        children: members,
      };
    });

    return { ...node, children: groupedChildren };
  };

  const filterByCorp = (node) => {
    if (selectedCorp === 'ALL') return true;
    if (node.법인?.toUpperCase() === selectedCorp) return true;
    return node.children?.some(filterByCorp);
  };

  const applyCorpFilter = (node) => {
    if (!filterByCorp(node)) return null;
    const filteredChildren = (node.children || [])
      .map(applyCorpFilter)
      .filter(Boolean);
    return { ...node, children: filteredChildren };
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
    const corpFiltered =
      selectedCorp === 'ALL' ? grouped : applyCorpFilter(grouped);
    const searched = searchQuery.trim()
      ? applySearchFilter(corpFiltered)
      : corpFiltered;
    setTreeData(searched);
  }, [data, selectedCorp, searchQuery]);

  const handleToggle = (nodeDatum) => {
    if (nodeDatum.isTeamNode) {
      nodeDatum.collapsed = !nodeDatum.collapsed;
      setTreeData({ ...treeData });
    }
  };

  const renderNode = ({ nodeDatum }) => {
    const isTeam = nodeDatum.isTeamNode;
    const width = isTeam ? 180 : 140;
    const height = isTeam ? 60 : 50;
    const fill = isTeam ? '#f8c8dc' : '#e0e0e0';

    const baseTextStyle = {
      fontFamily: '맑은 고딕',
      fill: '#000',
      fontWeight: 'normal',
    };

    return (
      <g
        onClick={() => handleToggle(nodeDatum)}
        style={{ cursor: isTeam ? 'pointer' : 'default' }}
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
          strokeWidth={1}
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
        {!isTeam && (
          <text
            x={0}
            y={12}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ ...baseTextStyle, fontSize: 11, fill: '#555' }}
          >
            {nodeDatum.직책}
          </text>
        )}
        {isTeam && (
          <text
            x={0}
            y={15}
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
            nodeSize={{ x: 200, y: 100 }}
            collapsible={true}
            pathFunc="elbow"
            styles={{
              links: {
                stroke: '#555',        // ✅ 모든 선 회색
                strokeWidth: 1.5,      // ✅ 두께 통일
              },
            }}
          />
        ) : (
          <div style={{ padding: '2rem', color: '#888' }}>검색 결과가 없습니다.</div>
        )}
      </div>
    </div>
  );
}
