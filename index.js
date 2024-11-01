import express from 'express';
import bodyParser from 'body-parser';
import adminRoutes from './src/routes/adminRoutes.js'
import cors from 'cors';
const app = express();
const port = process.env.PORT || 3000;

// Middleware

app.use(cors());
app.use(bodyParser.json());


// Set Content-Type to JSON and disable caching
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

//hllgmrke

// Routes
app.use('/admin', adminRoutes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
