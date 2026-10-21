'use strict';

/*
 * Zero Health API: INTENTIONALLY VULNERABLE TRAINING LAB
 * ------------------------------------------------------
 * This server contains deliberate security flaws for teaching purposes.
 * It binds to localhost only unless explicitly overridden. See README.
 */

import express from 'express';
import cors from 'cors';
import routes from './routes';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
// Loud, persistent marker that this is a lab, surfaced on every response.
app.use((req, res, next) => {
  res.setHeader('X-Zero-Health-Lab', 'intentionally-vulnerable-do-not-deploy');
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', lab: true, warning: 'intentionally vulnerable' });
});

app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({ error: 'not found' });
});

// Keep the API JSON-only: unhandled errors must not surface HTML error pages.
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[api] unhandled error:', err);
  res.status(500).json({ error: 'internal error' });
});

const PORT = Number(process.env.PORT || 4000);
// Guardrail: refuse non-local binding unless the operator opts in explicitly.
const requestedHost = process.env.HOST || '127.0.0.1';
const isLocal = requestedHost === '127.0.0.1' || requestedHost === 'localhost';
const override = process.env.I_UNDERSTAND_THIS_IS_INSECURE === '1';

let host = requestedHost;
if (!isLocal && !override) {
  console.error(
    '\n[Zero Health] Refusing to bind to a non-local address (%s).\n' +
      'This app is intentionally vulnerable and must not be exposed.\n' +
      'Falling back to 127.0.0.1. Set I_UNDERSTAND_THIS_IS_INSECURE=1 to override.\n',
    requestedHost
  );
  host = '127.0.0.1';
} else if (!isLocal && override) {
  console.warn(
    '\n[Zero Health] WARNING: binding to %s on an INTENTIONALLY VULNERABLE app.\n' +
      'You have explicitly overridden the safety guardrail. Do not do this on any\n' +
      'network you do not fully control.\n',
    requestedHost
  );
}

app.listen(PORT, host, () => {
  console.log('\n==================================================');
  console.log(' Zero Health API: INTENTIONALLY VULNERABLE LAB');
  console.log(' Do not deploy publicly. Synthetic data only.');
  console.log(' Listening on http://%s:%d', host, PORT);
  console.log('==================================================\n');
});
