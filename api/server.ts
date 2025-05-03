/* eslint-disable wrap-iife */
import dotenv from 'dotenv';
import { resolve, join } from 'path';
import express, { NextFunction, Request, Response } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import 'module-alias/register';
import { ApolloServer, ApolloError } from 'apollo-server-express';
import { withScope, Severity, captureException, init, Handlers } from '@sentry/node';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { IResolvers } from '@graphql-tools/utils';
import { makeExecutableSchema } from 'graphql-tools';
import accessLogStream from './middlewares/logger.middleware';
import RootSchema from './graphql/root.schema';
import RootResolver from './graphql/root.resolver';
import getUserLogined from './services/authentication/get-user-logined.service';
import stripeHooks from './services/stripe/webhooks.servive';
import {sendMail} from './libs/mail';
import { AddTokenToDB, GetVisitorTokenByWebsite } from './services/webToken/mongoVisitors';
import { fetchAccessibilityReport } from './services/accessibilityReport/accessibilityReport.service';
import { findProductAndPriceByType, findProductById } from './repository/products.repository';
import { createSitesPlan, deleteTrialPlan } from './services/allowedSites/plans-sites.service';
import Stripe from 'stripe';
import { getSitePlanBySiteId, getSitesPlanByUserId } from './repository/sites_plans.repository';
import { findPriceById } from './repository/prices.repository';
import { APP_SUMO_COUPON_ID, APP_SUMO_COUPON_IDS, APP_SUMO_DISCOUNT_COUPON } from './constants/billing.constant';
import axios from 'axios';
import OpenAI from 'openai';
import scheduleMonthlyEmails from './jobs/monthlyEmail';
import database from '~/config/database.config';
import { addProblemReport, getProblemReportsBySiteId, problemReportProps } from './repository/problem_reports.repository';
import { deleteSiteByURL, FindAllowedSitesProps, findSiteByURL, findSitesByUserId, IUserSites } from './repository/sites_allowed.repository';
import { addWidgetSettings, getWidgetSettingsBySiteId } from './repository/widget_settings.repository';
import { addNewsletterSub } from './repository/newsletter_subscribers.repository';
import findPromo from './services/stripe/findPromo';
import { appSumoPromoCount } from './utils/appSumoPromoCount';
import { expireUsedPromo } from './utils/expireUsedPromo';
// import run from './scripts/create-products';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API });

type ContextParams = {
  req: Request;
  res: Response;
};

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const allowedOrigins = [process.env.FRONTEND_URL, undefined, process.env.PORT, 'https://www.webability.io'];
const allowedOperations = ['validateToken', 'addImpressionsURL', 'registerInteraction','reportProblem','updateImpressionProfileCounts','getWidgetSettings','getAccessibilityReport','getAccessibilityStats'];
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);

app.post('/stripe-hooks', express.raw({ type: 'application/json' }), stripeHooks);
app.use(express.json());

scheduleMonthlyEmails();

