import { useState } from 'react'

export default function ShareInitiativeModal({ initiativeId, initiativeTitle, currentIsPublic = false, onClose, onPublish }) {
  const [isPublic, setIsPublic] = useState(currentIsPublic)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handlePublish = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/initiative/${initiativeId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: isPublic }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to publish initiative')
      }

      const data = await res.json()
      onPublish(data)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <button
          onClick={onClose}
          style={styles.closeBtn}
          aria-label="Close"
        >
          ✕
        </button>

        <h2 style={styles.title}>{currentIsPublic ? 'Update sharing' : 'Share with your team'}</h2>

        <div style={styles.content}>
          <p style={styles.subtitle}>
            {currentIsPublic
              ? `"${initiativeTitle}" is currently shared with your team. You can change this below.`
              : `How would you like to share "${initiativeTitle}"?`}
          </p>

          <div style={styles.optionContainer}>
            <button
              onClick={() => setIsPublic(true)}
              style={{
                ...styles.option,
                ...(isPublic ? styles.optionSelected : styles.optionUnselected),
              }}
            >
              <div style={styles.optionTitle}>📢 Make Public (Team-Wide)</div>
              <div style={styles.optionDesc}>
                All organization members will receive an invite to join the conversation.
              </div>
              {isPublic && <div style={styles.checkmark}>✓</div>}
            </button>

            <button
              onClick={() => setIsPublic(false)}
              style={{
                ...styles.option,
                ...(!isPublic ? styles.optionSelected : styles.optionUnselected),
              }}
            >
              <div style={styles.optionTitle}>🔒 Keep Private (Draft)</div>
              <div style={styles.optionDesc}>
                Only you can see this initiative. Share later when ready.
              </div>
              {!isPublic && <div style={styles.checkmark}>✓</div>}
            </button>
          </div>

          {isPublic && (
            <div style={styles.infoBox}>
              <p>
                <strong>Transparency builds trust.</strong> When leaders share openly about change,
                employees feel heard and included. This creates psychological safety and increases
                willingness to engage.
              </p>
            </div>
          )}

          {error && (
            <div style={styles.errorBox}>
              {error}
            </div>
          )}
        </div>

        <div style={styles.actions}>
          <button
            onClick={onClose}
            style={styles.secondaryBtn}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            style={styles.primaryBtn}
            disabled={loading}
          >
            {loading ? 'Saving…' : currentIsPublic ? 'Update' : 'Share Initiative'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    fontFamily: "'DM Sans', sans-serif",
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    maxWidth: '500px',
    width: '90%',
    padding: '32px',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#999',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    margin: '0 0 8px 0',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: '0 0 24px 0',
  },
  content: {
    marginBottom: '24px',
  },
  optionContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '24px',
  },
  option: {
    padding: '20px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    position: 'relative',
  },
  optionSelected: {
    borderColor: '#534AB7',
    backgroundColor: '#f8f4ff',
  },
  optionUnselected: {
    backgroundColor: '#f9f9f9',
  },
  optionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: '8px',
  },
  optionDesc: {
    fontSize: '14px',
    color: '#666',
  },
  checkmark: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    fontSize: '20px',
    color: '#534AB7',
  },
  infoBox: {
    backgroundColor: '#f0e6ff',
    border: '1px solid #d9c8ff',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    fontSize: '14px',
    color: '#333',
  },
  errorBox: {
    backgroundColor: '#fff0f0',
    border: '1px solid #ffcccc',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
    color: '#cc0000',
    fontSize: '14px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  primaryBtn: {
    padding: '10px 20px',
    backgroundColor: '#534AB7',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'background-color 0.2s ease',
  },
  secondaryBtn: {
    padding: '10px 20px',
    backgroundColor: '#f0f0f0',
    color: '#333',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'background-color 0.2s ease',
  },
}
