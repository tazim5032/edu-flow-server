const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();

const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',

  ],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions));
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.o4eqbyc.mongodb.net/?retryWrites=true&w=majority`


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    const assignmentCollection = client.db('assignmentDB').collection('assignment');

    //send data from createAssignment to db
    app.post('/assignment', async (req, res) => {
      console.log(req.body);
      const result = await assignmentCollection.insertOne(req.body);
      console.log(result);
      res.send(result);
    })

    //find all assignment fromm db
    app.get('/assignment', async (req, res) => {
      const result = await assignmentCollection.find({}).toArray();
      res.send(result);
    })

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello from edu-flow Server....')
})

app.listen(port, () => console.log(`Server running on port ${port}`))
