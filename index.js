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
    'https://edu-flow.web.app',
    'https://edu-flow.firebaseapp.com',

  ],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());


//verify jwt middleware
const verifyToken = (req, res, next) => {

  const token = req.cookies?.token;

  if (!token) return res.status(401).send({ message: 'unauthorized access' });

  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        res.status(401).send({ message: 'unauthorized access' });
      }
      console.log(decoded);

      req.user = decoded; //req er modhe key decoded kore nie nilam
      next();
    })
  }
}

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
      const email = req.body;
      //token banaiteci
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
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

    //find all assignment fromm db for feature section
    app.get('/all-assignment-feature', async (req, res) => {
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

    //find details submission of specific assignment
    app.get('/details-submission/:id', async (req, res) => {
      const result = await submissionCollection.findOne({ _id: new ObjectId(req.params.id) });
      res.send(result);
    })

    // save submitted assignment 
    app.post('/submission', async (req, res) => {
      const submission = req.body;
      const result = await submissionCollection.insertOne(submission);
      res.send(result);
    })

    // get all submission for a specific user
    app.get('/submission/:email', verifyToken, async (req, res) => {

      const tokenEmail = req.user.email;
      const email = req.params.email;

      if (tokenEmail !== email) {
        return res.status(403).send({ message: 'forbidden access' });
      }

      const query = { 'student_email': email }
      const result = await submissionCollection.find(query).toArray();
      res.send(result);
    })

    //get all pending assingment for judging
    app.get('/status/:email/:status', verifyToken, async (req, res) => {

      const tokenEmail = req.user.email;
      const email = req.params.email;


      if (tokenEmail !== email) {
        return res.status(403).send({ message: 'forbidden access' });
      }

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



    // Get all assignments data from db for pagination
    app.get('/all-assignment', async (req, res) => {
      const size = parseInt(req.query.size)
      const page = parseInt(req.query.page) - 1
      const filter = req.query.filter
      const sort = req.query.sort
      const search = req.query.search
      //  console.log(size, page)

      let query = {
        title: { $regex: search, $options: 'i' },
      }
      if (filter) query.difficulty = filter
      let options = {}
      if (sort) options = { sort: { deadline: sort === 'asc' ? 1 : -1 } }
      const result = await assignmentCollection
        .find(query, options)
        .skip(page * size)
        .limit(size)
        .toArray()

      res.send(result)
    })

    // Get all assignments data count from db
    app.get('/assignment-count', async (req, res) => {
      const filter = req.query.filter
      const search = req.query.search
      let query = {
        title: { $regex: search, $options: 'i' },
      }
      if (filter) query.difficulty = filter
      const count = await assignmentCollection.countDocuments(query)

      res.send({ count })
    })

    //New endpoint to get the percentage of assignments a user has completed
    app.get('/assignment-completion/:email', verifyToken, async (req, res) => {
      const tokenEmail = req.user.email;
      const email = req.params.email;
      if (tokenEmail !== email) {
        return res.status(403).send({ message: 'forbidden access' });
      }

      // Get the total number of assignments
      const totalAssignments = await assignmentCollection.countDocuments();

      // Get the number of assignments submitted by the user
      const userSubmissions = await submissionCollection.countDocuments({ 'student_email': email });

      // Calculate the percentage
      const percentage = totalAssignments > 0 ? (userSubmissions / totalAssignments) * 100 : 0;

      res.send({ percentage: percentage.toFixed(2) });
    });

  
  
    

    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello from edu-flow Server....')
})

app.listen(port, () => console.log(`Server running on port ${port}`))
