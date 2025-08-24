import { findUser, updateUser, UserProfile } from '../../repository/user.repository'
import formatDateDB from '../../utils/format-date-db'

/**
 * Type for license owner information - only contains necessary fields
 */
export type LicenseOwnerInfo = {
  id: number
  name: string
  license_owner_email?: string
  phone_number?: string
}

/**
 * Get license owner information for a user
 * Returns only the necessary fields to prevent PII leakage
 */
export async function getLicenseOwnerInfo(userId: number): Promise<LicenseOwnerInfo | null> {
  try {
    const user = await findUser({ id: userId })

    if (!user) {
      throw new Error('User not found')
    }

    // Return only the necessary license owner fields
    // This prevents returning sensitive user data like email, password, etc.
    return {
      id: user.id!,
      name: user.name!,
      license_owner_email: user.license_owner_email,
      phone_number: user.phone_number,
    }
  } catch (error) {
    console.error('Error getting license owner info:', error)
    throw new Error('Failed to get license owner information')
  }
}

/**
 * Update license owner information for a user
 */
export async function updateLicenseOwnerInfo(userId: number, name?: string, license_owner_email?: string, phone_number?: string): Promise<{ success: boolean; message: string }> {
  try {
    // Check if user exists
    const existingUser = await findUser({ id: userId })

    if (!existingUser) {
      console.error('User not found with ID:', userId)
      return {
        success: false,
        message: 'User not found',
      }
    }

    // Prepare update data
    const updateData: Partial<UserProfile> = {}

    if (name !== undefined) updateData.name = name
    if (license_owner_email !== undefined) updateData.license_owner_email = license_owner_email
    if (phone_number !== undefined) updateData.phone_number = phone_number

    // Add updated_at timestamp using the project's date formatter
    updateData.updated_at = formatDateDB()

    // Update user and check if rows were affected
    const affectedRows = await updateUser(userId, updateData)

    if (affectedRows === 0) {
      return {
        success: false,
        message: 'No rows were updated - user may not exist or no changes detected',
      }
    }

    return {
      success: true,
      message: 'License owner information updated successfully',
    }
  } catch (error) {
    console.error('Error updating license owner info:', error)
    return {
      success: false,
      message: `Failed to update license owner information: ${error.message}`,
    }
  }
}
