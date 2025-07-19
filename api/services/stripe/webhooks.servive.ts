import { Request, Response } from 'express';
import Stripe from 'stripe';
import { createSitesPlan, deleteSitesPlan, deleteTrialPlan, updateSitesPlan } from '../allowedSites/plans-sites.service';
import { findProductById, findProductByStripeId, insertProduct, updateProduct } from '~/repository/products.repository';
import { getSitePlanBySiteId, getSitesPlanByCustomerIdAndSubscriptionId } from '~/repository/sites_plans.repository';

const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY!, {
  apiVersion: '2020-08-27', // TODO find out where this is in the Stripe dashboard and document
});

export const stripeWebhook = async (req: Request, res: Response, context:any) => {

  let event: Stripe.Event;

  try {
    try {
      const sig = req.headers['stripe-signature'];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      event = stripe.webhooks.constructEvent(req.body.toString(), sig, webhookSecret);
      
      
    } catch (error) {
      console.error('Could not Construct WebHook Event:', error);
      return res.status(400).send('Webhook signature verification failed.');
    }
    
    if (event.type === 'product.updated') {
      // Handles product save and update in DB when you do so from the stripe dashboard
      let product = event.data.object as Stripe.Product;

      console.log('product to be updated = ', product);

      const prices = await stripe.prices.list({
        product: product.id,
      });


      let findProduct;
      try {
        findProduct = await findProductByStripeId(product.id);
        console.log('found product = ', findProduct);
      } catch (error) {
        console.log('error in find', error);
      }

      if (findProduct) {
        //update product prices
        console.log('product exists update it');
        try {
          const productObject = { name: product.name, type: product.name.toLowerCase(), stripe_id: product.id };
          const pricesArray = await Promise.all(
            prices.data.map(async (getPrice) => {
              // Fetch the detailed price object with expanded tiers
              const price = await stripe.prices.retrieve(getPrice.id, {
                expand: ['tiers'], // Explicitly expand the tiers
              });
              if (price?.tiers?.length > 0){
                return {
                  amount: (price?.tiers?.[0]?.unit_amount / 100) * Number(price?.tiers[0]?.up_to),
                  type: getPrice?.recurring?.interval + 'ly', // e.g., 'monthly' or 'yearly'
                  stripe_id: getPrice?.id, // Stripe price ID
                };

              } else {
                return {
                  amount:price.unit_amount / 100,
                  type: getPrice?.recurring?.interval + 'ly', // e.g., 'monthly' or 'yearly'
                  stripe_id: getPrice?.id, // Stripe price ID
                };

              }
              
            }),
          );
          if (await updateProduct(findProduct?.id, productObject, pricesArray)) {
            console.log('Updated Product');
          } else {
            console.log('Updation Failed');
          }
        } catch (error) {
          console.log('error in update', error);
        }
      } else {
        try {
          console.log('inserting Product');
          const productObject = { name: product.name, type: product.name.toLowerCase(), stripe_id: product.id };
          const pricesArray = await Promise.all(
            prices.data.map(async (getPrice) => {
              // Fetch the detailed price object with expanded tiers
              const price = await stripe.prices.retrieve(getPrice.id, {
                expand: ['tiers'], // Explicitly expand the tiers
              });
              if (price?.tiers?.length > 0){
                return {
                  amount: (price?.tiers?.[0]?.unit_amount / 100) * Number(price?.tiers[0]?.up_to),
                  type: getPrice?.recurring?.interval + 'ly', // e.g., 'monthly' or 'yearly'
                  stripe_id: getPrice?.id, // Stripe price ID
                };

              } else {
                return {
                  amount:price.unit_amount / 100,
                  type: ['monthly', 'yearly'].includes(getPrice?.recurring?.interval + 'ly') ? getPrice?.recurring?.interval + 'ly' : 'monthly',  // e.g., 'monthly' or 'yearly'
                  stripe_id: getPrice?.id, // Stripe price ID
                };
              }
            }),
          );
          if (await insertProduct(productObject, pricesArray)) {
            console.log('inserted Product');
          } else {
            console.log('Insertion Failed');
          }
        } catch (error) {
          console.log('error in insert', error);
        }
      }
    } else if (event.type === 'customer.subscription.updated') {
      // Handles Subscription Updation
      console.log('Updating subscription');
      const subscription = event.data.object as Stripe.Subscription;

      if (subscription.metadata.hasOwnProperty('updateMetaData') && subscription.metadata.updateMetaData == 'true' ) {
        console.log('Updating Metadata to stop create sub (only update metadata)');
        const metadata = subscription.metadata;
        metadata.updateMetaData = 'false';
        await stripe.subscriptions.update(String(subscription.id), {
          metadata: metadata,
        });
      } else {
        console.log('Updating Metadata to stop update sub from stripe (update meta data and db)');

        const userStripeId = subscription.customer as string;
        const productId = subscription.items.data[0].plan.product as string;
        const interval = subscription.items.data[0].plan.interval == 'month' ? 'MONTHLY' : 'YEARLY';
        const new_product = await stripe.products.retrieve(productId);
        let previous_plan;
        try {
          previous_plan = await getSitesPlanByCustomerIdAndSubscriptionId(userStripeId, subscription?.id);
        } catch (error) {
          console.log('err = ', error);
        }
        if (previous_plan) {
          let prod = await findProductById(previous_plan[0].productId);
          if (prod.name == new_product.name ) {
            console.log('No new change so Skip');
          } else if (subscription.status === 'active') {
            try {
              const session = event.data.object as Stripe.Checkout.Session;
              const updatePromises = previous_plan.map(async (plan) => {
                try {
                  await updateSitesPlan(Number(session.metadata.userId), plan.id, new_product.name, interval, true);
                  // Retrieve the current price object to check metadata
                  console.log('Updated Plan for site', plan.siteId);
                } catch (error) {
                  console.log('Error updating Plan for site:', plan.siteId);
                  throw error;
                }
              });
  
              await Promise.all(updatePromises);
  
              const metadata = subscription.metadata;
              
              const domainCount = previous_plan.length > Number(metadata.usedDomains) ? previous_plan.length : Number(metadata.usedDomains); // Domain Count remains the same if site deleted, else increments
              
              const price = await stripe.prices.retrieve(subscription.items.data[0].price.id, {
                expand: ['tiers'], // Explicitly expand the tiers
              });
              
              let updatedMetadata  = { ...metadata, maxDomains: 1, usedDomains: Number(domainCount) };

              if (price?.tiers?.length > 0){
                updatedMetadata = { ...metadata, maxDomains: price?.tiers[0]?.up_to, usedDomains: Number(domainCount) };
              }
  
              await stripe.subscriptions.update(String(subscription.id), {
                metadata: updatedMetadata,
              });
  
              console.log('All Subscriptions updated successfully.');

            } catch (error) {
              console.log('error=', error);
            }
          }
        }
        
      }
    } else if (event.type === 'checkout.session.completed') {
      console.log('Checkout Complete subscription');
      try {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === 'setup' && session.setup_intent) {
          const setupIntentId = session.setup_intent;
          // You could fetch the SetupIntent here to get the payment method:
          const setupIntent = await stripe.setupIntents.retrieve((setupIntentId as string));
          const paymentMethod = (setupIntent.payment_method as string);
          const customerId = (setupIntent.customer as string);
  
          // Now update the customer's default payment method:
          await stripe.customers.update(customerId as string, {
            invoice_settings: {
              default_payment_method: paymentMethod,
            },
          });

          console.log('Credit card updated');

          const price = await stripe.prices.retrieve(session.metadata.price_id, { expand: ['tiers', 'product'] });
          // console.log("pricing =",price);
          // throw new Error("Check karlo");
          let planInterval: 'MONTHLY' | 'YEARLY' = 'MONTHLY'; // Default to 'MONTHLY'

          if (price.recurring && price.recurring.interval === 'year') {
            planInterval = 'YEARLY';
          }

          const subscription = await (stripe.subscriptions as any).create({
            customer: customerId,
            items: [{ price: price.id, quantity: 1 }],
            expand: ['latest_invoice.payment_intent'],
            default_payment_method: paymentMethod,
            metadata: {
              domainId: session.metadata.domainId,
              userId: session.metadata.userId,
              maxDomains: 1,
              usedDomains: 1,
            },
            description: `Plan for ${session.metadata.domain}`,
          });
          let previous_plan;
          try {
            previous_plan = await getSitePlanBySiteId(Number(session.metadata.domainId));
            await deleteTrialPlan(previous_plan.id);
          } catch (error) {
            console.log('err = ', error);
          }

          await createSitesPlan(Number(session.metadata.userId), String(subscription.id), ((price.product as any).name).toLowerCase(), planInterval, Number(session.metadata.domainId), '');

          console.log('New Sub created');

          res.json({ received: true });
          return;
        }

        
        // console.log("session = ",session)
        const userID = session?.metadata.userId;
        const siteID = session?.metadata.domainId;

        let paymentInvoiceID = '';
        let invoice_intent;

        if ((session as any).invoice) {
          paymentInvoiceID = (session as any).invoice;
          console.log('payment id', paymentInvoiceID);

          const invoice = await stripe.invoices.retrieve(paymentInvoiceID);
          invoice_intent = invoice.payment_intent;
        }
        // console.log("invoice intent = ",invoice_intent);
        if ((session as any)) {
          // Get the payment method ID
          try {
            const paymentIntent = await stripe.paymentIntents.retrieve(String(invoice_intent));
            // console.log("payment",paymentIntent)
            const paymentMethodId = paymentIntent.payment_method;

            // Set the payment method as the default payment method for the customer
            await stripe.customers.update((session as any).customer, {
              invoice_settings: {
                default_payment_method: String(paymentMethodId),
              },
            });
          } catch (error) {
            // No Payment Intent
          }
          
        }

        const { line_items } = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ['line_items'],
        });

        const price = await stripe.prices.retrieve(line_items.data[0].price.id, { expand: ['tiers'] });
        let planInterval: 'MONTHLY' | 'YEARLY' = 'MONTHLY'; // Default to 'MONTHLY'

        if (price.recurring && price.recurring.interval === 'year') {
          planInterval = 'YEARLY';
        }

        // session.subscription
        const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
        const currentMetadata = subscription.metadata || {};

        console.log('metadata', currentMetadata);
        if (currentMetadata.hasOwnProperty('promoCodeID')) {
          const promoIds = currentMetadata.promoCodeID.split(',').map((id) => id.trim());

          try {
            // Parallel update
            const updatedCoupons = await Promise.all(promoIds.map((id) => stripe.promotionCodes.update(id, { active: false })));
            updatedCoupons.forEach((coupon) => {
              console.log(`Coupon Expired: ${coupon.id}`);
            });
          } catch (error) {
            console.error('promo exp error', error);
          }
        }


        let updatedMetadata = { ...currentMetadata, maxDomains: 1, usedDomains:1 };

        if (price?.tiers?.length > 0){
          updatedMetadata = { ...currentMetadata, maxDomains: price?.tiers[0]?.up_to, usedDomains:1 };
        }

        const updatedSubscription = await stripe.subscriptions.update(String(session.subscription), {
          metadata: updatedMetadata,
        });
        // console.log('Subscription Meta Data Updated',updatedSubscription.metadata);
        
        // deletes the Trial Plan for the site
        let previous_plan;
        try {
          previous_plan = await getSitePlanBySiteId(Number(siteID));
          await deleteTrialPlan(previous_plan?.id);
        } catch (error) {
          console.log('err = ', error);
        }

        
        await createSitesPlan(Number(userID), updatedSubscription.id, line_items.data[0].description, planInterval, Number(siteID), '');
        console.log('Created');

      } catch (error) {
        console.log('error in checkout', error);
      }
    } else if (event.type === 'customer.subscription.deleted') {
      // Handles Deletion Only
      console.log('Deleting subscription');
      const subscription = event.data.object as Stripe.Subscription;

      const userStripeId = subscription.customer as string;

      let previous_plan;
      try {
        previous_plan = await getSitesPlanByCustomerIdAndSubscriptionId(userStripeId, subscription?.id);
      } catch (error) {
        console.log('err = ', error);
      }

      try {
        const updatePromises = previous_plan.map(async (plan) => {
          try {
            await deleteSitesPlan(plan.id, true);
            console.log('Deleted Plan for site', plan.siteId);
          } catch (error) {
            console.log('Error Deleting Plan for site:', plan.siteId);
            throw error;
          }
        });

        await Promise.all(updatePromises);
        console.log('Subscription Deleted');
      } catch (error) {
        console.log('error=', error);
      }

    } else {
      console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err?.message}`);
  }
};

export default stripeWebhook;
