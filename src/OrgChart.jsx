import React, { useState, useEffect, useRef, useCallback } from 'react';
import Tree from 'react-d3-tree';

export default function OrgChart({ data, searchQuery }) {
  const containerRef = useRef(null);
  const treeRef = useRef(null);
  const [translate, setTranslate] = useState({ x: 0, y: 100 });
  const [openSection, setOpenSection] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, email: '' });
  const sectionIds = ['100', '101', '102'];

  // 컨테이너 리사이즈 시 중앙 정렬 계산
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const { width } = containerRef.current.getBoundingClientRect();
      setTranslate({ x: width / 2, y: 100 });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 트리 빌드: 검색 필터 + 섹션 토글 반영
  const buildTree = useCallback(
    (node) => {
      if (!node) return null;
      const term = searchQuery.trim().toLowerCase();
      const match =
        !term ||
        node.이름?.toLowerCase().includes(term) ||
        node.직책?.toLowerCase().includes(term);

      let children = (node.children || []).map(buildTree).filter(Boolean);
      if (sectionIds.includes(node.id) && !term) {
        children = openSection === node.id ? children : [];
      }
      if (node === data) return { ...node, children };
      if (match || children.length) return { ...node, children };
      return null;
    },
    [searchQuery, openSection, data]
  );
  const treeData = buildTree(data);

  // 노드 클릭: 섹션 토글 or 이메일 복사
  const handleClick = (nodeDatum) => {
    if (sectionIds.includes(nodeDatum.id)) {
      setOpenSection((prev) => (prev === nodeDatum.id ? null : nodeDatum.id));
    } else if (nodeDatum.email) {
      navigator.clipboard.writeText(nodeDatum.email);
    }
  };

  // 검색 후 포커스 이동
  useEffect(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term || !treeRef.current || !treeData) return;
    const findNode = (node) => {
      if (!node) return null;
      if (
        node.이름?.toLowerCase().includes(term) ||
        node.직책?.toLowerCase().includes(term)
      ) {
        return node;
      }
      if (node.children) {
        for (let child of node.children) {
          const found = findNode(child);
          if (found) return found;
        }
      }
      return null;
    };
    const matchNode = findNode(treeData);
    if (matchNode && treeRef.current.centerNode) {
      treeRef.current.centerNode(matchNode.id);
    }
  }, [searchQuery, treeData, data]);

  // 검색 취소 시 루트 재중앙 정렬
  useEffect(() => {
    if (searchQuery.trim() === '' && treeRef.current?.centerNode) {
      treeRef.current.centerNode(data.id);
    }
  }, [searchQuery, data]);

  // 노드 렌더링 스타일
  const baseText = {
    fontFamily: '맑은 고딕',
    fontWeight: 'normal',
    fill: '#000',
    letterSpacing: '0.5px',
  };

  const renderNode = ({ nodeDatum }) => {
    const idNum = parseInt(nodeDatum.id, 10);
    let fill = idNum >= 100 && idNum <= 199 ? '#ffa500' : '#e0e0e0';
    if (sectionIds.includes(nodeDatum.id)) {
      fill =
        nodeDatum.id === '100'
          ? '#007bff'
          : nodeDatum.id === '101'
          ? '#28a745'
          : '#ff9999';
    }
    return (
      <g
        onClick={() => handleClick(nodeDatum)}
        onMouseEnter={(evt) => {
          if (nodeDatum.email) {
            setTooltip({
              visible: true,
              x: evt.clientX + 10,
              y: evt.clientY + 10,
              email: `Business mail: ${nodeDatum.email}`,
            });
          }
        }}
        onMouseMove={(evt) => {
          if (tooltip.visible) {
            setTooltip((t) => ({ ...t, x: evt.clientX + 10, y: evt.clientY + 10 }));
          }
        }}
        onMouseLeave={() => setTooltip({ visible: false, x: 0, y: 0, email: '' })}
        style={{ cursor: nodeDatum.email ? 'pointer' : 'default' }}
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
          style={{ ...baseText, fontSize: 13 }}
        >
          {nodeDatum.이름}
        </text>
        <text
          x={0}
          y={14}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ ...baseText, fontSize: 11, fill: '#555' }}
        >
          {nodeDatum.직책}
        </text>
        {sectionIds.includes(nodeDatum.id) && (
          <text
            x={0}
            y={14}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ ...baseText, fontSize: 10 }}
          >
            [{openSection === nodeDatum.id ? 'Collapse' : 'Expand'}]
          </text>
        )}
      </g>
    );
  };

  return (
    <div
      className="orgchart-container"
      style={{ width: '100%', height: '100%' }}
      ref={containerRef}
    >
      {treeData ? (
        <Tree
          ref={treeRef}
          data={treeData}
          orientation="horizontal"
          translate={translate}
          zoomable
          collapsible={false}
          pathFunc="elbow"
          renderCustomNodeElement={renderNode}
          nodeSize={{ x: 200, y: 80 }}
          separation={{ siblings: 1, nonSiblings: 1 }}
          styles={{ links: { stroke: '#555', strokeWidth: 1.5 } }}
        />
      ) : (
        <div style={{ padding: '2rem', color: '#888' }}>
          Sorry, we couldn’t find any results.
        </div>
      )}
      {tooltip.visible && (
        <div
          style={{
            position: 'absolute',
            top: tooltip.y,
            left: tooltip.x,
            background: '#fff',
            border: '1px solid #ccc',
            padding: '4px 8px',
            borderRadius: '4px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          {tooltip.email}
        </div>
      )}
    </div>
  );
}
