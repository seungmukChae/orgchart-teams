// App.jsx
import React, { useEffect, useState } from 'react';
import OrgChart from './OrgChart';
import Papa from 'papaparse';
import { openDB } from 'idb';

export default function App() {
  const [treeData, setTreeData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  // ... loadData, saveData, resetData 그대로 유지 ...

  return (
    <div>
      {/* 고정 타이틀 + 컨트롤바 */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        padding: '1rem',
        background: '#fff',
        zIndex: 1000,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center'
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
        <button
          onClick={() => setSearchQuery('')}
          style={{ padding: '0.5rem 1rem', marginRight: '1rem' }}
        >
          Reset
        </button>
        <button onClick={resetData} style={{ padding: '0.5rem 1rem' }}>
          🔄 Data Reset
        </button>
      </div>

      {/* OrgChart 렌더 영역 (헤더 높이만큼 여백) */}
      <div style={{
        marginTop: '80px',
        width: '100vw',
        height: 'calc(100vh - 80px)',
      }}>
        {treeData
          ? <OrgChart data={treeData} searchQuery={searchQuery} />
          : (
            <p style={{ padding: '2rem' }}>
              Organization chart data is missing or not loaded.
              <br />
              (처음 접속 시 public/users.csv 로 자동 로드됩니다)
            </p>
          )
        }
      </div>
    </div>
  );
}
