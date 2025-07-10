import { useEffect, useState } from 'react';
import OrgChart from './OrgChart';
import Papa from 'papaparse';
import { openDB } from 'idb';

export default function App() {
  const [treeData, setTreeData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  // 1️⃣ IndexedDB에서 데이터 불러오기
  async function loadData() {
    const db = await openDB('OrgChartDB', 1, {
      upgrade(db) {
        db.createObjectStore('orgchart');
      },
    });
    const data = await db.get('orgchart', 'tree');
    if (data) {
      console.log('📦 IndexedDB에서 불러옴:', data);
      setTreeData(data);
    } else {
      // ✅ 없으면 public/users.csv 가져오기
      const response = await fetch('/users.csv');
      const text = await response.text();

      Papa.parse(text, {
        header: true,
        complete: async (results) => {
          console.log('🌱 기본 CSV:', results.data);
          const tree = buildTree(results.data);
          await saveData(tree);
          setTreeData(tree);
        },
      });
    }
  }

  // 2️⃣ IndexedDB에 저장
  async function saveData(data) {
    const db = await openDB('OrgChartDB', 1, {
      upgrade(db) {
        db.createObjectStore('orgchart');
      },
    });
    await db.put('orgchart', data, 'tree');
  }

  // 3️⃣ IndexedDB 초기화 버튼
  async function resetData() {
    const db = await openDB('OrgChartDB', 1, {
      upgrade(db) {
        db.createObjectStore('orgchart');
      },
    });
    await db.delete('orgchart', 'tree');
    console.log('✅ IndexedDB 초기화됨');
    window.location.reload();
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>조직도 (CSV 버전)</h1>

      {/* ✅ ✅ ✅ 관리자 업로드 버튼 제거됨 */}
      {/* ✅ ✅ ✅ 초기화 버튼은 표시 */}
      <button onClick={resetData}>🔄 데이터 초기화</button>

      {treeData && (
        <OrgChart data={treeData} />
      )}

      {!treeData && (
        <p>조직도 데이터가 없습니다.<br/> (처음 접속 시 public/users.csv 로 자동 로드됩니다)</p>
      )}
    </div>
  );
}

// CSV → 트리 변환 함수
function buildTree(users) {
  const map = {};
  const roots = [];

  users.forEach(u => {
    map[u.id] = {
      name: `${u.이름} (${u.직책})`,
      children: [],
    };
  });

  users.forEach(u => {
    if (u.manager_id && u.manager_id.trim()) {
      const parent = map[u.manager_id];
      if (parent) {
        parent.children.push(map[u.id]);
      } else {
        roots.push(map[u.id]); // 부모 없으면 루트 취급
      }
    } else {
      roots.push(map[u.id]); // manager_id 없으면 루트 취급
    }
  });

  return roots.length === 1 ? roots[0] : roots; // 루트 하나면 하나만 반환
}
