export const INVITATION_STATUS_PENDING = 'pending'
export const INVITATION_STATUS_ACCEPTED = 'accepted'
export const INVITATION_STATUS_DECLINED = 'declined'
export const INVITATION_STATUS_EXPIRED = 'expired'

export type InvitationStatus = typeof INVITATION_STATUS_PENDING | typeof INVITATION_STATUS_ACCEPTED | typeof INVITATION_STATUS_DECLINED | typeof INVITATION_STATUS_EXPIRED
