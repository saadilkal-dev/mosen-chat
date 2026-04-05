'use client';
export default function Home() {
  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 40,
      fontFamily: "'DM Sans',system-ui,sans-serif", background: '#FAFAF8', padding: 32
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EAE8FC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" fill="#534AB7" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="8" r="2" fill="#EAE8FC" />
            </svg>
          </div>
          <span style={{ fontSize: 26, fontWeight: 700, color: '#1A1A18', letterSpacing: '-0.02em' }}>Mosen</span>
        </div>
        <div style={{ fontSize: 14, color: '#999', lineHeight: 1.7, maxWidth: 280 }}>
          An AI change partner.<br />Choose your role below.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <a href="/leader" style={{ textDecoration: 'none' }}>
          <div style={{
            padding: '22px 28px', borderRadius: 18, border: '1px solid #D8D5F5', background: '#F6F5FF',
            cursor: 'pointer', textAlign: 'center', width: 200, transition: 'all .2s'
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 28px #534AB718'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>🧭</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#534AB7', marginBottom: 6 }}>I'm a Leader</div>
            <div style={{ fontSize: 12, color: '#888', lineHeight: 1.55 }}>Navigate strategy and people through change</div>
          </div>
        </a>
        <a href="/employee" style={{ textDecoration: 'none' }}>
          <div style={{
            padding: '22px 28px', borderRadius: 18, border: '1px solid #C5EBE0', background: '#F0FAF6',
            cursor: 'pointer', textAlign: 'center', width: 200, transition: 'all .2s'
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 28px #1D9E7518'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>💬</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1D9E75', marginBottom: 6 }}>I'm an Employee</div>
            <div style={{ fontSize: 12, color: '#888', lineHeight: 1.55 }}>Talk through change safely and honestly</div>
          </div>
        </a>
      </div>

      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
    </div>
  );
}
