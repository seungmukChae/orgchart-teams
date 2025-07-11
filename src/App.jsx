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
      const tree = buildTree(data);
      console.log('✅ Final tree:', JSON.stringify(tree, null, 2));
      setTreeData(tree);
    } else {
      // ✅ 없으면 public/users.csv 가져오기 (base 포함!)
      const response = await fetch(`${import.meta.env.BASE_URL}users.csv`);
      const text = await response.text();

      Papa.parse(text, {
        header: true,
        complete: async (results) => {
          console.log('🌱 기본 CSV:', results.data);
          const users = results.data;
          await saveData(users); // 원본 users 저장
          const tree = buildTree(users);
          console.log('✅ Final tree:', JSON.stringify(tree, null, 2));
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

  // 3️⃣ IndexedDB 초기화
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
      <button onClick={resetData}>🔄 데이터 초기화</button>

      {treeData && <OrgChart data={treeData} />}

      {!treeData && (
        <p>
          조직도 데이터가 없습니다.
          <br />
          (처음 접속 시 public/users.csv 로 자동 로드됩니다)
        </p>
      )}
    </div>
  );
}

// ✅ CSV → 안전한 트리 변환
function buildTree(users) {
  const map = {};
  const roots = [];

  // 1️⃣ 안전: ID 없는 노드 무시
  users.forEach(u => {
    if (u.id && u.id.trim()) {
      map[u.id] = {
        id: u.id,
        name: `${u.이름} (${u.직책}, ${u.팀})`,
        children: [],
      };
    }
  });

  // 2️⃣ 부모 연결 (자기참조 방지)
  users.forEach(u => {
    const childNode = map[u.id];
    const parentNode = map[u.manager_id];

    if (
      childNode &&
      parentNode &&
      u.manager_id !== u.id // ✅ 자기 자신이 상사로 지정되면 무시
    ) {
      parentNode.children.push(childNode);
    } else if (childNode) {
      roots.push(childNode);
    }
  });

  const result = roots.length === 1 ? roots[0] : roots;
  console.log('✅ Final tree:', JSON.stringify(result, null, 2));
  return result;
}