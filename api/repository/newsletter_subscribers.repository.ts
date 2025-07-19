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
