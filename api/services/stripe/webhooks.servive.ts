import { Request, Response } from 'express';
import logger from '~/utils/logger';
import { createUserPlan, invoicePaymentFailed, invoicePaymentSuccess, trialWillEnd } from '../user/plans-user.service';
import Stripe from 'stripe';
import {sendMail} from '~/libs/mail';
import { DataSubcription, createNewSubcription } from '~/services/stripe/subcription.service';
import { createSitesPlan, deleteSitesPlan, deleteTrialPlan, updateSitesPlan } from '../allowedSites/plans-sites.service';
import { updateAllowedSiteURL } from '~/repository/sites_allowed.repository';
import { ProductData, findProductById, findProductByStripeId, insertProduct, updateProduct } from '~/repository/products.repository';
import { getSitePlanBySiteId, getSitesPlanByCustomerIdAndSubscriptionId } from '~/repository/sites_plans.repository';

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

const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY!, {
  apiVersion: "2020-08-27", // TODO find out where this is in the Stripe dashboard and document
});

export const stripeWebhook = async (req: Request, res: Response, context:any) => {
  let event: Stripe.Event;
  try {
    event = req.body;
  } catch (error) {
    console.log("error = ",error);
  }
  try {
    if (event.type === 'product.updated') {
      // Handles product save and update in DB when you do so from the stripe dashboard
      let product = event.data.object as Stripe.Product;

      console.log('product to be updated = ', product);

      const prices = await stripe.prices.list({
        product: product.id,
      });

      // console.log('prices = ', JSON.stringify(prices));

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
          const pricesArray = prices.data?.map((getPrice: any) => ({
            amount: getPrice?.unit_amount / 100,
            type: getPrice?.recurring?.interval + 'ly',
            stripe_id: getPrice?.id,
          }));
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
          const pricesArray = prices.data?.map((getPrice: any) => ({
            amount: getPrice?.unit_amount / 100,
            type: getPrice?.recurring?.interval + 'ly',
            stripe_id: getPrice?.id,
          }));
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
      console.log("Updating subscription");
      const subscription = event.data.object as Stripe.Subscription;

      if(subscription.metadata.hasOwnProperty('updateMetaData') && subscription.metadata['updateMetaData'] == 'true' )
      {
        console.log("Updating Metadata to stop create sub (only update metadata)")
        const metadata = subscription.metadata;
        metadata['updateMetaData'] = "false";
        await stripe.subscriptions.update(String(subscription.id), {
          metadata: metadata,
        });
      }
      else
      {
        console.log("Updating Metadata to stop update sub from stripe (update meta data and db)")

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
        if(previous_plan)
        {
          let prod = await findProductById(previous_plan[0].productId);
          if(prod.name == new_product.name )
          {
            console.log("No new change so Skip")
          }
          else if (subscription.status === 'active') {
            try {
              const updatePromises = previous_plan.map(async (plan) => {
                try {
                  await updateSitesPlan(plan.id, new_product.name, interval, true);
                  // Retrieve the current price object to check metadata
                  console.log('Updated Plan for site', plan.siteId);
                } catch (error) {
                  console.log('Error updating Plan for site:', plan.siteId);
                  throw error;
                }
              });
  
              await Promise.all(updatePromises);
  
              const metadata = subscription.metadata;
              
              const domainCount = previous_plan.length > Number(metadata['usedDomains']) ? previous_plan.length:Number(metadata['usedDomains']); // Domain Count remains the same if site deleted, else increments

              const updatedMetadata = { ...metadata, maxDomains: subscription.items.data[0].price.transform_quantity['divide_by'], usedDomains: Number(domainCount)};
  
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

      // if(subscription.metadata.hasOwnProperty('newOldSub'))
      // {
      //   if(subscription.metadata['newOldSub'] == "true" && subscription.metadata['webhookSub'] == "false" )
      //   {
      //     console.log("Updating Metadata stop NewOldSub")
      //     const metadata = subscription.metadata;
      //     metadata['newOldSub'] = "false";
      //     metadata['webhookSub'] = "true";

      //     await stripe.subscriptions.update(String(subscription.id), {
      //       metadata: metadata,
      //     });
      //   }
      //   if(subscription.metadata['newOldSub'] == "false" && subscription.metadata['webhookSub'] == "true" )
      //   {
      //     console.log("Skip for New Old Sub Domain Update")
      //   }
      // }
      // else if (subscription.metadata && subscription.metadata.hasOwnProperty('checkout')) {
      //   if (subscription.metadata['checkout'] == 'true') {
      //     console.log('checkout sub');
      //     const currentMetadata = subscription.metadata || {};
      //     currentMetadata['checkout'] = 'false';
      //     const updatedMetadata = { ...currentMetadata };
      //     const updatedSubscription = await stripe.subscriptions.update(String(subscription.id), {
      //       metadata: updatedMetadata,
      //     });
      //     // console.log('Subscription Meta Data Updated', updatedSubscription.metadata);
      //   } else {
      //     const userStripeId = subscription.customer as string;
      //     const productId = subscription.items.data[0].plan.product as string;
      //     const interval = subscription.items.data[0].plan.interval == 'month' ? 'MONTHLY' : 'YEARLY';
      //     const new_product = await stripe.products.retrieve(productId);
      //     let previous_plan;
      //     try {
      //       previous_plan = await getSitesPlanByCustomerIdAndSubscriptionId(userStripeId, subscription?.id);
      //     } catch (error) {
      //       console.log('err = ', error);
      //     }
      //     if (subscription.status === 'active') {
      //       try {
      //         const updatePromises = previous_plan.map(async (plan) => {
      //           try {
      //             await updateSitesPlan(plan.id, new_product.name, interval, true);
      //             // Retrieve the current price object to check metadata
      //             console.log('Updated Plan for site',plan.siteId);
      //           } catch (error) {
      //             console.log('Error updating Plan for site:', plan.siteId);
      //             throw error;
      //           }
      //         });

      //         await Promise.all(updatePromises);

      //         const currentMetadata = subscription.metadata || {};

      //         const updatedMetadata = { ...currentMetadata, maxDomains: subscription.items.data[0].price.transform_quantity['divide_by'], usedDomains: Number(previous_plan.length) };

      //         const updatedSubscription = await stripe.subscriptions.update(String(subscription.id), {
      //           metadata: updatedMetadata,
      //         });

      //         // console.log('Subscription Meta Data Updated',updatedSubscription.metadata);
      //         console.log('All Subscriptions updated successfully.');
      //         // await updateSitesPlan(previous_plan[0].id,new_product.name,interval);
      //         // console.log("Updated Subscription");
      //       } catch (error) {
      //         console.log('error=', error);
      //       }
      //     }
      //   }
      // } else {
      //   const userStripeId = subscription.customer as string;
      //   const productId = subscription.items.data[0].plan.product as string;
      //   const interval = subscription.items.data[0].plan.interval == 'month' ? 'MONTHLY' : 'YEARLY';
      //   const new_product = await stripe.products.retrieve(productId);
      //   let previous_plan;
      //   try {
      //     previous_plan = await getSitesPlanByCustomerIdAndSubscriptionId(userStripeId, subscription?.id);
      //   } catch (error) {
      //     console.log('err = ', error);
      //   }
      //   if (subscription.status === 'active') {
      //     try {
      //       const updatePromises = previous_plan.map(async (plan) => {
      //         try {
      //           await updateSitesPlan(plan.id, new_product.name, interval, true);
      //           // Retrieve the current price object to check metadata
      //           console.log('Updated Plan for site', plan.siteId);
      //         } catch (error) {
      //           console.log('Error updating Plan for site:', plan.siteId);
      //           throw error;
      //         }
      //       });

      //       await Promise.all(updatePromises);

      //       const currentMetadata = subscription.metadata || {};

      //       const updatedMetadata = { ...currentMetadata, maxDomains: subscription.items.data[0].price.transform_quantity['divide_by'], usedDomains: Number(previous_plan.length) };

      //       const updatedSubscription = await stripe.subscriptions.update(String(subscription.id), {
      //         metadata: updatedMetadata,
      //       });

      //       // console.log('Subscription Meta Data Updated', updatedSubscription.metadata);
      //       console.log('All Subscriptions updated successfully.');
      //       // await updateSitesPlan(previous_plan[0].id,new_product.name,interval);
      //       // console.log("Updated Subscription");
      //     } catch (error) {
      //       console.log('error=', error);
      //     }
      //   }
      // }
    } else if (event.type === 'checkout.session.completed') {
      console.log('Checkout Complete subscription');
      try {
        const session = event.data.object as Stripe.Checkout.Session;
        // console.log("session = ",session)
        const userID = session?.metadata['userId'];
        const siteID = session?.metadata['domainId'];

        let paymentInvoiceID = '';
        let invoice_intent;

        if ((session as any).invoice !== undefined) {
          paymentInvoiceID = (session as any).invoice;

          const invoice = await stripe.invoices.retrieve(paymentInvoiceID);
          invoice_intent = invoice.payment_intent;
        }
        // console.log("invoice intent = ",invoice_intent);
        if ((session as any) !== undefined) {
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

        const price = await stripe.prices.retrieve(line_items.data[0].price.id);
        let planInterval: 'MONTHLY' | 'YEARLY' = 'MONTHLY'; // Default to 'MONTHLY'

        if (price.recurring && price.recurring.interval === 'year') {
          planInterval = 'YEARLY';
        }

        // session.subscription
        const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
        const currentMetadata = subscription.metadata || {};

        const updatedMetadata = { ...currentMetadata,maxDomains: price.transform_quantity['divide_by'],usedDomains:1};

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
    }else if (event.type === 'customer.subscription.deleted') {
      // Handles Deletion Only
      console.log("Deleting subscription");
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



// Backend Not implemented since no user plans
// if (event.type === 'invoice.paid') {
    //   const invoice = event.data.object as Stripe.Invoice;
    //   const userStripeId = invoice.customer as string;

    //   const subscription_id = String(invoice.subscription);
    //   const subscription = await stripe.subscriptions.retrieve(subscription_id);
    //   const items: { price: string }[] = invoice.lines.data.map((lineItem: any) => {
    //     return { price: lineItem.price.toString() }; 
    //   });
    //   invoicePaymentSuccess(
    //   { customer: userStripeId,
    //     items: items,
    //     trial_end: subscription?.trial_end,
    //     hosted_invoice_url: invoice.hosted_invoice_url 
    //   });
    //   console.log("Invoice Payment Succesful");}

    // else if (event.type === 'invoice.payment_failed') {
    //   // Handles product save and update in DB when you do so from the stripe dashboard
    //   // const invoice = event.data.object as Stripe.Invoice;
    //   // const userStripeId = invoice.customer as string;

    //   // const subscription_id = String(invoice.subscription);
    //   // const subscription = await stripe.subscriptions.retrieve(subscription_id);
    //   // const items: { price: string }[] = invoice.lines.data.map((lineItem: any) => {
    //   //   return { price: lineItem.price.toString() }; 
    //   // });
    //   // invoicePaymentFailed(
    //   // { customer: userStripeId,
    //   //   items: items,
    //   //   trial_end: subscription?.trial_end,
    //   //   hosted_invoice_url: invoice.hosted_invoice_url 
    //   // });

    // } 
    // else if (event.type === 'customer.subscription.trial_will_end') {
    //   // Handles product save and update in DB when you do so from the stripe dashboard
    //   const invoice = event.data.object as Stripe.Invoice;
    //   const userStripeId = invoice.customer as string;

    //   const subscription_id = String(invoice.subscription);
    //   const subscription = await stripe.subscriptions.retrieve(subscription_id);
    //   const items: { price: string }[] = invoice.lines.data.map((lineItem: any) => {
    //     return { price: lineItem.price.toString() }; 
    //   });
    //   trialWillEnd(
    //   { customer: userStripeId,
    //     items: items,
    //     trial_end: subscription?.trial_end,
    //     hosted_invoice_url: invoice.hosted_invoice_url 
    //   });
    // } 

/////////////////////////////////////////////////////////////////////////
// if (event.type === 'checkout.session.completed') {
//   console.log('Checkout session completed');
//   const session = event.data.object as Stripe.Checkout.Session;
  
//   console.log("session = ",session);
//   const userID = session?.client_reference_id.split(',')[0];
//   const siteID = session?.client_reference_id.split(',')[1];
//   const paymentMode = session?.mode;
//   const paymentStatus = session?.payment_status;
//   let paymentInvoiceID = "";

//   if ((session as any).invoice !== undefined) {
//     paymentInvoiceID = (session as any).invoice;

//     const invoice = await stripe.invoices.retrieve(paymentInvoiceID);

//     console.log("Received Invoice = ",invoice);
//   }

//   const userStripeId = session.customer as string;

//   const paymentMethodToken = stripe.paymentIntents.retrieve(String(session.payment_intent));
//   const subscription = stripe.subscriptions.retrieve(String(session.subscription));

//   const { line_items } = await stripe.checkout.sessions.retrieve(session.id, {
//     expand: ['line_items'],
//   });
//   console.log("line items = ",line_items);

//   const plan = await stripe.plans.retrieve(String(line_items.data[0].price.product));
//   let planInterval: 'MONTHLY' | 'YEARLY' = 'MONTHLY'; // Default to 'MONTHLY'

//   if (plan.interval === 'year') {
//     planInterval = 'YEARLY';
//   }
//   /**
//    * here are your products, both subscriptions and one-time payments.
//    * make sure to configure them in the Stripe dashboard first!
//    * see: https://docs.opensaas.sh/guides/stripe-integration/
//    */
//   // createUserPlan(Number(userID),String(paymentMethodToken),line_items.data[0].description,planInterval);
//   createSitesPlan(Number(userID),String(paymentMethodToken),line_items.data[0].description,planInterval,Number(siteID));
// }

// if (event.type === 'customer.subscription.updated') {
//   const subscription = event.data.object as Stripe.Subscription;
//   const userStripeId = subscription.customer as string;
//   if (subscription.status === 'active') {
//     console.log('Subscription active ', userStripeId);
//     await context.entities.User.updateMany({
//       where: {
//         stripeId: userStripeId,
//       },
//       data: {
//         subscriptionStatus: 'active',
//       },
//     });
//   }
//   /**
//    * you'll want to make a check on the front end to see if the subscription is past due
//    * and then prompt the user to update their payment method
//    * this is useful if the user's card expires or is canceled and automatic subscription renewal fails
//    */
//   if (subscription.status === 'past_due') {
//     console.log('Subscription past due for user: ', userStripeId);
//     await context.entities.User.updateMany({
//       where: {
//         stripeId: userStripeId,
//       },
//       data: {
//         subscriptionStatus: 'past_due',
//       },
//     });
//   }
//   /**
//    * Stripe will send a subscription.updated event when a subscription is canceled
//    * but the subscription is still active until the end of the period.
//    * So we check if cancel_at_period_end is true and send an email to the customer.
//    * https://stripe.com/docs/billing/subscriptions/cancel#events
//    */
//   if (subscription.cancel_at_period_end) {
//     console.log('Subscription canceled at period end for user: ', userStripeId);
//     let customer = await context.entities.User.findFirst({
//       where: {
//         stripeId: userStripeId,
//       },
//       select: {
//         id: true,
//         email: true,
//       },
//     });

//     if (customer) {
//       await context.entities.User.update({
//         where: {
//           id: customer.id,
//         },
//         data: {
//           subscriptionStatus: 'canceled',
//         },
//       });

//       if (customer.email) {
//         await sendMail(customer.email,'We hate to see you go :(','We hate to see you go. Here is a sweet offer...');
//       }
//     }
//   }
// } else if (event.type === 'customer.subscription.deleted') {
//   const subscription = event.data.object as Stripe.Subscription;
//   const userStripeId = subscription.customer as string;

//   /**
//    * Stripe will send then finally send a subscription.deleted event when subscription period ends
//    * https://stripe.com/docs/billing/subscriptions/cancel#events
//    */
//   console.log('Subscription deleted/ended for user: ', userStripeId);
//   await context.entities.User.updateMany({
//     where: {
//       stripeId: userStripeId,
//     },
//     data: {
//       subscriptionStatus: 'deleted',
//     },
//   });
// }
