import 'node:dotenv/config';
import { createApp } from './app.js';

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`✅  TaskFlow API listening on http://localhost:${PORT}`);
  console.log(`📚  API docs: http://localhost:${PORT}/docs`);
});
