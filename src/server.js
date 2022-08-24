import express from 'express';
import mercadopago from 'mercadopago';
import cors from "cors";
import { categoriesRouter } from './routes/categories.routes.js';
import { productsRouter } from './routes/products.routes.js';
import { usersRouter } from './routes/users.routes.js';
import { cartsRouter } from './routes/carts.routes.js';
import { ordersRouter } from './routes/orders.routes.js';

mercadopago.configure({
  access_token: process.env.MP_SELLER_USER_ACCESS_TOKEN,
  integrator_id: process.env.MP_INTEGRATOR_ID
})

const app = express();
const PORT = process.env.PORT;

app.use(
  cors({
    origin: [process.env.APP_URL, process.env.ADMIN_APP_URL],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["accept", "authorization", "content-type"]
  })
)

app.use(express.json());

app.use(categoriesRouter)
app.use(productsRouter)
app.use(usersRouter)
app.use(cartsRouter)
app.use(ordersRouter)

app.listen(PORT, ()=> {
  console.log(`Server running on port ${PORT}`);
})