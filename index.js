const express = require("express");
const cors = require("cors");
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_GATEWAY_KEY);
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
// GET /claims/all -
app.get("/claims/all", async (req, res) => {
  try {
    const claims = await collections.claims.find().sort({ claimDate: -1 }).toArray();
    res.send(claims);
  } catch (error) {
    console.error("Failed to fetch all claims:", error);
    res.status(500).send({ message: "Failed to fetch claims" });
  }
});
// claims 
app.get("/claims", async (req, res) => {
  const email = req.query.email;
  const result = await collections.claims.find({ userEmail: email }).toArray();
  res.send(result);
});
 app.post("/claims", async (req, res) => {
  const claim = req.body;
  const result = await collections.claims.insertOne(claim);
  res.send(result); 
 });
// Update claim status (approve)
app.patch('/claims/:id', async (req, res) => {
  const { id } = req.params;
  const { newStatus } = req.body;

  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ message: "Invalid claim ID" });
  }

  if (!newStatus) {
    return res.status(400).send({ message: "New status is required" });
  }

  try {
    const result = await collections.claims.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: newStatus } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Claim not found" });
    }

    res.send(result);
  } catch (error) {
    console.error("Failed to update claim status:", error);
    res.status(500).send({ message: "Failed to update claim status" });
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

app.get('/blogs/manage', async (req, res) => {
  const { email, role } = req.query;

  if (!email || !role) {
    return res.status(400).send({ message: "Email and role are required" });
  }

  try {
    let query = {};
    if (role !== "admin") {
      
      query = { authorEmail: email.toLowerCase() };
    }

    const blogs = await collections.blogs.find(query).sort({ createdAt: -1 }).toArray();

  
    const normalizedBlogs = blogs.map(blog => ({
      ...blog,
      _id: blog._id.toString(),
      totalVisit: blog.totalVisit || 0
    }));

    res.send(normalizedBlogs);
  } catch (error) {
    console.error("Error fetching blogs:", error);
    res.status(500).send({ message: "Failed to fetch blogs" });
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



// POST create new blog
app.post('/blogs', async (req, res) => {
  try {
    const { title, details, image, author, authorProfile, authorEmail } = req.body;

    if (!title || !details || !author || !authorEmail) {
      return res.status(400).send({ message: "Missing required fields" });
    }

    const newBlog = {
      title,
      details,
      image: image || null,
      author,
      authorProfile: authorProfile || null,
      authorEmail: authorEmail.toLowerCase(),
      createdAt: new Date(),
      totalVisit: 0,
    };

    const result = await collections.blogs.insertOne(newBlog);
    res.status(201).send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Failed to create blog" });
  }
});

app.patch('/blogs/:id', async (req, res) => {
  const { id } = req.params;
  const { title, details, image, authorProfile } = req.body;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid blog ID" });
  }

  if (!title || !details) {
    return res.status(400).json({ message: "Title and details are required" });
  }

  try {
    const updateDoc = {
      $set: {
        title,
        details,
        image,
        authorProfile,
        updatedAt: new Date()
      }
    };

    const result = await collections.blogs.updateOne(
      { _id: new ObjectId(id) },
      updateDoc
    );

    if (!result.matchedCount) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.json({ message: "Blog updated successfully" });
  } catch (error) {
    console.error("Update blog error:", error);
    res.status(500).json({ message: "Failed to update blog" });
  }
});


// DELETE blog by ID
app.delete('/blogs/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid blog ID' });
    }
    const result = await collections.blogs.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 1) {
      return res.status(200).json({ deletedCount: 1 });
    }
    res.status(404).json({ deletedCount: 0, message: 'Blog not found' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ deletedCount: 0, message: 'Internal server error' });
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
// admin all policy
app.get('/admin/policies', async (req, res) => {
  try {
    const policies = await collections.policies.find().toArray();
    res.send(policies);
  } catch (err) {
    console.error("Error fetching all policies:", err.message);
    res.status(500).send({ message: 'Failed to fetch policies' });
  }
});

// Add new policy
app.post('/policies', async (req, res) => {
  try {
    const policy = req.body; // validate fields on your own
    const result = await collections.policies.insertOne(policy);
    res.status(201).send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to add policy" });
  }
});

// Update policy
app.put('/policies/:id', async (req, res) => {
  const { id } = req.params;
  const updatedPolicy = req.body;

  try {
    const result = await collections.policies.updateOne(
      { _id: new ObjectId(id) },
      { $set: {
          title: updatedPolicy.title,
          category: updatedPolicy.category,
          description: updatedPolicy.description,
          minAge: updatedPolicy.minAge,
          maxAge: updatedPolicy.maxAge,
          basePremium: updatedPolicy.basePremium,
          image: updatedPolicy.image,
          coverageRange: updatedPolicy.coverageRange,
          durationOptions: updatedPolicy.durationOptions || [],
          eligibility: updatedPolicy.eligibility || [],
          benefits: updatedPolicy.benefits || [],
          premiumLogic: updatedPolicy.premiumLogic || "",
          updatedAt: new Date(),
        }
      }
    );

    res.send(result);
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).send({ message: "Failed to update policy" });
  }
});


