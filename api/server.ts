/* eslint-disable wrap-iife */
import dotenv from 'dotenv';
import { resolve, join } from 'path';
import express, { NextFunction, Request, Response } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
require('module-alias/register');
import { ApolloServer, makeExecutableSchema, IResolvers, ApolloError } from 'apollo-server-express';
import { withScope, Severity, captureException, init } from '@sentry/node';
import accessLogStream from '~/middlewares/logger.middleware';
import RootSchema from './graphql/root.schema';
import RootResolver from './graphql/root.resolver';
import getUserLogined from './services/authentication/get-user-logined.service';
import stripeHooks from './services/stripe/webhooks.servive';
import { getIpAddress } from './helpers/uniqueVisitor.helper';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import Visitor from './mongoSchema/visitor.model';
import { AddTokenToDB, GetVisitorTokenByWebsite } from './services/webToken/mongoVisitors';

type ContextParams = {
  req: Request;
  res: Response;
};

dotenv.config();



const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

async function sendEmail(sendTo: string, subject: string, text: string) {
  if (!sendTo || sendTo.trim() === '') {
    console.error('Recipient email address is missing or empty.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10),
    secure: process.env.EMAIL_SECURE === 'true', // should be true if EMAIL_PORT is 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  } as nodemailer.TransportOptions);

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: sendTo,
    subject: subject,
    text: text
  };

  try {
    const info: any = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}


function dynamicCors(req: Request, res: Response, next: NextFunction) {
  console.log(req);
  const corsOptions = {
    optionsSuccessStatus: 200,
    credentials: true,
    origin: (origin:any, callback:any) => {
      // console.log(origin);
      if (req.body && req.body.operationName === 'validateToken') {
        // Allow any origin for 'validateToken'
        callback(null, true);
      } else if (origin === process.env.FRONTEND_URL || origin === undefined || origin === 'http://localhost:5000'||req.method === 'OPTIONS') {
        // Allow your specific frontend origin
        callback(null,true);
      } else {
        // Disallow other origins
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  };

  cors(corsOptions)(req, res, next);
}

(function startServer() {
  app.use(morgan('combined', { stream: accessLogStream }));
  // app.use(cors(corsOptions));
  // app.use(cors({
  //   origin: 'https://www.webability.io',
  //   methods: 'GET,POST',
  //   credentials: true
  // }));
  app.use(dynamicCors)



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
  })

  app.post('/form', async (req, res) => {
    console.log('Received POST request for /form:', req.body);
    const uniqueToken = await AddTokenToDB(req.body.businessName, req.body.email, req.body.website);
    if (uniqueToken !== '') {
      res.send('Received POST request for /form');
    }
    else {
      res.status(500).send('Internal Server Error');
      return;
    }

    try {
      sendEmail(req.body.email, 'Welcome to Webability', `
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
        `);
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