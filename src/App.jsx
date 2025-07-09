import { useEffect, useState } from 'react';
import OrgChart from './OrgChart';
import Papa from 'papaparse';
import { openDB } from 'idb';

export default function App() {
  const [treeData, setTreeData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // 1) 관리자 모드 감지
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === import.meta.env.VITE_ADMIN_KEY) {
      setIsAdmin(true);
    }

    loadData();
  }, []);

  // 2) IndexedDB 에서 데이터 불러오기
  async function loadData() {
    const db = await openDB('OrgChartDB', 1, {
      upgrade(db) {
        db.createObjectStore('orgchart');
      },
    });
    const data = await db.get('orgchart', 'tree');
    if (data) {
      setTreeData(data);
    }
  }

  // 3) IndexedDB에 저장
  async function saveData(data) {
    const db = await openDB('OrgChartDB', 1, {
      upgrade(db) {
        db.createObjectStore('orgchart');
      },
    });
    await db.put('orgchart', data, 'tree');
  }

  // 4) CSV 업로드 핸들러
  function handleFileUpload(event) {
    const file = event.target.files[0];
    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        console.log('CSV 결과:', results.data);
        const users = results.data;

        // CSV → 트리로 변환
        const tree = buildTree(users);

        // 저장
        await saveData(tree);

        // 화면 갱신
        setTreeData(tree);
      },
    });
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>조직도 (CSV 버전)</h1>

      {isAdmin && (
        <div>
          <p>✅ 관리자 모드</p>
          <input type="file" accept=".csv" onChange={handleFileUpload} />
        </div>
      )}

      {treeData && (
        <OrgChart data={treeData} />
      )}

      {!treeData && (
        <p>조직도 데이터가 없습니다. (관리자가 CSV를 업로드하면 저장됩니다)</p>
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

  return roots.length === 1 ? roots[0] : roots; // 루트 하나면 하나만
}
