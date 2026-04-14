'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'

export default function EmployeeDashboard() {
  const { userId, isLoaded } = useAuth()
  const [initiatives, setInitiatives] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isLoaded) return

    const fetchInitiatives = async () => {
      try {
        const res = await fetch('/api/employee/initiatives')
        if (!res.ok) throw new Error('Failed to load initiatives')
        const data = await res.json()
        setInitiatives(data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchInitiatives()
  }, [isLoaded])

  if (!isLoaded) {
    return <div style={styles.center}>Loading...</div>
  }

  if (!userId) {
    return (
      <div style={styles.center}>
        <p>Please sign in to view initiatives.</p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Change Initiatives</h1>
          <p style={styles.subtitle}>
            See changes happening in your organization and share your perspective
          </p>
        </div>
      </header>

      {error && (
        <div style={styles.errorBox}>
          {error}
        </div>
      )}

      {loading && (
        <div style={styles.center}>
          <p>Loading initiatives...</p>
        </div>
      )}

      {!loading && initiatives.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📭</div>
          <h3 style={styles.emptyTitle}>No initiatives yet</h3>
          <p style={styles.emptyDesc}>
            When your team shares a change initiative, you'll see it here.
          </p>
        </div>
      )}

      {!loading && initiatives.length > 0 && (
        <div style={styles.initiativesGrid}>
          {initiatives.map((init) => (
            <Link
              key={init.id}
              href={`/initiative/${init.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>{init.title}</h3>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: getStatusColor(init.status),
                  }}>
                    {getStatusLabel(init.status)}
                  </span>
                </div>

                <p style={styles.cardLeader}>
                  Led by <strong>{init.leader_name || 'Your leader'}</strong>
                </p>

                <p style={styles.cardBrief}>
                  {init.brief_excerpt || init.brief_summary || 'View the full brief in the initiative.'}
                </p>

                <div style={styles.cardFooter}>
                  <button style={styles.viewBtn}>
                    View & Chat →
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function getStatusColor(status) {
  const colors = {
    'pending': '#ffe6cc',
    'in-progress': '#cce5ff',
    'voted': '#ccffe6',
    'closed-loop': '#f0e6ff',
  }
  return colors[status] || '#f0f0f0'
}

function getStatusLabel(status) {
  const labels = {
    'pending': 'Awaiting feedback',
    'in-progress': 'In progress',
    'voted': 'Feedback collected',
    'closed-loop': 'Leader responded',
  }
  return labels[status] || status
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#fafaf8',
    fontFamily: "'DM Sans', sans-serif",
  },
  header: {
    backgroundColor: 'white',
    borderBottom: '1px solid #ebebea',
    padding: '40px 32px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    margin: '0 0 8px',
    color: '#1a1a18',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: 0,
  },
  errorBox: {
    margin: '24px 32px',
    padding: '16px',
    backgroundColor: '#fff0f0',
    border: '1px solid #ffcccc',
    borderRadius: '8px',
    color: '#cc0000',
    fontSize: '14px',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    color: '#666',
    fontSize: '16px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    padding: '32px',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1a1a18',
    margin: '0 0 8px',
  },
  emptyDesc: {
    fontSize: '15px',
    color: '#666',
    margin: 0,
  },
  initiativesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px',
    padding: '32px',
  },
  card: {
    backgroundColor: 'white',
    border: '1px solid #ebebea',
    borderRadius: '12px',
    padding: '24px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
    gap: '12px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1a1a18',
    margin: 0,
    flex: 1,
  },
  statusBadge: {
    fontSize: '12px',
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: '4px',
    whiteSpace: 'nowrap',
    color: '#333',
  },
  cardLeader: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 12px',
  },
  cardBrief: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.5',
    margin: '0 0 16px',
    flex: 1,
  },
  cardFooter: {
    marginTop: 'auto',
  },
  viewBtn: {
    backgroundColor: '#1d9e75',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    width: '100%',
  },
}
