import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Tree from 'react-d3-tree';

export default function OrgChart({ data, searchQuery }) {
  const containerRef = useRef(null);
  const treeRef = useRef(null);
  const [openSection, setOpenSection] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, email: '' });

  const sectionIds = ['100','101','102'];

  // 리사이즈 시 중앙 정렬
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const { width } = containerRef.current.getBoundingClientRect();
      treeRef.current?.centerNode?.(data.id);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data]);

  // 노드 토글·클립보드 복사
  const handleClick = (nodeDatum) => {
    if (sectionIds.includes(nodeDatum.id)) {
      setOpenSection(prev => prev === nodeDatum.id ? null : nodeDatum.id);
    } else if (nodeDatum.email) {
      navigator.clipboard.writeText(nodeDatum.email);
    }
  };

  // 1) 재귀로 트리 필터 & 2) 팀 검색 시 전체 자손 렌더
  const buildTree = useCallback((node) => {
    if (!node) return null;
    const term = searchQuery.trim().toLowerCase();

    // 이름/직책/팀 매치 여부
    const isNameMatch = node.이름?.toLowerCase().includes(term);
    const isTitleMatch = node.직책?.toLowerCase().includes(term);
    const isTeamMatch = node.팀?.toLowerCase().includes(term);

    // 1) 기본 자식 재귀 & null 제거
    let children = (node.children || [])
      .map(buildTree)
      .filter(Boolean);

    // 2) 검색어 없을 때만 섹션 토글
    if (!term && sectionIds.includes(node.id)) {
      children = openSection === node.id ? children : [];
    }

    // 검색어가 없으면 (기존) 로직
    if (!term) {
      if (node === data) return { ...node, children };
      if (children.length)     return { ...node, children };
      return null;
    }

    // 검색어 있을 때
    //  a) 이름/직책 매치: 해당 노드 + (필터된) 자식
    if (isNameMatch || isTitleMatch) {
      return { ...node, children };
    }
    //  b) 팀 매치: 자식 전체(=팀원 모두) 포함
    if (isTeamMatch) {
      const allDescendants = (node.children || []).map(buildTree).filter(Boolean);
      return { ...node, children: allDescendants };
    }
    //  c) 그 외 – 자식 중 매치된 게 있으면 표시
    if (children.length) {
      return { ...node, children };
    }
    return null;
  }, [searchQuery, openSection, data]);

  // 최종 트리 데이터 (null 체크)
  const filteredTree = useMemo(() => buildTree(data), [buildTree, data]);
  if (!filteredTree) {
    return <div style={{ padding: '2rem', color: '#888' }}>검색 결과가 없습니다.</div>;
  }

  // 노드 렌더 함수(툴팁 포함)
  const renderNode = ({ nodeDatum }) => {
    const idNum = parseInt(nodeDatum.id, 10);
    let fill = idNum>=100&&idNum<=199 ? '#ffa500' : '#e0e0e0';
    if (sectionIds.includes(nodeDatum.id)) {
      fill = nodeDatum.id==='100' ? '#007bff'
           : nodeDatum.id==='101' ? '#28a745'
           : '#ff9999';
    }

    return (
      <g
        onClick={() => handleClick(nodeDatum)}
        onMouseEnter={evt => {
          if (nodeDatum.email) {
            setTooltip({
              visible: true,
              x: evt.clientX + 10,
              y: evt.clientY + 10,
              email: `Business mail: ${nodeDatum.email}`,
            });
          }
        }}
        onMouseMove={evt => {
          if (tooltip.visible) {
            setTooltip(t => ({ ...t, x: evt.clientX + 10, y: evt.clientY + 10 }));
          }
        }}
        onMouseLeave={() => setTooltip({ visible:false, x:0, y:0, email:'' })}
        style={{ cursor: nodeDatum.email ? 'pointer'
                            : sectionIds.includes(nodeDatum.id) ? 'pointer'
                            : 'default' }}
      >
        <rect x={-80} y={-30} width={160} height={60} rx={8} ry={8}
              fill={fill} stroke="#444" strokeWidth={1.5} />
        <text x={0} y={-6} textAnchor="middle" dominantBaseline="middle"
              style={{ fontFamily:'맑은 고딕', fontSize:13, fontWeight:'normal' }}>
          {nodeDatum.이름}
        </text>
        <text x={0} y={14} textAnchor="middle" dominantBaseline="middle"
              style={{ fontFamily:'맑은 고딕', fontSize:11, fill:'#555' }}>
          {nodeDatum.직책}
        </text>
        {sectionIds.includes(nodeDatum.id) && (
          <text x={0} y={14} textAnchor="middle" dominantBaseline="middle"
                style={{ fontFamily:'맑은 고딕', fontSize:10 }}>
            [{openSection===nodeDatum.id?'Collapse':'Expand'}]
          </text>
        )}
      </g>
    );
  };

  return (
    <div ref={containerRef} style={{ width:'100%', height:'100%', position:'relative' }}>
      <Tree
        ref={treeRef}
        data={filteredTree}
        orientation="horizontal"
        translate={{ x: window.innerWidth/2, y: 100 }}
        zoomable
        collapsible={false}
        pathFunc="elbow"
        renderCustomNodeElement={renderNode}
        nodeSize={{ x:200, y:80 }}
        separation={{ siblings:1, nonSiblings:1 }}
        styles={{ links:{ stroke:'#555', strokeWidth:1.5 } }}
      />

      {tooltip.visible && (
        <div style={{
          position:'fixed',
          top:tooltip.y,
          left:tooltip.x,
          background:'#fff',
          border:'1px solid #ccc',
          padding:'4px 8px',
          borderRadius:'4px',
          pointerEvents:'none',
          boxShadow:'0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {tooltip.email}
        </div>
      )}
    </div>
  );
}
