import { Request, Response } from 'express';
import logger from '~/utils/logger';
import { createUserPlan, invoicePaymentFailed, invoicePaymentSuccess, trialWillEnd } from '../user/plans-user.service';
import Stripe from 'stripe';
import sendMail from '~/libs/mail';
import { DataSubcription, createNewSubcription } from '~/services/stripe/subcription.service';
import { createSitesPlan } from '../allowedSites/plans-sites.service';
import { updateAllowedSiteURL } from '~/repository/sites_allowed.repository';
import { ProductData, findProductByStripeId, insertProduct } from '~/repository/products.repository';

// async function webhookStripe(req: Request, res: Response): Promise<void> {
//   let event;
//   console.log("stripe req = ",req.body);
//   try {
//     event = JSON.parse(req.body);
//     console.log("stripe event = ",event);
//   } catch (err) {
//     logger.error(err);
//     res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   // switch (event.type) {
//   //   case 'invoice.payment_succeeded':
//   //     console.log("payment success");
//   //     // invoicePaymentSuccess(event.data.object);
//   //     break;
//   //   case 'invoice.payment_failed':
//   //     invoicePaymentFailed(event.data.object);
//   //     break;
//   //   case 'customer.subscription.trial_will_end':
//   //     trialWillEnd(event.data.object);
//   //     break;
//   //   default:
//   //     console.log(`Unhandled event type ${event.type}`);
//   // }

//   res.json({ received: true });
// }
// console.log("stripe key = ",process.env.STRIPE_PRIVATE_KEY);
// console.log("webhook secret = ",process.env.STRIPE_WEBHOOK_SECRET);
const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY!, {
  apiVersion: "2020-08-27", // TODO find out where this is in the Stripe dashboard and document
});

