import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS for frontend
const corsOrigin = process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : 'http://localhost:5173';

// cors debug 
console.log(`CORS origin set to: ${corsOrigin}`);

app.use(cors({
    origin: corsOrigin,
    credentials: true
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!')
});

app.use('/api', apiRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handlers
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  
  if (err.name === 'UnauthorizedError') {
    res.status(401).json({ error: 'Authentication Error', message: 'Invalid or expired token' });
  } else {
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message 
    });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: `Cannot ${req.method} ${req.path}` });
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})

export default app;