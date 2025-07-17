import React, { useEffect, useState } from 'react';
import OrgChart from './OrgChart';
import Papa from 'papaparse';
import { openDB } from 'idb';
//test
export default function App() {
  const [treeData, setTreeData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  // IndexedDB에서 데이터 불러오기
  async function loadData() {
    const db = await openDB('OrgChartDB', 1, {
      upgrade(db) {
        db.createObjectStore('orgchart');
      },
    });
    const data = await db.get('orgchart', 'tree');

    if (data) {
      const tree = buildTree(data);
      setTreeData(tree);
    } else {
      const response = await fetch(`${import.meta.env.BASE_URL}users.csv`);
      const text = await response.text();
      Papa.parse(text, {
        header: true,
        complete: async (results) => {
          const users = results.data;
          await saveData(users);
          const tree = buildTree(users);
          setTreeData(tree);
        },
      });
    }
  }

  // IndexedDB에 저장
  async function saveData(data) {
    const db = await openDB('OrgChartDB', 1, {
      upgrade(db) {
        db.createObjectStore('orgchart');
      },
    });
    await db.put('orgchart', data, 'tree');
  }

  // IndexedDB 초기화 및 페이지 리로드
  async function resetData() {
    const db = await openDB('OrgChartDB', 1, {
      upgrade(db) {
        db.createObjectStore('orgchart');
      },
    });
    await db.delete('orgchart', 'tree');
    window.location.reload();
  }

  // CSV 데이터를 트리 구조로 변환
  function buildTree(users) {
    const map = {};
    const roots = [];
    users.forEach(u => {
      if (u.id?.trim()) {
        if (u.id?.trim()) {
          map[u.id] = {
          id: u.id,
          이름: u.이름,
          직책: u.직책,
          팀: u.팀,
          법인: u.법인,
          // CSV 헤더가 '이메일'이든 'email'이든 둘 다 체크
          email: u.이메일 || u.email || null,
          children: [],
          };
          }
      }
    });
    users.forEach(u => {
      const child = map[u.id];
      const parent = map[u.manager_id];
      if (child && parent && u.manager_id !== u.id) {
        parent.children.push(child);
      } else if (child) {
        roots.push(child);
      }
    });
    Object.values(map).forEach(node => {
      if (node.children.length > 0 && !node.법인) {
        node.법인 = node.children[0].법인;
      }
    });
    return roots.length === 1 ? roots[0] : roots;
  }

  return (
    <div>
      {/* 고정 헤더 */}
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%',
        padding: '1rem', background: '#fff', zIndex: 1000,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, flex: 1 }}>SHINTS Organization Chart</h1>
        <label style={{ marginRight: '1rem' }}>
          Search:
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter a name"
            style={{ marginLeft: '0.5rem' }}
          />
        </label>
        <button onClick={resetData} style={{ padding: '0.5rem 1rem' }}>
          🔄 Data Reset
        </button>
      </div>

      {/* OrgChart 렌더 영역 */}
      <div style={{ marginTop: '80px', width: '100vw', height: 'calc(100vh - 80px)' }}>
        {treeData ? (
          <OrgChart data={treeData} searchQuery={searchQuery} />
        ) : (
          <p style={{ padding: '2rem' }}>
            Organization chart data is missing or not loaded.
            <br />
            (처음 접속 시 public/users.csv 로 자동 로드됩니다)
          </p>
        )}
      </div>
    </div>
  );
}
