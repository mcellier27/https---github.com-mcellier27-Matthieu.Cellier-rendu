const express = require("express");
const postgres = require("postgres");
const crypto = require("crypto");
const z = require("zod");

// Utilisation de l'importation dynamique pour résoudre l'erreur ERR_REQUIRE_ESM
import("node-fetch").then(({ default: fetch }) => {
  const app = express();
  const port = 8000;
  const sql = postgres({ db: "mydb", user: "user", password: "password" });

  app.use(express.json());
  app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}`);
  });

  /* F2P GAMES */

  app.get("/f2p-games", async (req, res) => {
    try {
      const response = await fetch("https://www.freetogame.com/api/games");

      if (response.ok) {
        const data = await response.json();

        res.send(data);
      } else {
        res.status(response.status).send("Error fetching Free-to-Play games");
      }
    } catch (error) {
      console.error("Error fetching Free-to-Play games:", error);
      res.status(500).send("Error fetching Free-to-Play games");
    }
  });

  app.get("/f2p-games/:id", async (req, res) => {
    const gameId = req.params.id;
    try {
      const response = await fetch(
        `https://www.freetogame.com/api/game?id=${gameId}`
      );

      if (response.ok) {
        const data = await response.json();

        res.send(data);
      } else {
        res
          .status(response.status)
          .send("Error fetching Free-to-Play game details");
      }
    } catch (error) {
      console.error("Error fetching Free-to-Play game details:", error);
      res.status(500).send("Error fetching Free-to-Play game details");
    }
  });

  /* PRODUCT */

  const ProductSchema = z.object({
    id: z.string(),
    name: z.string(),
    about: z.string(),
    price: z.number().positive(),
  });

  app.get("/products/:id", async (req, res) => {
    const productId = req.params.id;
    try {
      const product = await sql`
          SELECT * FROM products WHERE id = ${productId}
        `;
      if (product.length === 0) {
        res.status(404).send("Product not found");
      } else {
        res.send(product[0]);
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).send("Error fetching product from database");
    }
  });

  app.get("/products", async (req, res) => {
    const page = req.query.page ? parseInt(req.query.page) : 1; // Numéro de la page
    const limit = 10;
    const offset = (page - 1) * limit; // Calcul de l'offset

    try {
      const products = await sql`
          SELECT * FROM products
          ORDER BY id
          LIMIT ${limit} OFFSET ${offset}
        `;

      res.send(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).send("Error fetching products from database");
    }
  });

  const CreateProductSchema = ProductSchema.omit({ id: true });
  app.post("/products", async (req, res) => {
    const result = await CreateProductSchema.safeParse(req.body);
    if (result.success) {
      const { name, about, price } = result.data;

      try {
        const product = await sql`
        INSERT INTO products (name, about, price)
        VALUES (${name}, ${about}, ${parseFloat(price)}) RETURNING *
    `;

        res.send(product[0]);
      } catch (error) {
        console.error("Error creating product:", error);
        res.status(500).send("Error creating product in database");
      }
    } else {
      res.status(400).send(result);
    }
  });

  app.delete("/products/:id", async (req, res) => {
    const productId = req.params.id;
    try {
      const result = await sql`
          DELETE FROM products WHERE id = ${productId}
        `;
      if (result.affectedRows === 0) {
        res.status(404).send("Product not found");
      } else {
        res.send("Product deleted successfully");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).send("Error deleting product from database");
    }
  });

  /* USER */
  const UserSchema = z.object({
    username: z.string(),
    email: z.string().email(),
    password: z.string(),

  });

  const CreateUserSchema = UserSchema.omit({ id: true });
  app.post("/users", async (req, res) => {
    const { username, email, password } = req.body;
    const result = CreateUserSchema.safeParse({ username, email, password });

    if (result.success) {
      const { username, email, password } = result.data;

      const hashedPassword = crypto
        .createHash("sha512")
        .update(password)
        .digest("hex");

      try {
        const newUser = await sql`
          INSERT INTO users (username, email, password)
          VALUES (${username}, ${email}, ${hashedPassword})
          RETURNING id, username, email
        `;

        res.status(201).send(newUser[0]);
      } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).send("Error creating user");
      }
    } else {
      res.status(400).send(result.error);
    }
  });

  app.get("/users", async (_, res) => {
    try {
      const users = await sql`
          SELECT id, username, email FROM users
        `;
      res.send(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).send("Error fetching users");
    }
  });

  app.get("/users/:id", async (req, res) => {
    const userId = req.params.id;
    try {
      const user = await sql`
          SELECT id, username, email FROM users WHERE id = ${userId}
        `;
      if (user.length === 0) {
        res.status(404).send("User not found");
      } else {
        res.send(user[0]);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).send("Error fetching user");
    }
  });

  app.put("/users/:id", async (req, res) => {
    const userId = req.params.id;
    const { username, email } = req.body;

    try {
      const updatedUser = await sql`
          UPDATE users SET username = ${username}, email = ${email} WHERE id = ${userId}
          RETURNING id, username, email
        `;
      if (updatedUser.length === 0) {
        res.status(404).send("User not found");
      } else {
        res.send(updatedUser[0]);
      }
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).send("Error updating user");
    }
  });

  app.patch("/users/:id", async (req, res) => {
    const userId = req.params.id;
    const { email } = req.body;

    try {
      const updatedUser = await sql`
          UPDATE users SET email = ${email} WHERE id = ${userId}
          RETURNING id, username, email
        `;
      if (updatedUser.length === 0) {
        res.status(404).send("User not found");
      } else {
        res.send(updatedUser[0]);
      }
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).send("Error updating user");
    }
  });
}); 