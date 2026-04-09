export const ROLES = {
  LEADER: 'leader',
  EMPLOYEE: 'employee',
  ADMIN: 'admin',
}

export const INITIATIVE_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  CLOSED: 'closed',
}

export const CONSENT_STATUS = {
  PENDING: 'pending',
  GRANTED: 'granted',
  DENIED: 'denied',
}

export const MIN_SYNTHESIS_THRESHOLD = 3

export const CULTURE_PILLARS = [
  'Inclusion',
  'Empathy',
  'Vulnerability',
  'Trust',
  'Empowerment',
  'Forgiveness',
]

export const SESSION_TTL = 604800       // 7 days in seconds
export const DATA_TTL = 15552000        // 180 days in seconds
export const INVITE_TTL = 2592000       // 30 days in seconds