function dynamicCors(req: Request, res: Response, next: NextFunction) {
  const corsOptions = {
    optionsSuccessStatus: 200,
    credentials: true,
    origin: (origin: any, callback: any) => {
      if (req.body && allowedOperations.includes(req.body.operationName)) {
        // Allow any origin for 'validateToken'
        callback(null, true);
      } else if (allowedOrigins.includes(origin) || req.method === 'OPTIONS') {
        // Allow your specific frontend origin
        callback(null, true);
      }
      // else {
      //   // Disallow other origins
      //   callback(new Error('Not allowed by CORS'));
      // }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  };

  cors(corsOptions)(req, res, next);
}

(function startServer() {
  app.use(morgan('combined', { stream: accessLogStream }));

  // app.use(cors({
  //   origin: 'https://www.webability.io',
  //   methods: 'GET,POST',
  //   credentials: true
  // }));
  app.use(dynamicCors);

  app.use(express.static(join(resolve(), 'public', 'uploads')));
  app.use(cookieParser());

  app.use(bodyParser.urlencoded({ extended: true }));

  app.get('/', (req, res) => {
    res.send('Hello orld!');
  });

  app.get('/token/:url', async (req, res) => {
    const url = req.params.url;
    const token = await GetVisitorTokenByWebsite(url);
    res.send(token);
  });

  app.post('/create-customer-portal-session',async (req,res)=>{
    const {id,returnURL} = req.body;
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer:id,
        return_url:returnURL
      });
      return res.status(200).json(session);
    } catch (error) {
      console.log(error);
      return res.status(500);
    }
  })

  app.post('/billing-portal-session', async (req, res) => {
    const { email, returnURL } = req.body;

    // Search for an existing customer by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    let customer;

    // Check if customer exists
    if (customers.data.length > 0) {
      customer = customers.data[0];
      // console.log("customer exists = ",customer);
    } else {
      customer = await stripe.customers.create({
        email: email,
      });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit:100
    });

    const trialingSubscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'trialing',
      limit:100
    });

    // Merge trialing subscriptions into active subscriptions (modifying subscriptions.data)
    subscriptions.data.push(...trialingSubscriptions.data);

    if (subscriptions.data.length !== 0) {
      const prices = await stripe.prices.list({
        limit: 50, // Optional: limit the number of results per request
      });

      let usablePrices = await Promise.all(
        prices.data.map(async (price: Stripe.Price) => {
          if (
            price?.tiers_mode === "graduated" &&
            price?.recurring?.usage_type === "licensed"
          ) {
            const product = await stripe.products.retrieve(price.product as string);
      
            if (product.name.toLowerCase().includes("app sumo")) {
              return null;
            }
            return price;
          }
          return null; // Exclude prices without tiers
        })
      );

      // Filter out null values
      usablePrices = usablePrices.filter((price: Stripe.Price) => price !== null);
      const productPriceArray: any = [];
      const productMap = new Map();

      usablePrices.forEach((price: Stripe.Price) => {
        if (!productMap.has(price.product)) {
          productMap.set(price.product, []);
        }
        productMap.get(price.product).push(price);
      });

      // Convert map to array of dictionaries
      productMap.forEach((prices, productId) => {
        productPriceArray.push({
          product: productId,
          prices: prices.map((price: Stripe.Price) => price.id),
        });
      });

      const configurations = await stripe.billingPortal.configurations.list({
        is_default: true,
      });

      // console.log(productPriceArray);
      if (productPriceArray.length) {
        let configuration: any = {};

        if (subscriptions.data[0].status == 'trialing') {
          configuration = await stripe.billingPortal.configurations.update(configurations.data[0].id, {
            features: {
              // subscription_update: {
              //   enabled: true,
              //   default_allowed_updates: ['price'], // Allow price updates
              //   products: productPriceArray,
              // },
              subscription_update: {
                enabled: false,
              },
              subscription_cancel: {
                proration_behavior: 'none',
                enabled: true,
                mode: 'at_period_end', // or 'immediately' based on your preference
                cancellation_reason: {
                  enabled: true,
                  options: ['too_expensive', 'missing_features', 'switched_service', 'unused', 'other'],
                },
              },
            },
          });
        } else {
          configuration = await stripe.billingPortal.configurations.update(configurations.data[0].id, {
            features: {
              // subscription_update: {
              //   enabled: true,
              //   default_allowed_updates: ['price'], // Allow price updates
              //   products: productPriceArray,
              // },
              subscription_update: {
                enabled: false,
              },
              subscription_cancel: {
                enabled: true,
                mode: 'immediately', // or 'immediately' based on your preference
                cancellation_reason: {
                  enabled: true,
                  options: ['too_expensive', 'missing_features', 'switched_service', 'unused', 'other'],
                },
              },
            },
          });
        }

        try {
          const session = await stripe.billingPortal.sessions.create({
            customer: customer.id,
            return_url: returnURL,
            configuration: configuration.id,
          });
          return res.status(200).json(session);
        } catch (error) {
          console.log(error);
          return res.status(500);
        }
      } else {
        let configuration: any = {};
        if (subscriptions.data[0].status == 'trialing') {
          configuration = await stripe.billingPortal.configurations.update(configurations.data[0].id, {
            features: {
              subscription_update: {
                enabled: false,
              },
              subscription_cancel: {
                enabled: true,
                mode: 'immediately', // or 'immediately' based on your preference
                cancellation_reason: {
                  enabled: true,
                  options: ['too_expensive', 'missing_features', 'switched_service', 'unused', 'other'],
                },
              },
            },
          });
        } else {
          configuration = await stripe.billingPortal.configurations.update(configurations.data[0].id, {
            features: {
              subscription_update: {
                enabled: false,
              },
            },
          });
        }

        try {
          const session = await stripe.billingPortal.sessions.create({
            customer: customer.id,
            return_url: returnURL,
            configuration: configuration.id,
          });
          return res.status(200).json(session);
        } catch (error) {
          console.log(error);
          return res.status(500);
        }
      }
    } else {
      try {
        const session = await stripe.billingPortal.sessions.create({
          customer: customer.id,
          return_url: returnURL,
        });
        return res.status(200).json(session);
      } catch (error) {
        console.log(error);
        return res.status(500);
      }
    }
  });

  app.post('/validate-coupon', async (req, res) => {
    const { couponCode } = req.body;
    try {
      let promoCodeData = null;
      promoCodeData = await findPromo(stripe,couponCode);

      if (!promoCodeData) {
        return res.json({ valid: false, error: 'Invalid promo code' });
      }
      if(!promoCodeData.active)
      {
        return res.json({ valid: false, error: 'Promo Expired' });
      }
      if(!APP_SUMO_COUPON_IDS.includes(promoCodeData.coupon.id))
      {
        return res.json({ valid: false, error: 'Invalid promo code Not from App Sumo' });
      }
      if(promoCodeData.coupon.percent_off)
      {
        const coupon:Stripe.Coupon = await stripe.coupons.retrieve(promoCodeData?.coupon?.id,{expand:['applies_to']});        
        const product:Stripe.Product = await stripe.products.retrieve(coupon.applies_to.products[0]);

        res.json({ valid: true, discount: (Number(promoCodeData.coupon.percent_off)/100),id:promoCodeData?.coupon?.id,percent:true,planName:product?.name.toLowerCase()});
      }
      else
      {
        res.json({ valid: true, discount: (Number(promoCodeData.coupon.amount_off)/100),id:promoCodeData?.coupon?.id,percent:false });
      }
    } catch (error) {
      console.log("err",error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/update-site-widget-settings', async (req, res) => {
    const { settings, user_id, site_url } = req.body;
    try {
      const site = await findSiteByURL(site_url);
      if (site.user_id != user_id) {
        console.error( 'User does not own this site');
        res.status(500).json({ error: 'User does not own this site' });
      } else {
        await addWidgetSettings({
          site_url: site_url,
          allowed_site_id: 26,
          settings: settings,
          user_id: 35,
        });
        res.status(200).json("Success");
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/get-site-widget-settings', async (req, res) => {
    const { site_url } = req.body;
    try {
      const site = await findSiteByURL(site_url);

      const widgetSettings = await getWidgetSettingsBySiteId(site.id);
      let response = widgetSettings?.settings || {};

      res.status(200).json({ settings: response });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post('/create-checkout-session',async (req,res)=>{
    const { email,planName,billingInterval,returnUrl,domainId,userId,domain,cardTrial,promoCode} = req.body;
    
    const price = await findProductAndPriceByType(planName,billingInterval);

    try {
      // Search for an existing customer by email
      const customers = await stripe.customers.list({
        email: email,
        limit: 1
      });

      let customer;

      // Check if customer exists
      if (customers.data.length > 0) {
        customer = customers.data[0];
        // console.log("customer exists = ",customer);
      } else {
        // Create a new customer if not found
        customer = await stripe.customers.create({
          email: email,
        });
        // return;
      }

      const subscriptions = await stripe.subscriptions.list({ customer: customer.id,limit:100 });
      // for (const subscription of subscriptions.data) {
      //   await stripe.subscriptions.del(subscription.id);
      // }

      let promoCodeData:Stripe.PromotionCode[];

      if (promoCode && promoCode.length > 0 && typeof(promoCode[0]) != 'number') {
        const validCodesData: Stripe.PromotionCode[] = [];
        const invalidCodes: string[] = [];
      
        // Process each code sequentially (you can also use Promise.all if you prefer parallel execution)
        for (const code of promoCode) {
          const found = await findPromo(stripe, code);
          if (found) {
            validCodesData.push(found);
          } else {
            invalidCodes.push(code);
          }
        }
      
        if (invalidCodes.length > 0) {
          return res.json({
            valid: false,
            error: `Invalid Promo Code(s): ${invalidCodes.join(", ")}`
          });
        }
      
        // Now, validCodesData contains all valid promo code objects.
        promoCodeData = validCodesData;
      }

      let price_data = await stripe.prices.retrieve(String(price.price_stripe_id),{expand:['tiers']});

      // Create the checkout session
      let session:any = {}
      if(typeof(promoCode[0]) == 'number' || (promoCodeData && promoCodeData[0]?.coupon.valid && promoCodeData[0]?.active && APP_SUMO_COUPON_IDS.includes(promoCodeData[0].coupon?.id)))
      {
        const {orderedCodes,numPromoSites } = appSumoPromoCount(subscriptions,promoCode);

        console.log("promo");

        // This will work on for AppSumo coupons, we allow use of coupons that should only work for the app sumo tier plans and we manually apply the discount according to new plan (single)

        const subscription =  await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: price.price_stripe_id, quantity: 1 }],
          expand: ['latest_invoice.payment_intent'],
          coupon:APP_SUMO_DISCOUNT_COUPON,
          metadata: {
            domainId: domainId,
            userId: userId,
            maxDomains: 1,
            usedDomains: 1,
          },
          description: `Plan for ${domain}(${orderedCodes})`,
        });
        
        await expireUsedPromo(numPromoSites,stripe,orderedCodes);        

        let previous_plan;
        try {
          previous_plan = await getSitePlanBySiteId(Number(domainId));
          await deleteTrialPlan(previous_plan.id);
        } catch (error) {
          // console.log('err = ', error);
        }

        await createSitesPlan(Number(userId), String(subscription.id), planName, billingInterval, Number(domainId), 'appsumo');

        console.log('New Sub created');

        res.status(200).json({ success: true });

        return;

      }
      else if(promoCode && promoCode.length > 0) // Coupon is not valid or not the app sumo promo
      {
        return res.json({ valid: false, error: 'Invalid promo code' });
      }
      else if(cardTrial)
      {
        console.log("trial")
        session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'subscription',
          line_items: [{
            price: price.price_stripe_id,
            quantity: 1,
          }],
          customer: customer.id,
          allow_promotion_codes: true,
          success_url: `${returnUrl}`,
          cancel_url: returnUrl,
          metadata: {
            domainId: domainId,
            userId:userId,
            updateMetaData:"true",
          },
          subscription_data:{
            trial_period_days: 30,
            metadata: {
              domainId: domainId,
              userId:userId,
              updateMetaData:"true",
            },
            description:`Plan for ${domain}`,
          }
        });

      }
      else{
        console.log("normal")
        
        if (subscriptions.data.length > 0) {
          console.log("setup intent only");
          session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'setup',
            customer: customer.id,
            success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`, // you can include the session id to later verify the setup
            cancel_url: returnUrl,
            metadata: {
              price_id: price.price_stripe_id,
              domainId: domainId,
              domain: domain,
              userId: userId,
              updateMetaData: 'true',
            },
          });
        } else {
          console.log("checkout intent");
          session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [
              {
                price: price.price_stripe_id,
                quantity: 1,
              },
            ],
            customer: customer.id,
            allow_promotion_codes: true,
            success_url: `${returnUrl}`,
            cancel_url: returnUrl,
            metadata: {
              domainId: domainId,
              userId: userId,
              updateMetaData: 'true',
            },
            subscription_data: {
              metadata: {
                domainId: domainId,
                userId: userId,
                updateMetaData: 'true',
              },
              description: `Plan for ${domain}`,
            },
          });
        }
      }

      

      res.status(303).json({ url: session.url });

    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/app-sumo-checkout-session',async (req,res)=>{
    const { email,planName,promoCode,returnUrl,domainId,userId,domain} = req.body;
     
    const price = await findProductAndPriceByType(planName,"YEARLY");

    try {
      // Search for an existing customer by email
      const customers = await stripe.customers.list({
        email: email,
        limit: 1
      });

      let customer;

      // Check if customer exists
      if (customers.data.length > 0) {
        customer = customers.data[0];
      } else {
        // Create a new customer if not found
        customer = await stripe.customers.create({
          email: email,
        });
      }

      const promoCodes = await stripe.promotionCodes.list({ limit: 100 });
      const promoCodeData = await promoCodes.data.find((pc:any) => pc?.code == promoCode);
      
      if (!promoCodeData) {
        return res.json({ valid: false, error: 'Invalid promo code' });
      }
      if(promoCodeData.coupon.valid && promoCodeData.active && promoCodeData.coupon.id == APP_SUMO_COUPON_ID)
      {
        const subscriptions = await stripe.subscriptions.list({ customer: customer.id,limit:100 });

        for (const subscription of subscriptions.data) {
          await stripe.subscriptions.del(subscription.id);
        }

        // Create the checkout session
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'subscription',
          line_items: [{
            price: price.price_stripe_id,
            quantity: 1,
          }],
          customer: customer.id,
          discounts:[{
            promotion_code: promoCodeData?.id,
          }],
          payment_method_collection:'if_required',
          success_url: `${returnUrl}`,
          cancel_url: returnUrl,
          metadata: {
            domainId: domainId,
            userId:userId,
            updateMetaData:"true",
          },
          subscription_data:{
            metadata: {
              domainId: domainId,
              userId:userId,
              updateMetaData:"true",
            },
            description:`Plan for ${domain}`
          }
        });

        res.status(303).json({ url: session.url });

      }
      else
      {
        return res.json({ valid: false, error: 'Invalid promo code' });
      }

    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/cancel-site-subscription',async (req,res)=>{
    const { domainId,domainUrl,userId,status } = req.body;

    if(status == 'Active')
    {
      let previous_plan;
      try {
        previous_plan = await getSitePlanBySiteId(Number(domainId));
      } catch (error) {
        console.log('err = ', error);
      }
      try {
        await deleteTrialPlan(previous_plan.id);
        await deleteSiteByURL(domainUrl,userId);

        res.status(200).json({ success: true });
      } catch (error) {
        console.log('err = ', error);
        res.status(500).json({ error: error });
      }
    }
    else
    {
      res.status(500).json({ error: "Cannot delete a Trial Site" });
    }
  });

  app.post('/create-subscription',async (req,res)=>{
    const { email,returnURL, planName,billingInterval,domainId,domainUrl,userId,cardTrial,promoCode } = req.body;

    const price = await findProductAndPriceByType(planName,billingInterval);

    const sites = await getSitesPlanByUserId(Number(userId));

    const sub_id = sites[0]?.subcriptionId;
    

    let no_sub = false;
    let subscription;

    if(sub_id == undefined)
    {
      no_sub = true;
    }
    else
    {
      try {
        subscription = await stripe.subscriptions.retrieve(sub_id,{active:true}) as Stripe.Subscription;
      } catch (error) {
        // console.log("error",error);
        no_sub = true;
      }
    }

    try {
      // Search for an existing customer by email
      const customers = await stripe.customers.list({
        email: email,
        limit: 1
      });

      let customer;
      
      // Check if customer exists
      if (customers.data.length > 0) {
        customer = customers.data[0];
      }
      else
      {
        // console.log("customer not found");
        res.status(404);
      }

      const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          limit:100
      });

      if (subscriptions.data.length > 0) {
        subscription = subscriptions.data[0];
        no_sub=false;
      }

      let price_data:Stripe.Price = await stripe.prices.retrieve(String(price.price_stripe_id),{expand:['tiers']});

      if(!price_data?.tiers || price_data?.tiers?.length == 0){
        no_sub = true
        console.log("no tiers");
      }

      if(no_sub)
      {   
        let promoCodeData:Stripe.PromotionCode[];

        if (promoCode && promoCode.length > 0 && (typeof(promoCode[0]) != 'number') ) {
          const validCodesData: Stripe.PromotionCode[] = [];
          const invalidCodes: string[] = [];
        
          // Process each code sequentially (you can also use Promise.all if you prefer parallel execution)
          for (const code of promoCode) {
            const found = await findPromo(stripe, code);
            if (found) {
              validCodesData.push(found);
            } else {
              invalidCodes.push(code);
            }
          }
        
          if (invalidCodes.length > 0) {
            return res.json({
              valid: false,
              error: `Invalid Promo Code(s): ${invalidCodes.join(", ")}`
            });
          }
        
          // Now, validCodesData contains all valid promo code objects.
          promoCodeData = validCodesData;
        }

        if (typeof(promoCode[0]) == 'number' || (promoCodeData && promoCodeData[0].coupon.valid && promoCodeData[0].active && APP_SUMO_COUPON_IDS.includes(promoCodeData[0].coupon.id))) {
          
          const {orderedCodes,numPromoSites } = appSumoPromoCount(subscriptions,promoCode);
          
          subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: price.price_stripe_id, quantity: 1 }],
            expand: ['latest_invoice.payment_intent'],
            coupon:APP_SUMO_DISCOUNT_COUPON,
            default_payment_method: customer.invoice_settings.default_payment_method,
            metadata: {
              domainId: domainId,
              userId: userId,
              maxDomains: 1,
              usedDomains: 1,
            },
            description: `Plan for ${domainUrl}(${orderedCodes})`,
          });
          
          await expireUsedPromo(numPromoSites,stripe,orderedCodes);

        } else if (promoCode && promoCode.length > 0) {
          // Coupon is not valid or not the app sumo promo
          return res.json({ valid: false, error: 'Invalid promo code' });
        } else if (cardTrial) {
          subscription = await stripe.subscriptions.create({
            trial_period_days: 30,
            customer: customer.id,
            items: [{ price: price.price_stripe_id, quantity: 1 }],
            expand: ['latest_invoice.payment_intent'],
            default_payment_method: customer.invoice_settings.default_payment_method,
            metadata: {
              domainId: domainId,
              userId: userId,
              maxDomains: 1,
              usedDomains: 1,
            },
            description: `Plan for ${domainUrl}`,
          });
        } else {
          subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: price.price_stripe_id, quantity: 1 }],
            expand: ['latest_invoice.payment_intent'],
            default_payment_method: customer.invoice_settings.default_payment_method,
            metadata: {
              domainId: domainId,
              userId: userId,
              maxDomains: 1,
              usedDomains: 1,
            },
            description: `Plan for ${domainUrl}`,
          });
        }

        let previous_plan;
        try {
          previous_plan = await getSitePlanBySiteId(Number(domainId));
          await deleteTrialPlan(previous_plan.id);
        } catch (error) {
          // console.log('err = ', error);
        }
        
        if(promoCode.length > 0){
          await createSitesPlan(Number(userId), String(subscription.id), planName, billingInterval, Number(domainId), 'appsumo');
        }
        else{
          await createSitesPlan(Number(userId), String(subscription.id), planName, billingInterval, Number(domainId), '');
        }

        console.log('New Sub created');

        res.status(200).json({ success: true });

      }
      else
      {
        

        if ('usedDomains' in subscription.metadata) {
          const UsedDomains = Number(subscription.metadata['usedDomains']);
          const MaxDomains = Number(subscription.metadata['maxDomains']);
          // console.log('UD', UsedDomains);
          // console.log(subscription.metadata);
          if (UsedDomains >= Number(subscription.metadata['maxDomains'])) {
            // res.status(500).json({ error: 'Your Plan Limit has Fulfilled' }); // old code

            let metaData: any = subscription.metadata;

            metaData['usedDomains'] = Number(UsedDomains + 1);
            metaData['updateMetaData'] = true;

            const newQuant = subscription.items.data[0].quantity + 1;

            await stripe.subscriptions.update(subscription.id, {
              metadata: metaData, // Update the metadata
              items: [
                {
                  id: subscription.items.data[0].id, // The subscription item ID
                  quantity: newQuant, // Increment quantity by 5
                },
              ],
            });

            console.log('meta data updated');

            let previous_plan;
            try {
              previous_plan = await getSitePlanBySiteId(Number(domainId));
              await deleteTrialPlan(previous_plan.id);
            } catch (error) {
              // console.log('err = ', error);
            }

            await createSitesPlan(Number(userId), String(subscription.id), planName, billingInterval, Number(domainId), '');


            res.status(200).json({ success: true });



          } else {
            let metaData: any = subscription.metadata;

            metaData['usedDomains'] = Number(UsedDomains + 1);
            metaData['updateMetaData'] = true;

            await stripe.subscriptions.update(subscription.id, {
              metadata: metaData,
            });

            console.log('meta data updated');
            let previous_plan;
            try {
              previous_plan = await getSitePlanBySiteId(Number(domainId));
              await deleteTrialPlan(previous_plan.id);
            } catch (error) {
              console.log('err = ', error);
            }

            await createSitesPlan(Number(userId), String(subscription.id), planName, billingInterval, Number(domainId), '');

            console.log('Old Sub created');

            res.status(200).json({ success: true });
          }
        } else {
          res.status(500).json({ error: 'Meta Data Not Configured' });
        }
      }

    } catch (error) {
      console.log("erroring",error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/create-appsumo-subscription',async (req,res)=>{
    const { email,returnURL, planName,domainId,domainUrl,userId,promoCode } = req.body;

    const appSumoInterval = 'YEARLY';

    const price = await findProductAndPriceByType(planName,appSumoInterval);

    const sites = await getSitesPlanByUserId(Number(userId));

    const sub_id = sites[0]?.subcriptionId;
    

    let no_sub = false;
    let subscription;

    if(sub_id == undefined)
    {
      no_sub = true;
    }
    else
    {
      try {
        subscription = await stripe.subscriptions.retrieve(sub_id) as Stripe.Subscription;
      } catch (error) {
        // console.log("error",error);
        no_sub = true;
      }
    }

    try {
      // Search for an existing customer by email
      const customers = await stripe.customers.list({
        email: email,
        limit: 1
      });

      let customer;

      // Check if customer exists
      if (customers.data.length > 0) {
        customer = customers.data[0];
      }
      else
      {
        res.status(404);
      }

      const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          limit:100
      });

      if (subscriptions.data.length > 0) {
        subscription = subscriptions.data[0];
        no_sub=false;
      }


      if(no_sub)
      {   
        const promoCodes = await stripe.promotionCodes.list({ limit: 100 });
        const promoCodeData = await promoCodes.data.find((pc:any) => pc?.code == promoCode);
      
        if (!promoCodeData) {
          return res.json({ valid: false, error: 'Invalid Promo Code' });
        }
        if (promoCodeData.coupon.valid && promoCodeData.active && promoCodeData.coupon.id == APP_SUMO_COUPON_ID) {
          let price_data = await stripe.prices.retrieve(String(price.price_stripe_id));

          subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: price.price_stripe_id }],
            expand: ['latest_invoice.payment_intent'],
            default_payment_method: customer.invoice_settings.default_payment_method,
            discounts:[{
              promotion_code: promoCodeData?.id,
            }],
            metadata: {
              domainId: domainId,
              userId: userId,
              maxDomains: Number(price_data.transform_quantity['divide_by']),
              usedDomains: 1,
            },
            description: `Plan for ${domainUrl}`,
          });

          let previous_plan;
          try {
            previous_plan = await getSitePlanBySiteId(Number(domainId));
            await deleteTrialPlan(previous_plan.id);
          } catch (error) {
            console.log('err = ', error);
          }

          await createSitesPlan(Number(userId), String(subscription.id), planName, appSumoInterval, Number(domainId), '');

          console.log('New Sub created');

          res.status(200).json({ success: true });
        } else {
          res.status(500).json({ error: "Invalid Promo Code" });
        }

      }
      else
      {
        

        if ('usedDomains' in subscription.metadata) {
          const UsedDomains = Number(subscription.metadata['usedDomains']);
          // console.log('UD', UsedDomains);
          // console.log(subscription.metadata);
          if (UsedDomains >= Number(subscription.metadata['maxDomains'])) {
            res.status(500).json({ error: 'Your Plan Limit has Fulfilled' });
          } else {
            let metaData: any = subscription.metadata;

            metaData['usedDomains'] = Number(UsedDomains + 1);
            metaData['updateMetaData'] = true;

            await stripe.subscriptions.update(subscription.id, {
              metadata: metaData,
            });

            console.log('meta data updated');
            let previous_plan;
            try {
              previous_plan = await getSitePlanBySiteId(Number(domainId));
              await deleteTrialPlan(previous_plan.id);
            } catch (error) {
              // console.log('err = ', error);
            }

            await createSitesPlan(Number(userId), String(subscription.id), planName, appSumoInterval, Number(domainId), '');

            console.log('Old Sub created');

            res.status(200).json({ success: true });
          }
        } else {
          res.status(500).json({ error: 'Meta Data Not Configured' });
        }
      }

    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/subscribe-newsletter', async (req, res) => {
    try {
      const { email } = req.body;
      
      // Validate email format
      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Invalid email address' });
      }

      // Attempt to add the email to the database
      await addNewsletterSub(email);

      // Return success response
      res.status(200).json({ message: 'Subscription successful' });
    } catch (error) {
      console.error('Error subscribing to newsletter:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/check-script', async (req, res) => {
    try {
        const { siteUrl } = req.body;

        const apiUrl = `${process.env.SECONDARY_SERVER_URL}/checkscript/?url=${siteUrl}`;

        // Fetch the data from the secondary server
        const response = await fetch(apiUrl);

        // Check if the response is successful
        if (!response.ok) {
            throw new Error(`Failed to fetch the script check. Status: ${response.status}`);
        }

        // Parse the response as JSON
        const responseData = await response.json();
        
        // Access the result and respond accordingly
        if (responseData.result === "WebAbility") {
            res.status(200).json("Web Ability");

        }
        else if(responseData.result != "Not Found"){
          res.status(200).json("true");
        } 
        else {
            res.status(200).json("false");
        }

    } catch (error) {
        // Handle any errors that occur
        console.error("Error checking script:", error.message);
        res.status(500).json({ error: 'An error occurred while checking the script.' });
    }
});

  app.post('/check-customer',async (req,res)=>{
    const {email,userId} = req.body;
    let plan_name;
    let interval;
    
    try {
      const plans = await getSitesPlanByUserId(userId);
      if (plans.length > 0) {
        for (let i = 0; i < plans.length; i++) {
          let plan = plans[i];
          if (plan.subscription_id !== 'Trial') {
            let prodId = plan.productId;
            let priceId = plan.priceId;
            const prod = await findProductById(Number(prodId));
            const price = await findPriceById(Number(priceId));
            plan_name = prod.type;
            interval = price.type;
            break; // This will exit the loop
          }
        }
      }
    } catch (error) {}
    

    try {
      // Search for an existing customer by email
      const customers = await stripe.customers.list({
        email: email,
        limit: 1
      });

      let customer;
      

      // Check if customer exists
      if (customers.data.length > 0) {
        customer = customers.data[0];
        try {

          const trial_subs = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'trialing', // Retrieve all statuses to filter manually
            limit:100
          });

          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active', // Retrieve all statuses to filter manually
            limit:100
          });

          let price_id;
          let price:Stripe.Price;

          if(subscriptions.data.length > 0){
             price_id = (subscriptions.data[0] as Stripe.Subscription).items.data[0].price

            price = await stripe.prices.retrieve(price_id.id, {
              expand: ['tiers'], // Explicitly expand the tiers
            });
          }
          

          // handle trial output and show trial sub seperately
          if(trial_subs?.data?.length){
            const prod = await stripe.products.retrieve(String(trial_subs?.data[0]?.plan?.product));

            const trialEndTimestamp = trial_subs?.data[0]?.trial_end; // Unix timestamp
            const currentTimestamp = Math.floor(Date.now() / 1000); // Current time in seconds

            const daysRemaining = Math.ceil((trialEndTimestamp - currentTimestamp) / (60 * 60 * 24));

            if(!price || price?.tiers?.length > 0 ){
              
              res.status(200).json({ tierPlan:true,isCustomer: true,plan_name:prod.name,interval:trial_subs.data[0].plan.interval,submeta:trial_subs.data[0].metadata,card:customers?.data[0]?.invoice_settings.default_payment_method,expiry:daysRemaining});
            }
            else{
              
              const monthlyTrialSubs: Array<{ id: string; description: any; trial_end: number | null }> = [];
              const yearlyTrialSubs: Array<{ id: string; description: any; trial_end: number | null }> = [];

              const monthlySubs: Array<{ id: string; description: any;}> = [];
              const yearlySubs: Array<{ id: string; description: any;}> = [];

              trial_subs.data.forEach((subscription:any) => {
                // Retrieve the recurring interval from the first subscription item
                const recurringInterval = subscription.items.data[0]?.price?.recurring?.interval;
              
                // Build an object that includes the subscription's description along with other properties
                const outputObj = {
                  id: subscription.id,
                  description: subscription.description, //subscription.metadata.description
                  trial_end: subscription.trial_end,
                };
              
                // Categorize into monthly or yearly based on the recurring interval
                if (recurringInterval === 'month') {
                  monthlyTrialSubs.push(outputObj);
                } else if (recurringInterval === 'year') {
                  yearlyTrialSubs.push(outputObj);
                }
              });

              subscriptions.data.forEach((subscription:any) => {
                // Retrieve the recurring interval from the first subscription item
                const recurringInterval = subscription.items.data[0]?.price?.recurring?.interval;

                // Create an output object with the desired properties
                const outputObj = {
                  id: subscription.id,
                  description: subscription?.description,
                };

                // Push the subscription into the appropriate array based on the interval
                if (recurringInterval === 'month') {
                  monthlySubs.push(outputObj);
                } else if (recurringInterval === 'year') {
                  yearlySubs.push(outputObj);
                }
              });

              const trial_sub_data = {'monthly':monthlyTrialSubs,'yearly':yearlyTrialSubs}
              const regular_sub_data = {'monthly':monthlySubs,'yearly':yearlySubs}

              let appSumoCount = 0;
              const uniquePromoCodes = new Set<string>();

              for (const subs of Object.values(regular_sub_data)) {
                for (const sub of subs) {
                  const match = sub.description?.match(/\(([^)]*)\)$/);
                  if (match) {
                    appSumoCount++;

                    // split in case there are multiple codes in the ()
                    const codesInDesc = match[1]
                      .split(',')
                      .map((c: string) => c.trim())
                      .filter((c:any) => c.length > 0);

                    codesInDesc.forEach((code:any) => uniquePromoCodes.add(code));
                  }
                }
              }

              res.status(200).json({ trial_subs:JSON.stringify(trial_sub_data),subscriptions:JSON.stringify(regular_sub_data),isCustomer: true,plan_name:prod.name,interval:trial_subs.data[0].plan.interval,submeta:trial_subs.data[0].metadata,card:customers?.data[0]?.invoice_settings.default_payment_method,expiry:daysRemaining,appSumoCount:appSumoCount,codeCount:uniquePromoCodes.size});

            }
  
          }
          else{

          const prod = await stripe.products.retrieve(String(subscriptions.data[0]?.plan?.product));

          if(!price || price?.tiers?.length > 0 ){
            
            res.status(200).json({ tierPlan:true,isCustomer: true,plan_name:prod.name,interval:subscriptions.data[0].plan.interval,submeta:subscriptions.data[0].metadata,card:customers?.data[0]?.invoice_settings.default_payment_method});
          }
          else{
            // New Pricing, return all subs
            
            const monthlySubs: Array<{ id: string; description: any;}> = [];
            const yearlySubs: Array<{ id: string; description: any;}> = [];

            subscriptions.data.forEach((subscription:any) => {
              // Retrieve the recurring interval from the first subscription item
              const recurringInterval = subscription.items.data[0]?.price?.recurring?.interval;

              // Create an output object with the desired properties
              const outputObj = {
                id: subscription.id,
                description: subscription?.description,
              };

              // Push the subscription into the appropriate array based on the interval
              if (recurringInterval === 'month') {
                monthlySubs.push(outputObj);
              } else if (recurringInterval === 'year') {
                yearlySubs.push(outputObj);
              }
            });
            const regular_sub_data = {'monthly':monthlySubs,'yearly':yearlySubs}

            let appSumoCount = 0;
            const uniquePromoCodes = new Set<string>();

            for (const subs of Object.values(regular_sub_data)) {
              for (const sub of subs) {
                const match = sub.description?.match(/\(([^)]*)\)$/);
                if (match) {
                  appSumoCount++;

                  // split in case there are multiple codes in the ()
                  const codesInDesc = match[1]
                    .split(',')
                    .map((c: string) => c.trim())
                    .filter((c:any) => c.length > 0);

                  codesInDesc.forEach((code:any) => uniquePromoCodes.add(code));
                }
              }
            }
            
            res.status(200).json({ subscriptions:JSON.stringify(regular_sub_data),isCustomer: true,plan_name:prod.name,interval:subscriptions.data[0].plan.interval,submeta:subscriptions.data[0].metadata,card:customers?.data[0]?.invoice_settings.default_payment_method,appSumoCount:appSumoCount,codeCount:uniquePromoCodes.size});

          }
  
          
        }
  
          
        } catch (error) {
          console.log(error);
          res.status(200).json({ isCustomer: true,plan_name:"",interval:"",card:customers?.data[0]?.invoice_settings.default_payment_method });
          
        }
        
      }
      else
      {

        res.status(200).json({ isCustomer: false,plan_name:"",interval:"",card:customers?.data[0]?.invoice_settings.default_payment_method });
      }

    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/fix-with-ai', async (req, res) => {
    const { heading, description, help, code } = req.body;
  
    const response = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `
            You are an expert in web accessibility, well-versed in WCAG and ADA guidelines. You understand various accessibility issues and the impact they have on users, especially those with disabilities. 
            Your task is to analyze a provided code snippet and suggest specific corrections or enhancements based on given accessibility issues.
            Here's the structure of the response I want:
  
            {
              correctedCode: Provide the corrected version of the code snippet based on the guidance given in heading, description, and help.
            }
  
            Note: Only return the JSON object, with no additional explanation or introduction.
          `,
        },
        {
          role: 'user',
          content: JSON.stringify({
            heading: heading,
            description: description,
            help: help,
            code: code
          }),
        },
      ],
      model: 'gpt-4o-mini',
    });
  
    const correctedResponse = response.choices[0].message.content.replace(/```json|```/g, '');
    return res.status(200).json(JSON.parse(correctedResponse));
  });

  app.post('/report-problem',async(req,res)=>{
    const { site_url, issue_type, description, reporter_email } = req.body;
    try {
      const domain = site_url.replace(/^(https?:\/\/)?(www\.)?/, '');
      const site:FindAllowedSitesProps = await findSiteByURL(domain);
      if(!site)
      {
        throw new Error("Site not found");
      }
      const problem:problemReportProps = {site_id:site.id, issue_type:issue_type, description:description, reporter_email:reporter_email};

      await addProblemReport(problem);

      res.status(200).send('Success');
      
    } catch (error) {
      console.error("Error reporting problem:", error);
      res.status(500).send("Cannot report problem");
    }

  })

  app.post('/get-problem-reports', async (req, res) => {
    const { user_id } = req.body;
    try {
      // Fetch sites by user ID
      const Sites: IUserSites[] = await findSitesByUserId(user_id);
  
      // Use Promise.all to fetch problem reports for all sites concurrently
      const allReports = (
        await Promise.all(
          Sites.map(async (site: IUserSites) => {
            const reports = await getProblemReportsBySiteId(site.id);
            return reports; // Return reports for each site
          })
        )
      ).flat(); // Flatten the array of arrays into a single array
  
      res.status(200).send(allReports);
    } catch (error) {
      console.error('Error fetching problem reports:', error);
      res.status(500).send('Cannot fetch reports');
    }
  });  

  // app.get('/webAbilityV1.0.min.js', (req, res) => {
  //   res.sendFile(path.join(__dirname, 'webAbilityV1.0.min.js'));
  // });

  // app.get('/create-products', (req, res) => {
  //   run()
  //     .then(() => res.send('insert successfully'))
  //     .catch((err) => res.send(err));
  // });
  app.post('/getScreenshortUrl', async (req: Request, res: Response) => {
    try {
        const url = req.body.url; // Extract URL from request body
        const dataUrl = await fetchAccessibilityReport(url); // Call fetchSitePreview function
        res.send(dataUrl); // Send the generated Data URL as response
    } catch (error) {
        console.error('Error generating screenshot:', error);
        res.status(500).send('Error generating screenshot');
    }
});

  app.post('/form', async (req, res) => {
    console.log('Received POST request for /form:', req.body);
    const uniqueToken = await AddTokenToDB(req.body.businessName, req.body.email, req.body.website);
    if (uniqueToken !== '') {
      res.send('Received POST request for /form');
    } else {
      res.status(500).send('Internal Server Error');
      return;
    }

    try {
      sendMail(
        req.body.email,
        'Welcome to Webability',
        `
            <html>
            <head>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    color: #333333;
                }
                .script-box {
                    background-color: #f4f4f4;
                    border: 1px solid #dddddd;
                    padding: 15px;
                    overflow: auto;
                    font-family: monospace;
                    margin-top: 20px;
                    white-space: pre-wrap;
                }
                .instructions {
                    margin-bottom: 10px;
                }
            </style>
        </head>
        <body>
            <h1>Welcome to Webability!</h1>
            <p class="instructions">To get started with Webability on your website, please follow these steps:</p>
            <ol>
                <li>Copy the script code provided below.</li>
                <li>Paste it into the HTML of your website, preferably near the closing &lt;/body&gt; tag.</li>
            </ol>
            <div class="script-box">
                &lt;script src="https://webability.ca/webAbility.min.js" token="${uniqueToken}"&gt;&lt;/script&gt;
            </div>
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            <p>Thank you for choosing Webability!</p>
        </body>
            </html>
        `,
      );
    } catch (error) {
      console.error('Error sending email:', error);
    }
  });

  app.get('/health', async (req: Request, res: Response) => {
    try {
      await database.raw('SELECT 1');
      
      res.status(200).json({
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(503).json({
        status: 'unhealthy',
        database: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });


  const serverGraph = new ApolloServer({
    schema: makeExecutableSchema({
      typeDefs: RootSchema,
      resolvers: RootResolver as IResolvers[],
    }),
    uploads: {
      maxFileSize: 10000000,
      maxFiles: 20,
    },
    formatError: (err) => {
      if (err.message.includes('Not authenticated')) {
        return new Error('Please login to make this action');
      }

      if (process.env.NODE_ENV === 'production') {
        const result = err.message.match(/ValidationError: (.*)/);
        if (result && result[1]) {
          return new Error(result[1]);
        }
      }

      return err;
    },
    plugins: [
      {
        // Add Sentry tracing for GraphQL operations
        requestDidStart(requestContext) {
          const transaction = Sentry.startTransaction({
            op: 'graphql.request',
            name: requestContext.request.operationName || 'GraphQL Query',
          });
          
          // Store the transaction on the request context
          requestContext.context.sentryTransaction = transaction;
          
          return {
            didEncounterErrors(ctx) {
              // Capture any errors that occur during operation execution
              if (!ctx.operation) return;
              
              for (const err of ctx.errors) {
                if (err instanceof ApolloError) {
                  continue;
                }
                
                withScope((scope) => {
                  scope.setTag('kind', ctx.operation.operation);
                  scope.setExtra('query', ctx.request.query);
                  scope.setExtra('variables', ctx.request.variables);
                  
                  if (err.path) {
                    scope.addBreadcrumb({
                      category: 'query-path',
                      message: err.path.join(' > '),
                      level: Severity.Debug,
                    });
                  }
                  
                  // Set the transaction on the scope
                  scope.setSpan(ctx.context.sentryTransaction);
                  
                  const transactionId = ctx.request.http.headers.get('x-transaction-id');
                  if (transactionId) {
                    scope.setTransactionName(transactionId);
                  }
                  
                  captureException(err);
                });
              }
            },
            
            // Finish the transaction when the request is complete
            willSendResponse(ctx) {
              const transaction = ctx.context.sentryTransaction;
              if (transaction) {
                transaction.finish();
              }
            },
          };
        },
      },
    ],
    context: async ({ req, res }: ContextParams) => {
      const { cookies } = req;
      const bearerToken = cookies.token || null;
      const user = await getUserLogined(bearerToken, res);
      // const ip = getIpAddress(req.headers['x-forwarded-for'], req.socket.remoteAddress);
      return {
        user,
        // ip,
        res,
      };
    },
  });

  serverGraph.applyMiddleware({ app, cors: false });
  
  // Initialize Sentry with tracing for GraphQL
  init({ 
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    integrations: [
      // Enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true })
    ],
    attachStacktrace: true,
  });
  
  app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
  });
})();


// 1000 Promo Code Generation Code

// try {
//   for (let i = 0; i < 1000; i++) {
//     const promotionCode = await stripe.promotionCodes.create({
//       coupon: APP_SUMO_COUPON_ID,
//       max_redemptions: 1, // Ensure the code can only be redeemed once
//       active: true,
//     });
//     if(i % 10 == 0)
//     {
//       console.log(i, "Codes generated")
//     }
//   }
// } catch (error) {
//   console.error('Error creating promotion code:', error);
// }
// res.status(200).json({error:"1000 Created"});

// Code for Promo Code List
    // let promotionCodes:any = [];
    // let hasMore = true;
    // let startingAfter = null;

    // try {
    //   // Retrieve all promotion codes for the coupon
    //   while (hasMore) {
    //     let response:any;
    //     if(startingAfter == null)
    //     {
    //       response = await stripe.promotionCodes.list({
    //         coupon: APP_SUMO_COUPON_ID,
    //         limit: 100, // Stripe's max limit per request
    //       });
    //     }
    //     else{
    //       response = await stripe.promotionCodes.list({
    //         coupon: APP_SUMO_COUPON_ID,
    //         limit: 100, // Stripe's max limit per request
    //         starting_after: startingAfter,
    //       });  
    //     }
    //     const codes = response.data.map((promo:any) => promo.code);
    //     promotionCodes = promotionCodes.concat(codes);
    //     // promotionCodes = promotionCodes.concat(response.data);
    //     hasMore = response.has_more;
    //     if (hasMore) {
    //       startingAfter = response.data[response.data.length - 1].id;
    //     }
    //     console.log("yes");
    //   }
    // } catch (error) {
    //   console.error('Error listing promotion codes:', error);
    // }
    // res.status(200).json({ error: "error.message",codes:promotionCodes });

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Test database connection using existing knex instance
    await database.raw('SELECT 1');
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Add connection error handler to existing database instance
database.on('error', (error: Error) => {
  console.error('Database connection error:', error);
  // Attempt to reconnect
  setTimeout(async () => {
    try {
      await database.raw('SELECT 1');
      console.info('Database reconnected successfully');
    } catch (reconnectError) {
      console.error('Database reconnection failed:', reconnectError);
    }
  }, 5000); // Try to reconnect after 5 seconds
});