export const stripeWebhook = async (req: Request, res: Response, context:any) => {
  const sig = req.headers['stripe-signature'] as string;
  // console.log("req headers = ",req.headers,"sig = ",sig);
  let event: Stripe.Event;

  // try {
  //   event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  //   console.table({sig: 'stripe webhook signature verified', type: event.type})
  // } catch (err: any) {
  //   console.log(err.message);
  //   return res.status(400).send(`Webhook Error: ${err.message}`);
  // }
  try {
    event = req.body;
    // console.log("event = ",event);
  } catch (error) {
    console.log("error = ",error);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      console.log('Checkout session completed');
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log("session = ",session);
      const userID = session?.client_reference_id.split(',')[0];
      const siteID = session?.client_reference_id.split(',')[1];
      const paymentMode = session?.mode;
      const paymentStatus = session?.payment_status;
      let paymentInvoiceID = "";

      if ((session as any).invoice !== undefined) {
        paymentInvoiceID = (session as any).invoice;

        const invoice = await stripe.invoices.retrieve(paymentInvoiceID);

        console.log("Received Invoice = ",invoice);
      }

      const userStripeId = session.customer as string;

      const paymentMethodToken = stripe.paymentIntents.retrieve(String(session.payment_intent));
      const subscription = stripe.subscriptions.retrieve(String(session.subscription));

      const { line_items } = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items'],
      });
      console.log("line items = ",line_items);

      const plan = await stripe.plans.retrieve(String(line_items.data[0].price.product));
      let planInterval: 'MONTHLY' | 'YEARLY' = 'MONTHLY'; // Default to 'MONTHLY'

      if (plan.interval === 'year') {
        planInterval = 'YEARLY';
      }
      /**
       * here are your products, both subscriptions and one-time payments.
       * make sure to configure them in the Stripe dashboard first!
       * see: https://docs.opensaas.sh/guides/stripe-integration/
       */
      // createUserPlan(Number(userID),String(paymentMethodToken),line_items.data[0].description,planInterval);
      createSitesPlan(Number(userID),String(paymentMethodToken),line_items.data[0].description,planInterval,Number(siteID));
      // if (line_items?.data[0]?.price?.id === process.env.HOBBY_SUBSCRIPTION_PRICE_ID) {
      //   console.log('Hobby subscription purchased');
      //   await context.entities.User.updateMany({
      //     where: {
      //       stripeId: userStripeId,
      //     },
      //     data: {
      //       datePaid: new Date(),
      //       subscriptionTier: TierIds.HOBBY,
      //     },
      //   });
      // } else if (line_items?.data[0]?.price?.id === process.env.PRO_SUBSCRIPTION_PRICE_ID) {
      //   console.log('Pro subscription purchased');
      //   await context.entities.User.updateMany({
      //     where: {
      //       stripeId: userStripeId,
      //     },
      //     data: {
      //       datePaid: new Date(),
      //       subscriptionTier: TierIds.PRO,
      //     },
      //   });
      // } else if (line_items?.data[0]?.price?.id === process.env.CREDITS_PRICE_ID) {
      //   console.log('Credits purchased');
      //   await context.entities.User.updateMany({
      //     where: {
      //       stripeId: userStripeId,
      //     },
      //     data: {
      //       credits: {
      //         increment: 10,
      //       },
      //       datePaid: new Date(),
      //     },
      //   });
      // } else {
      //   res.status(404).send('Invalid product');
      // }
    } else if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice;
      const userStripeId = invoice.customer as string;

      const subscription_id = String(invoice.subscription);
      const subscription = await stripe.subscriptions.retrieve(subscription_id);
      const items: { price: string }[] = invoice.lines.data.map((lineItem: any) => {
        return { price: lineItem.price.toString() }; 
      });
      invoicePaymentSuccess(
      { customer: userStripeId,
        items: items,
        trial_end: subscription?.trial_end,
        hosted_invoice_url: invoice.hosted_invoice_url 
      });
      console.log("Invoice Payment Succesful");
    } else if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const userStripeId = subscription.customer as string;
      if (subscription.status === 'active') {
        console.log('Subscription active ', userStripeId);
        await context.entities.User.updateMany({
          where: {
            stripeId: userStripeId,
          },
          data: {
            subscriptionStatus: 'active',
          },
        });
      }
      /**
       * you'll want to make a check on the front end to see if the subscription is past due
       * and then prompt the user to update their payment method
       * this is useful if the user's card expires or is canceled and automatic subscription renewal fails
       */
      if (subscription.status === 'past_due') {
        console.log('Subscription past due for user: ', userStripeId);
        await context.entities.User.updateMany({
          where: {
            stripeId: userStripeId,
          },
          data: {
            subscriptionStatus: 'past_due',
          },
        });
      }
      /**
       * Stripe will send a subscription.updated event when a subscription is canceled
       * but the subscription is still active until the end of the period.
       * So we check if cancel_at_period_end is true and send an email to the customer.
       * https://stripe.com/docs/billing/subscriptions/cancel#events
       */
      if (subscription.cancel_at_period_end) {
        console.log('Subscription canceled at period end for user: ', userStripeId);
        let customer = await context.entities.User.findFirst({
          where: {
            stripeId: userStripeId,
          },
          select: {
            id: true,
            email: true,
          },
        });

        if (customer) {
          await context.entities.User.update({
            where: {
              id: customer.id,
            },
            data: {
              subscriptionStatus: 'canceled',
            },
          });

          if (customer.email) {
            await sendMail(customer.email,'We hate to see you go :(','We hate to see you go. Here is a sweet offer...');
          }
        }
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const userStripeId = subscription.customer as string;

      /**
       * Stripe will send then finally send a subscription.deleted event when subscription period ends
       * https://stripe.com/docs/billing/subscriptions/cancel#events
       */
      console.log('Subscription deleted/ended for user: ', userStripeId);
      await context.entities.User.updateMany({
        where: {
          stripeId: userStripeId,
        },
        data: {
          subscriptionStatus: 'deleted',
        },
      });
    } else if (event.type === 'product.updated') {
      // Handles product save and update in DB when you do so from the stripe dashboard
      let product = event.data.object as Stripe.Product;

      console.log("product updated = ",product);

      try {
        const findProduct = await findProductByStripeId(product.id);
        console.log("found product = ",findProduct);
      } catch (error) {
        console.log("error in find",error);
      }
      

      const prices = await stripe.prices.list({
        product: product.id,
      });

      console.log("prices = ",prices);

      // if(findProduct)
      // {
      //   //update product prices
      //   console.log("product exists update it");
      // }
      // else
      // {
        try {
          console.log("inserting Product");
          const productObject = {"name":product.name,"type":product.name.toLowerCase(),"stripe_id":product.id,"created_at":String(product.created),"updated_at":String(product.updated)};
          const pricesArray = prices.data?.map((getPrice:any)=>({
            amount: (getPrice?.unit_amount / 100),
            type: (getPrice?.recurring?.interval+"ly"),
            stripe_id: product?.id,
          }));
          if(insertProduct(productObject,pricesArray))
          {
            console.log("inserted Product");
          }
          else
          {
            console.log("Insertion Failed");
          }
        } catch (error) {
          console.log("error in insert",error);
        }
        
      // }
    } else if (event.type === 'invoice.payment_failed') {
      // Handles product save and update in DB when you do so from the stripe dashboard
      const invoice = event.data.object as Stripe.Invoice;
      const userStripeId = invoice.customer as string;

      const subscription_id = String(invoice.subscription);
      const subscription = await stripe.subscriptions.retrieve(subscription_id);
      const items: { price: string }[] = invoice.lines.data.map((lineItem: any) => {
        return { price: lineItem.price.toString() }; 
      });
      invoicePaymentFailed(
      { customer: userStripeId,
        items: items,
        trial_end: subscription?.trial_end,
        hosted_invoice_url: invoice.hosted_invoice_url 
      });

    } else if (event.type === 'customer.subscription.trial_will_end') {
      // Handles product save and update in DB when you do so from the stripe dashboard
      const invoice = event.data.object as Stripe.Invoice;
      const userStripeId = invoice.customer as string;

      const subscription_id = String(invoice.subscription);
      const subscription = await stripe.subscriptions.retrieve(subscription_id);
      const items: { price: string }[] = invoice.lines.data.map((lineItem: any) => {
        return { price: lineItem.price.toString() }; 
      });
      trialWillEnd(
      { customer: userStripeId,
        items: items,
        trial_end: subscription?.trial_end,
        hosted_invoice_url: invoice.hosted_invoice_url 
      });
    } else {
      console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err?.message}`);
  }
};

// This allows us to override Wasp's defaults and parse the raw body of the req from Stripe to verify the signature
// export const stripeMiddlewareFn: MiddlewareConfigFn = (middlewareConfig) => {
//   middlewareConfig.delete('express.json');
//   middlewareConfig.set('express.raw', express.raw({ type: 'application/json' }));
//   return middlewareConfig;
// };

export default stripeWebhook;