// Delete policy
app.delete('/policies/:id', async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) return res.status(400).send({ message: "Invalid ID" });

  try {
    const result = await collections.policies.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to delete policy" });
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
app.get('/users/profile', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).send({ error: "Email is required" });

  const user = await collections.users.findOne({ email });
  res.send(user);
});
// PATCH /users/:email
app.patch("/users/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const { name, photoURL } = req.body;

    const updateDoc = {};
    if (name) updateDoc.name = name;
    if (photoURL) updateDoc.photoURL = photoURL;

    if (Object.keys(updateDoc).length === 0) {
      return res.status(400).send({ error: "No valid fields to update" });
    }

    const result = await collections.users.updateOne(
      { email },
      { $set: updateDoc }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ error: "User not found" });
    }

    res.send({ message: "User updated", result });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).send({ error: "Internal server error" });
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
// customer  applied policy
app.get('/applications/customer', async (req, res) => {
  const { email } = req.query;
  const result = await collections.applications.find({ email: email }).toArray();
  res.send(result);
});
// POST /reviews


app.post('/reviews', async (req, res) => {
  try {
    const { policyId, rating, feedback, customerName, customerEmail } = req.body;

    if (!policyId || !rating) {
      return res.status(400).send({ error: 'policyId and rating are required' });
    }


    await collections.reviews.insertOne({
      policyId: new ObjectId(policyId),
      rating: Number(rating),
      feedback,
      customerName,
      customerEmail,
      createdAt: new Date()
    });

   
    await collections.policies.updateOne(
      { _id: new ObjectId(policyId) },
      { $set: { rating: Number(rating) } }
    );

    res.send({ message: 'Review saved and rating updated' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Server error' });
  }
});



//  get application
 app.get('/applications', async (req, res) => {
  const data = await collections.applications.find().sort({ appliedAt: -1 }).toArray();
  res.send(data);
});
// GET: Get applications assigned to a specific agent
app.get('/applications/assigned', async (req, res) => {
  const agentEmail = req.query.email;

  if (!agentEmail) {
    return res.status(400).send({ message: "Agent email is required" });
  }

  try {
    const applications = await collections.applications
      .find({ assignedAgent: agentEmail })
      .sort({ createdAt: -1 })
      .toArray();

    res.send(applications);
  } catch (err) {
    console.error("Error fetching assigned applications:", err.message);
    res.status(500).send({ message: "Failed to fetch assigned applications" });
  }
});
// approved application
// Express.js route
app.get('/applications/approved', async (req, res) => {
  const email = req.query.email;
  const query = { email: email, status: "Approved" };
  const result = await collections.applications.find(query).toArray();
  res.send(result);
});



//  policy details application
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
// PATCH: Update application status (Agent panel)
app.patch('/applications/status/:id', async (req, res) => {
  const { id } = req.params;
  const { newStatus, policyId } = req.body;

  if (!ObjectId.isValid(id) || !newStatus) {
    return res.status(400).send({ message: "Invalid ID or status" });
  }

  try {
    const updateAppResult = await collections.applications.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: newStatus } }
    );

    // ✅ If approved, increase policy purchase count
    if (newStatus === "Approved" && policyId) {
      await collections.policies.updateOne(
        { _id: new ObjectId(policyId) },
        { $inc: { purchaseCount: 1 } }
      );
    }

    res.send(updateAppResult);
  } catch (error) {
    console.error("Failed to update status:", error.message);
    res.status(500).send({ message: "Failed to update application status" });
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
 
        app.get('/users/:email/role', async (req, res) => {
            try {
                const email = req.params.email;

                if (!email) {
                    return res.status(400).send({ message: 'Email is required' });
                }

                const user = await collections.users.findOne({ email });

                if (!user) {
                    return res.status(404).send({ message: 'User not found' });
                }

                res.send({ role: user.role || 'customer' });
            } catch (error) {
                console.error('Error getting user role:', error);
                res.status(500).send({ message: 'Failed to get role' });
            }
        });

  app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount) {
      return res.status(400).send({ message: "Amount is required" });
    }

    const amountInCents = Math.round(amount * 100); // Convert to cents

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      payment_method_types: ['card'],
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
 
app.get('/transactions', async (req, res) => {
  const { from, to, user, policy } = req.query;
  const query = {};

  if (from && to) {
    query.date = {
      $gte: new Date(from),
      $lte: new Date(to),
    };
  }
  if (user) {
    query.email = { $regex: user, $options: 'i' };
  }

  if (policy) {
    query.policyName = { $regex: policy, $options: 'i' };
  }

  try {
    const transactions = await collections.transactions
      .find(query)
      .sort({ date: -1 })
      .toArray();

   
    const totalIncome = transactions.reduce((acc, t) => acc + (t.amount || 0), 0);

    res.json({ transactions, totalIncome });
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
});

app.post('/payments', async (req, res) => {
  try {
    const payment = {
      ...req.body,
      createdAt: new Date(),
    };

    const result = await collections.transactions.insertOne(payment);
    res.status(201).send(result);
  } catch (error) {
    console.error("Error saving payment:", error.message);
    res.status(500).send({ message: "Failed to save payment" });
  }
});

app.patch('/applications/:id', async (req, res) => {
  const { id } = req.params;
  const { paymentStatus } = req.body;

  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ message: "Invalid application ID" });
  }

  try {
    const result = await collections.applications.updateOne(
      { _id: new ObjectId(id) },
      { $set: { paymentStatus } }
    );
    res.send(result);
  } catch (error) {
    console.error("Error updating application:", error.message);
    res.status(500).send({ message: "Failed to update payment status" });
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
