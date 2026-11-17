import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { connectDatabase } from './db.js';

const config = loadConfig();
const app = createApp();

await connectDatabase(config.MONGODB_URI);
app.listen(config.PORT, () => console.log(`Globelink API listening on port ${config.PORT}`));
