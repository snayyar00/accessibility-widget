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
import { withScope, Severity, captureException, init } from '@sentry/node';
import { IResolvers } from '@graphql-tools/utils';
import { makeExecutableSchema } from 'graphql-tools';
import accessLogStream from './middlewares/logger.middleware';
import RootSchema from './graphql/root.schema';
import RootResolver from './graphql/root.resolver';
import getUserLogined from './services/authentication/get-user-logined.service';
import stripeHooks from './services/stripe/webhooks.servive';
import { getIpAddress } from './helpers/uniqueVisitor.helper';
import sendMail from './libs/mail';
import { AddTokenToDB, GetVisitorTokenByWebsite } from './services/webToken/mongoVisitors';
import { fetchAccessibilityReport, fetchSitePreview } from './services/accessibilityReport/accessibilityReport.service';
import { findProductAndPriceByType, findProductByType } from './repository/products.repository';
import { createSitesPlan } from './services/allowedSites/plans-sites.service';
// import run from './scripts/create-products';

type ContextParams = {
  req: Request;
  res: Response;
};

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const allowedOrigins = [process.env.FRONTEND_URL, undefined, 'http://localhost:5000', 'https://www.webability.io'];
const allowedOperations = ['validateToken', 'addImpressionsURL', 'registerInteraction'];
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);

app.use(express.json());

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
  app.post('/stripe-hooks', bodyParser.raw({ type: 'application/json' }), stripeHooks);
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

  app.post('/billing-portal-session',async (req,res)=>{
    const {email,returnURL} = req.body;

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
    }


    try {
      const session = await stripe.billingPortal.sessions.create({
        customer:customer.id,
        return_url:returnURL
      });
      return res.status(200).json(session);
    } catch (error) {
      console.log(error);
      return res.status(500);
    }

  })

  app.post('/validate-coupon', async (req, res) => {
    const { couponCode } = req.body;
  
    try {
      const promoCodes = await stripe.promotionCodes.list({ limit: 100 });
      const promoCodeData = await promoCodes.data.find((pc:any) => pc?.code == couponCode);
      
      if (!promoCodeData) {
        return res.json({ valid: false, error: 'Invalid promo code' });
      }
      if(promoCodeData.coupon.percent_off)
      {
        res.json({ valid: true, discount: (Number(promoCodeData.coupon.percent_off)/100),id:promoCodeData?.coupon?.id,percent:true});
      }
      else
      {
        res.json({ valid: true, discount: (Number(promoCodeData.coupon.amount_off)/100),id:promoCodeData?.coupon?.id,percent:false });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.post('/create-checkout-session',async (req,res)=>{
    const { email,planName,billingInterval,returnUrl,domainId,userId,domain} = req.body;
     
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

      // Create the checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [{
          price: price.price_stripe_id,
          quantity: 1,
        }],
        customer: customer.id,
        success_url: `${returnUrl}`,
        cancel_url: returnUrl,
        metadata: {
          domainId: domainId,
          userId:userId
        },
        subscription_data:{
          metadata: {
            domainId: domainId,
            userId:userId
          },
          description:`Plan for ${domain}`
        }
      });

      res.status(303).json({ url: session.url });

    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/create-subscription',async (req,res)=>{
    const { email,returnURL, planName,billingInterval,domainId,domainUrl,userId } = req.body;

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
      }
      else
      {
        res.status(404);
      }

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: price.price_stripe_id }],
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          domainId: domainId,
          userId:userId
        },
        description:`Plan for ${domainUrl}`
      });

      await createSitesPlan(Number(userId), String(subscription.id), planName, billingInterval, Number(domainId), '');
      console.log("created");

      res.status(200).json({success:true});

    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/check-customer',async (req,res)=>{
    const { email} = req.body;

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

        res.status(200).json({ isCustomer: true });
      }
      else
      {
        res.status(200).json({ isCustomer: false });
      }

      

    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
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

  const serverGraph = new ApolloServer({
    uploads: false,
    schema: makeExecutableSchema({
      typeDefs: RootSchema,
      resolvers: RootResolver as IResolvers[],
    }),
    plugins: [
      {
        requestDidStart() {
          return {
            didEncounterErrors(ctx: any) {
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

                  const transactionId = ctx.request.http.headers.get('x-transaction-id');
                  if (transactionId) {
                    scope.setTransactionName(transactionId);
                  }
                  captureException(err);
                });
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
      const ip = getIpAddress(req.headers['x-forwarded-for'], req.socket.remoteAddress);
      return {
        user,
        ip,
        res,
      };
    },
  });

  serverGraph.applyMiddleware({ app, cors: false });
  init({ dsn: process.env.SENTRY_DSN });
  app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
  });
})();
