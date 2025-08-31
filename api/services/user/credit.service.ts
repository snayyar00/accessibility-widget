import logger from '../../utils/logger';

const DEFAULT_FREE_CREDITS = 25;
const COST_PER_EMAIL = 1; // 1 credit per email discovery

export interface CreditResult {
  success: boolean;
  remainingCredits: number;
  message?: string;
}

// In-memory storage for user credits (for demo purposes)
const userCredits = new Map<number, number>();

class CreditService {
  /**
   * Get user's current credit balance
   */
  async getUserCredits(userId: number): Promise<number> {
    try {
      // If user doesn't exist in memory, initialize with default credits
      if (!userCredits.has(userId)) {
        userCredits.set(userId, DEFAULT_FREE_CREDITS);
        logger.info(`Initialized ${DEFAULT_FREE_CREDITS} credits for user ${userId}`);
      }

      return userCredits.get(userId) || DEFAULT_FREE_CREDITS;
    } catch (error) {
      logger.error('Error getting user credits:', error);
      return DEFAULT_FREE_CREDITS;
    }
  }

  /**
   * Initialize user credits (typically 25 free credits for new users)
   */
  async initializeUserCredits(userId: number, credits: number = DEFAULT_FREE_CREDITS): Promise<void> {
    try {
      userCredits.set(userId, credits);
      logger.info(`Initialized ${credits} credits for user ${userId}`);
    } catch (error) {
      logger.error('Error initializing user credits:', error);
      throw error;
    }
  }

  /**
   * Deduct credits for email discovery
   */
  async deductCreditsForEmail(userId: number): Promise<CreditResult> {
    try {
      const currentCredits = await this.getUserCredits(userId);

      if (currentCredits < COST_PER_EMAIL) {
        return {
          success: false,
          remainingCredits: currentCredits,
          message: 'Insufficient credits. Please upgrade your account.'
        };
      }

      const newCredits = currentCredits - COST_PER_EMAIL;
      userCredits.set(userId, newCredits);

      logger.info(`Deducted ${COST_PER_EMAIL} credit for user ${userId}, remaining: ${newCredits}`);

      return {
        success: true,
        remainingCredits: newCredits
      };
    } catch (error) {
      logger.error('Error deducting credits:', error);
      throw error;
    }
  }

  /**
   * Add credits to user account (for upgrades/purchases)
   */
  async addCredits(userId: number, creditsToAdd: number): Promise<CreditResult> {
    try {
      const currentCredits = await this.getUserCredits(userId);
      const newCredits = currentCredits + creditsToAdd;
      userCredits.set(userId, newCredits);

      logger.info(`Added ${creditsToAdd} credits for user ${userId}, new balance: ${newCredits}`);

      return {
        success: true,
        remainingCredits: newCredits
      };
    } catch (error) {
      logger.error('Error adding credits:', error);
      throw error;
    }
  }

  /**
   * Check if user has enough credits for an operation
   */
  async hasEnoughCredits(userId: number, requiredCredits: number = COST_PER_EMAIL): Promise<boolean> {
    try {
      const currentCredits = await this.getUserCredits(userId);
      return currentCredits >= requiredCredits;
    } catch (error) {
      logger.error('Error checking credits:', error);
      return false;
    }
  }
}

export default new CreditService();