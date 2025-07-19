import { Request, Response } from 'express';
import Stripe from 'stripe';
import { UserProfile } from '../../repository/user.repository';

const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);

export async function createBillingPortalSession(req: Request, res: Response) {
  try {
    const user: UserProfile = (req as any).user;
    const { returnURL } = req.body;

    // Search for an existing customer by email
    let customers;
    try {
      customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });
    } catch (error) {
      console.error('Stripe customers.list error:', error);
      return res.status(500).json({ error: 'Failed to fetch Stripe customer' });
    }

    let customer;
    // Check if customer exists
    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      try {
        customer = await stripe.customers.create({
          email: user.email,
        });
      } catch (error) {
        console.error('Stripe customers.create error:', error);
        return res.status(500).json({ error: 'Failed to create Stripe customer' });
      }
    }

    let subscriptions, trialingSubscriptions;
    try {
      subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 100,
      });

      trialingSubscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'trialing',
        limit: 100,
      });
    } catch (error) {
      console.error('Stripe subscriptions.list error:', error);
      return res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }

    // Merge trialing subscriptions into active subscriptions
    subscriptions.data.push(...trialingSubscriptions.data);

    if (subscriptions.data.length !== 0) {
      let prices;
      try {
        prices = await stripe.prices.list({
          limit: 50,
        });
      } catch (error) {
        console.error('Stripe prices.list error:', error);
        return res.status(500).json({ error: 'Failed to fetch prices' });
      }

      let usablePrices;
      try {
        usablePrices = await Promise.all(
          prices.data.map(async (price: Stripe.Price) => {
            if (price?.tiers_mode === 'graduated' && price?.recurring?.usage_type === 'licensed') {
              const product = await stripe.products.retrieve(price.product as string);
              if (product.name.toLowerCase().includes('app sumo')) {
                return null;
              }
              return price;
            }
            return null;
          }),
        );
      } catch (error) {
        console.error('Stripe products.retrieve error:', error);
        return res.status(500).json({ error: 'Failed to process prices' });
      }

      usablePrices = usablePrices.filter((price: Stripe.Price) => price !== null);
      const productPriceArray: any = [];
      const productMap = new Map();

      usablePrices.forEach((price: Stripe.Price) => {
        if (!productMap.has(price.product)) {
          productMap.set(price.product, []);
        }
        productMap.get(price.product).push(price);
      });

      productMap.forEach((pricesArr, productId) => {
        productPriceArray.push({
          product: productId,
          prices: pricesArr.map((price: Stripe.Price) => price.id),
        });
      });

      let configurations;

      try {
        configurations = await stripe.billingPortal.configurations.list({
          is_default: true,
        });
      } catch (error) {
        console.error('Stripe billingPortal.configurations.list error:', error);
        return res.status(500).json({ error: 'Failed to fetch billing portal configurations' });
      }

      // Check if there is at least one configuration
      if (!configurations.data || configurations.data.length === 0) {
        console.error('No billing portal configurations found');
        return res.status(500).json({ error: 'No billing portal configurations found' });
      }

      let configuration: any = {};

      try {
        configuration = await stripe.billingPortal.configurations.update(configurations.data[0].id, {
          features: {
            subscription_update: { enabled: false },
            subscription_cancel: { enabled: false },
          },
        });
      } catch (error) {
        console.error('Stripe billingPortal.configurations.update error:', error);
        return res.status(500).json({ error: 'Failed to update billing portal configuration' });
      }

      try {
        const session = await stripe.billingPortal.sessions.create({
          customer: customer.id,
          return_url: returnURL,
          configuration: configuration.id,
        });
        return res.status(200).json(session);
      } catch (error) {
        console.error('Stripe billingPortal.sessions.create error:', error);
        return res.status(500).json({ error: 'Failed to create billing portal session' });
      }
    } else {
      try {
        const session = await stripe.billingPortal.sessions.create({
          customer: customer.id,
          return_url: returnURL,
        });
        return res.status(200).json(session);
      } catch (error) {
        console.error('Stripe billingPortal.sessions.create error:', error);
        return res.status(500).json({ error: 'Failed to create billing portal session' });
      }
    }
  } catch (error) {
    console.error('Unexpected error in /billing-portal-session:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
