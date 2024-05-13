const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
app.use(cookieParser());

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
    const submissionCollection = client.db('assignmentDB').collection('submission');

    //jwt generate - json web token
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      //token banaiteci
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d'
      })
      //browser er cookie te send korteci
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',

      }).send({ success: true })
      // res.send({ token })
    })

    //clear token on logout
    app.get('/logout', (req, res) => {
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        maxAge: 0,
      }).send({ success: true })
    })

    //send data from createAssignment to db
    app.post('/add-assignment', async (req, res) => {
      console.log(req.body);
      const result = await assignmentCollection.insertOne(req.body);

      res.send(result);
    })

    //find all assignment fromm db
    app.get('/all-assignment', async (req, res) => {
      const result = await assignmentCollection.find({}).toArray();

      res.send(result);
    })

    //delete a card from db
    app.delete('/delete/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await assignmentCollection.deleteOne(query);
      console.log(result);
      res.send(result);
    })

    //update assignment
    app.get('/update/:id', async (req, res) => {
      const result = await assignmentCollection.findOne({ _id: new ObjectId(req.params.id) });
      res.send(result);
    })

    //client side e update confirm korar por
    app.put('/update/:id', async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) }
      const updatedData = req.body;
      const options = { upsert: true }
      const data = {
        $set: {
          title: updatedData.title,
          difficulty: updatedData.difficulty,
          description: updatedData.description,
          marks: updatedData.marks,
          deadline: updatedData.deadline,
          photo: updatedData.photo
        },
      };

      const result = await assignmentCollection.updateOne(query, data, options);
      res.send(result);
    })

    //find details of specific assignment
    app.get('/details/:id', async (req, res) => {
      const result = await assignmentCollection.findOne({ _id: new ObjectId(req.params.id) });
      res.send(result);
    })

    // save submitted assignment 
    app.post('/submission', async (req, res) => {
      const submission = req.body;
      const result = await submissionCollection.insertOne(submission);
      res.send(result);
    })

    // get all submission for a specific user
    app.get('/submission/:email', async (req, res) => {
      const email = req.params.email;
      const query = { 'student_email': email }
      const result = await submissionCollection.find(query).toArray();
      res.send(result);
    })

    //get all pending assingment for judging
    app.get('/status/:email/:status', async (req, res) => {
      const email = req.params.email;
      const status = req.params.status;
      const query = { email: email, status: status }
      const result = await submissionCollection.find(query).toArray();
      res.send(result);
    })

    //find details of specific submitted assignment to give marks
    app.get('/submitted/:id', async (req, res) => {
      const result = await submissionCollection.findOne({ _id: new ObjectId(req.params.id) });
      res.send(result);
    })

    //marks give and update status
    app.put('/status-update/:id', async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) }
      const updatedData = req.body;
      const options = { upsert: true }
      const data = {
        $set: {
          status: updatedData.status,
          obtained_marks: updatedData.obtained_marks,
          feedback: updatedData.feedback,
        },
      };

      const result = await submissionCollection.updateOne(query, data, options);
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
