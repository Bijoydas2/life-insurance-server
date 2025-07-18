const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uevarui.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db("insuranceDB");


    // ✅ Grouped Collections
    const collections = {
      users: db.collection("users"),
      policies: db.collection("policies"),
      applications: db.collection("applications"),
      transactions: db.collection("transactions"),
      blogs: db.collection("blogs"),
      reviews: db.collection("reviews"),
      claims: db.collection("claims"),
      newsletters: db.collection("newsletters"),
    };
    // popular polici
    app.get('/policies/popular', async (req, res) => {
   try {
    const popular = await collections.policies
      .find()
      .sort({ purchaseCount: -1 }) // sort by popularity
      .limit(6)
      .toArray();

    res.send(popular);
  } catch (err) {
    res.status(500).send({ message: "Failed to fetch popular policies" });
  }
});

    // ----------  Save or Update User ----------
    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const userData = req.body;
      const filter = { email };
      const updateDoc = {
        $set: userData,
      };
      const options = { upsert: true };
      const result = await collections.users.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    // ----------  Get User Role ----------
    app.get("/users/role/:email", async (req, res) => {
      const email = req.params.email;
      const user = await collections.users.findOne({ email });
      res.send({ role: user?.role || "customer" });
    });

    // ----------  Sample Public Route ----------
    app.get("/", (req, res) => {
      res.send("Life Insurance Backend is Running...");
    });

    app.listen(port, () => {
      console.log(` Server running on http://localhost:${port}`);
    });

  } catch (err) {
    console.error("Failed to start server:", err.message);
  }
}

run();
