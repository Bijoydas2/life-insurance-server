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

    app.get('/reviews', async (req, res) => {
  try {
    const reviews = await collections.reviews.find().sort({ createdAt: -1 }).toArray();
    res.send(reviews);
  } catch (err) {
    res.status(500).send({ message: 'Failed to fetch reviews' });
  }
});
    // popular polici
    app.get('/policies/popular', async (req, res) => {
   try {
    const popular = await collections.policies
      .find()
      .sort({ purchaseCount: -1 }) 
      .limit(6)
      .toArray();

    res.send(popular);
  } catch (err) {
    res.status(500).send({ message: "Failed to fetch popular policies" });
  }
});
// blogs
app.get("/blogs/latest", async (req, res) => {
  try {
    const mostVisitedBlogs = await collections.blogs
      .find()
      .sort({ totalVisit: -1 })  
      .limit(4)                  
      .toArray();
    res.send(mostVisitedBlogs);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch most visited blogs" });
  }
});

// Get all blogs
app.get('/blogs', async (req, res) => {
  try {
    const blogs = await collections.blogs.find().sort({ createdAt: -1 }).toArray();
    res.send(blogs);
  } catch (error) {
    res.status(500).send({ message: 'Failed to fetch blogs' });
  }
});

// Get single blog & increment visit count
app.get("/blogs/:id", async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ message: "Invalid blog ID" });
  }

  try {
    const blog = await collections.blogs.findOne({ _id: new ObjectId(id) });

    if (!blog) {
      return res.status(404).send({ message: "Blog not found" });
    }

    await collections.blogs.updateOne(
      { _id: new ObjectId(id) },
      { $inc: { totalVisit: 1 } }
    );

  
    res.send({ ...blog, totalVisit: blog.totalVisit + 1 });
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch blog" });
  }
});

// get agents api
app.get('/agents', async (req, res) => {
  try {
    const agents = await collections.users
      .find({ role: 'agent' })
      .sort({ created_at: -1 }) 
      .limit(3)
      .toArray();
    res.send(agents);
  } catch (error) {
    res.status(500).send({ message: 'Failed to fetch agents' });
  }
});
// all polices

app.get('/policies', async (req, res) => {
  try {
    const { page = 1, limit = 9, category, search } = req.query;

    const query = {};

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Search by title (case-insensitive)
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const total = await collections.policies.countDocuments(query);
    const policies = await collections.policies
      .find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    res.send({
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      policies
    });
  } catch (err) {
    res.status(500).send({ message: 'Failed to fetch policies' });
  }
});
// polycie details
app.get("/policies/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const policy = await collections.policies.findOne({ _id: new ObjectId(id) });
    res.send(policy);
  } catch {
    res.status(500).send({ error: "Policy not found" });
  }
});


// newsletter collection
app.post('/newsletter', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).send({ message: "Email is required" });
    }

    const existing = await collections.newsletters.findOne({ email });
    if (existing) {
      return res.status(409).send({ message: "Email already subscribed" });
    }

    await collections.newsletters.insertOne({ email, createdAt: new Date().toISOString() });
    res.status(201).send({ message: "Subscribed successfully" });
  } catch (error) {
    res.status(500).send({ message: "Failed to subscribe" });
  }
});
// user
    app.get('/users', async (req, res) => {
      try {
        const { role } = req.query;
        const query = role ? { role } : {};
        const users = await collections.users.find(query).sort({ created_at: -1 }).toArray();
        res.send(users);
      } catch (error) {
        res.status(500).send({ message: 'Failed to fetch users' });
      }
    });
    // Promote customer to agent by email
app.patch('/users/promote/:email', async (req, res) => {
  const email = req.params.email;
  if (!email) return res.status(400).send({ message: "Email is required" });

  try {
    const result = await collections.users.updateOne(
      { email: email.toLowerCase(), role: "customer" },
      { $set: { role: "agent" } }
    );
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to promote user" });
  }
});

// Demote agent to customer by email
app.patch('/users/demote/:email', async (req, res) => {
  const email = req.params.email;
  if (!email) return res.status(400).send({ message: "Email is required" });

  try {
    const result = await collections.users.updateOne(
      { email: email.toLowerCase(), role: "agent" },
      { $set: { role: "customer" } }
    );
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to demote user" });
  }
});

  app.post('/users', async (req, res) => {
  const email = req.body.email;
  const userExist = await collections.users.findOne({ email });

  if (userExist) {
    const lastLoginUpdate = await collections.users.updateOne(
      { email },
      { $set: { last_login: new Date() } }
    );
    return res.send({
      message: "User already exists, last login updated",
      inserted: false,
      lastLoginUpdated: lastLoginUpdate.modifiedCount > 0
    });
  }

  const user = {
    ...req.body,
    created_at: new Date(),
    last_login: new Date(), 
  };

  const result = await collections.users.insertOne(user);
  res.send(result);
 });
 // Delete user by email (optional)
app.delete('/users/:email', async (req, res) => {
  const email = req.params.email;
  if (!email) return res.status(400).send({ message: "Email is required" });

  try {
    const result = await collections.users.deleteOne({ email: email.toLowerCase() });
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to delete user" });
  }
});
//  get application
 app.get('/applications', async (req, res) => {
  const data = await collections.applications.find().sort({ appliedAt: -1 }).toArray();
  res.send(data);
});
//  polciy details application
app.post('/applications', async (req, res) => {
  try {
    const application = {
      ...req.body,
      status: 'Pending',
      
    };

    const result = await collections.applications.insertOne(application);
    res.status(201).send(result);
  } catch (error) {
    console.error("Error saving application:", error);
    res.status(500).send({ message: "Failed to submit application" });
  }
});
// PATCH: reject application
app.patch('/applications/reject/:id', async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ message: "Invalid ID" });
  }

  const result = await collections.applications.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: "Rejected" } }
  );
  res.send(result);
});

app.patch('/applications/assign/:id', async (req, res) => {
  const { id } = req.params;
  const { agent } = req.body;

  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ message: "Invalid ID" });
  }

  const result = await collections.applications.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: "Approved", assignedAgent: agent } }
  );
  res.send(result);
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
  if (!email) {
    return res.status(400).send({ message: "Email is required" });
  }

  try {
    // Case-insensitive email match to ensure consistency
    const user = await collections.users.findOne({
      email: email,
    });

    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    res.send({ role: user.role || "customer" });
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch user role" });
  }
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
