import { Request, Response } from 'express';
import { UserProfile } from '../../repository/user.repository';

const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);

export async function createCustomerPortalSession(req: Request, res: Response) {
  const {user} = (req as any);
  const { returnURL } = req.body;

  let customerId: string;
  try {
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create({
        email: user.email,
      });
      customerId = newCustomer.id;
    }
  } catch (error) {
    console.error('Stripe customer error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnURL,
    });
    return res.status(200).json(session);
  } catch (error) {
    console.error('Stripe session error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
