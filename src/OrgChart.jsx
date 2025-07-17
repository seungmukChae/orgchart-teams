import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Tree from 'react-d3-tree';

export default function OrgChart({ data, searchQuery }) {
  const containerRef = useRef(null);
  const treeRef = useRef(null);

  // 법인/팀 헬퍼
  const CORP_IDS = ['100', '101', '102'];
  const isCorp = (id) => CORP_IDS.includes(String(id));
  const isTeam = (id) => {
    const n = Number(id);
    return n >= 103 && n <= 199;
  };

  // --- 핵심 상태 ---
  const [openSection, setOpenSection] = useState([]); // 항상 닫힘이 default
  const [autoTeamMatch, setAutoTeamMatch] = useState(null); // 팀명 검색 시 "자동 expand"팀 id

  // 가상 루트 생성
  const rootData = useMemo(() => {
    if (Array.isArray(data)) {
      return {
        id: 'root',
        이름: '',
        직책: '',
        팀: '',
        email: '',
        children: data,
      };
    }
    return data;
  }, [data]);

  // 중앙 정렬
  useEffect(() => {
    const handleResize = () => {
      if (treeRef.current?.centerNode) {
        const targetId = Array.isArray(data) ? data[0]?.id : data?.id;
        if (targetId) treeRef.current.centerNode(targetId);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [data]);

  // --- 팀명 검색 시, 자동으로 해당 팀만 open, 다른 모든 openSection은 닫기 ---
  useEffect(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) {
      setAutoTeamMatch(null);
      return;
    }
    // 오직 "팀명 완전 일치"만 자동 매치
    let foundId = null;
    function findTeam(node) {
      if (!node) return;
      if (
        isTeam(node.id) &&
        node.팀 &&
        node.팀.toLowerCase() === term // 완전일치만!
      ) {
        foundId = String(node.id);
      }
      (node.children || []).forEach(findTeam);
    }
    if (Array.isArray(data)) data.forEach(findTeam);
    else findTeam(data);
    setAutoTeamMatch(foundId); // 찾은 팀 ID만 자동 오픈
  }, [searchQuery, data]);

  // 노드 클릭: 팀/법인 expand/collapse
  const handleClick = useCallback((nodeDatum) => {
    const idStr = String(nodeDatum.id);
    if (isTeam(idStr) || isCorp(idStr)) {
      setOpenSection((prev) =>
        prev.includes(idStr)
          ? prev.filter((id) => id !== idStr)
          : [...prev, idStr]
      );
      // 팀 클릭 시, 자동 open은 해제(사용자 제어 우선)
      setAutoTeamMatch((prev) => (prev === idStr ? null : prev));
    } else if (nodeDatum.email) {
      navigator.clipboard.writeText(nodeDatum.email);
    }
  }, []);

  // --- buildTree 핵심: 팀명 검색이면 그 팀만 보이고, 클릭 시 팀원 open ---
  const buildTree = useCallback(
    (node) => {
      if (!node) return null;
      const idStr = String(node.id);
      const term = searchQuery.trim().toLowerCase();

      const originalChildren = node.children || [];
      let children = originalChildren.map(buildTree).filter(Boolean);

      // [1] 검색어 없으면: 법인, 팀만 openSection에 따라 open
      if (!term) {
        if (isCorp(idStr) || isTeam(idStr)) {
          children = openSection.includes(idStr) ? children : [];
          return { ...node, children };
        }
        return { ...node, children };
      }

      // [2] "팀명 완전일치 검색"이면 해당 팀만 보이게, 클릭시 팀원 표시
      const teamMatch = isTeam(idStr) && node.팀?.toLowerCase() === term;
      if (autoTeamMatch && idStr === autoTeamMatch) {
        // 사용자가 expand 했으면 children 표시, 아니면 팀만
        children = openSection.includes(idStr) ? children : [];
        return { ...node, children };
      }
      // 그 외 팀은 숨김
      if (autoTeamMatch && isTeam(idStr)) return null;

      // [3] 법인명/이름/직책 일반 검색(경로 expand)
      const corpMatch = isCorp(idStr) && node.이름?.toLowerCase().includes(term);
      const nameMatch = node.이름?.toLowerCase().includes(term);
      const titleMatch = node.직책?.toLowerCase().includes(term);

      if (corpMatch || nameMatch || titleMatch) {
        if ((isCorp(idStr) || isTeam(idStr)) && !openSection.includes(idStr)) {
          return { ...node };
        }
        return { ...node, children };
      }

      // [4] 하위 매치 있으면 표시
      if (children.length) {
        if ((isCorp(idStr) || isTeam(idStr)) && !openSection.includes(idStr)) {
          return { ...node };
        }
        return { ...node, children };
      }

      return null;
    },
    [searchQuery, openSection, autoTeamMatch]
  );

  const treeData = useMemo(() => {
    const fullTree = buildTree(rootData);
    if (!fullTree) return null;
    return fullTree.id === 'root' ? fullTree.children : fullTree;
  }, [buildTree, rootData]);

  // "검색 결과 없음" 처리
  if (!treeData || (Array.isArray(treeData) && treeData.length === 0)) {
    return (
      <div style={{ padding: '2rem', color: '#888' }}>
        검색 결과가 없습니다.
      </div>
    );
  }

  // 노드 렌더
  const renderNode = ({ nodeDatum }) => {
    const idStr = String(nodeDatum.id);
    let fill =
      isCorp(idStr) ? (
        idStr === '100' ? '#007bff' :
        idStr === '101' ? '#28a745' :
        '#ff9999'
      ) : isTeam(idStr)
        ? '#ffa500'
        : '#e0e0e0';

    const isSection = isCorp(idStr) || isTeam(idStr);
    return (
      <g
        onClick={() => handleClick(nodeDatum)}
        style={{
          cursor: nodeDatum.email || isSection ? 'pointer' : 'default',
        }}
      >
        <rect
          x={-80}
          y={-30}
          width={160}
          height={60}
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
          style={{
            fontFamily: '맑은 고딕',
            fontSize: 13,
            fontWeight: 'normal',
          }}
        >
          {nodeDatum.이름}
        </text>
        <text
          x={0}
          y={14}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontFamily: '맑은 고딕',
            fontSize: 11,
            fill: '#555',
          }}
        >
          {nodeDatum.직책}
        </text>
        {isSection && (
          <text
            x={0}
            y={12}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontFamily: '맑은 고딕', fontSize: 10 }}
          >
            [{openSection.includes(idStr) ? 'Collapse' : 'Expand'}]
          </text>
        )}
      </g>
    );
  };

  // 최종 렌더
  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
    >
      <Tree
        ref={treeRef}
        data={treeData}
        orientation="horizontal"
        translate={{
          x: window.innerWidth / 2,
          y: 100,
        }}
        zoomable
        collapsible={false}
        pathFunc="elbow"
        renderCustomNodeElement={renderNode}
        nodeSize={{ x: 200, y: 80 }}
        separation={{ siblings: 1, nonSiblings: 1 }}
        styles={{
          links: { stroke: '#555', strokeWidth: 1.5 },
        }}
      />
    </div>
  );
}
