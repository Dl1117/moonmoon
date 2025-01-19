import express from 'express';
import bodyParser from 'body-parser';
import adminRoutes from './src/routes/adminRoutes.js'
import cors from 'cors';
import dotenv from 'dotenv';

const app = express();
const port = process.env.PORT || 4000;
dotenv.config();
// Middleware

app.use(cors());
app.use(bodyParser.json());


// Set Content-Type to JSON and disable caching
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  next();
});


// Routes
app.use('/admin', adminRoutes);

// app.listen(port, () => {
//   console.log(`Server is running on http://localhost:${port}`);
// });
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});

