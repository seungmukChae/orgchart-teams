import { useState, useEffect, useRef } from 'react';
import Tree from 'react-d3-tree';

export default function OrgChart({ data }) {
  const containerRef = useRef(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [selectedCorp, setSelectedCorp] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // ✅ 화면 중앙 정렬
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

  // ✅ 팀장 판별
  const isTeamLeader = (person) =>
    ['팀장', 'manager', 'Manager'].some((t) =>
      person.직책?.toLowerCase().includes(t)
    );

  // ✅ 팀 단위 그룹화 및 collapsed 추가
  const groupByTeam = (node) => {
    if (!node.children || node.children.length === 0) return { ...node };

    const teamGroups = {};
    node.children.forEach((child) => {
      const team = child.팀 || '기타';
      if (!teamGroups[team]) teamGroups[team] = [];
      teamGroups[team].push(groupByTeam(child));
    });

    const groupedChildren = Object.entries(teamGroups).map(
      ([teamName, members]) => {
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
          collapsed: true, // 기본은 접힘
          children: members,
        };
      }
    );

    return { ...node, children: groupedChildren };
  };

  // ✅ 법인 필터링
  const filterByCorp = (node) => {
    if (selectedCorp === 'ALL') return true;
    if (node.법인?.toUpperCase() === selectedCorp) return true;
    if (node.children?.some(filterByCorp)) return true;
    return false;
  };

  const applyCorpFilter = (node) => {
    if (!filterByCorp(node)) return null;
    const filteredChildren = (node.children || [])
      .map(applyCorpFilter)
      .filter(Boolean);
    return { ...node, children: filteredChildren };
  };

  // ✅ 검색 필터링
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

  // ✅ 노드 클릭 시 접기/펼치기
  const handleToggle = (nodeDatum, event) => {
    if (nodeDatum.isTeamNode) {
      nodeDatum.collapsed = !nodeDatum.collapsed;
      // 강제로 re-render 트리거
      setTranslate((pos) => ({ ...pos }));
    }
  };

  // ✅ 커스텀 노드
  const renderNode = ({ nodeDatum }) => {
    const isTeam = nodeDatum.isTeamNode;
    const fill = isTeam ? '#f0ad4e' : '#007bff';
    const collapsed = nodeDatum.collapsed;

    return (
      <g onClick={(e) => handleToggle(nodeDatum, e)} style={{ cursor: isTeam ? 'pointer' : 'default' }}>
        <rect
          width={isTeam ? 160 : 120}
          height={isTeam ? 44 : 36}
          x={-80}
          y={-22}
          rx={6}
          ry={6}
          fill={fill}
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

  // ✅ 전체 처리: 그룹 → 법인 → 검색
  const groupedData = groupByTeam(data);
  const corpFilteredData =
    selectedCorp === 'ALL' ? groupedData : applyCorpFilter(groupedData);
  const finalData = searchQuery.trim()
    ? applySearchFilter(corpFilteredData)
    : corpFilteredData;

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
        {finalData ? (
          <Tree
            data={finalData}
            orientation="vertical"
            translate={translate}
            zoomable
            scaleExtent={{ min: 0.3, max: 1.5 }}
            renderCustomNodeElement={renderNode}
            nodeSize={{ x: 160, y: 100 }}
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
