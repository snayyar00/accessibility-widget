import database from '../config/database.config'
import { TABLES } from '../constants/database.constant'

const TABLE = TABLES.newsletterSubscribers

export const newsletterSubscribersColumns = {
  id: 'newsletter_subscribers.id',
  email: 'newsletter_subscribers.email',
  created_at: 'newsletter_subscribers.created_at',
  updated_at: 'newsletter_subscribers.updated_at',
}

export async function addNewsletterSub(email: string) {
  return database(TABLE).insert({ email }).onConflict('email').ignore()
}

/**
 * Check if a user is subscribed to the newsletter
 */
export async function isSubscribedToNewsletter(email: string): Promise<boolean> {
  try {
    const result = await database(TABLE).where({ email }).first()

    return !!result // Returns true if subscriber exists, false otherwise
  } catch (error) {
    console.error('Error checking newsletter subscription:', error)
    return false // Default to false on error to avoid sending unwanted emails
  }
}

/**
 * Unsubscribe a user from the newsletter
 */
export async function unsubscribeFromNewsletter(email: string): Promise<boolean> {
  try {
    const deletedCount = await database(TABLE).where({ email }).del()

    return deletedCount > 0 // Returns true if a record was deleted
  } catch (error) {
    console.error('Error unsubscribing from newsletter:', error)
    return false
  }
}
