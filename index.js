const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')
const { Schema } = mongoose

mongoose.connect(process.env.MONGO_URL)

const UserSchema = new Schema({
  username: String,
});

const User = mongoose.model('User', UserSchema);

const ExerciseSchema = new Schema({
  user_id: {type: String, required: true},
  description: String,
  duration: Number,
  date: Date
});

const Exercise = mongoose.model('Exercise', ExerciseSchema);

app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({extended: true}))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  const newUser = new User({ username });
  try {
    const savedUser = await newUser.save();
    res.status(200).json({ username: savedUser.username, _id: savedUser._id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save user' });
  }
});

app.post('/api/users/:id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;
  const userId = req.params.id;
  try {
    const user = await User.findById(userId);
    if(!user){
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const newExercise = new Exercise({
      user_id: userId,
      description,
      duration,
      date: date ? new Date(date) : new Date()
    });
    const exercise = await newExercise.save();
    res.status(200).json({
      _id: user._id,
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    });;
  } catch(err){
    res.status(500).json({ error: 'Server error' });
  }
})

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const userId = req.params._id;
  const user = await User.findById(userId);
  if(!user){
    res.status(404).json({ error: 'User not found' });
  }
  let dateObj = {};
  if(from) {
    dateObj["$gte"] = new Date(from);
  }
  if(to) {
    dateObj["$lte"] = new Date(to);
  }
  let filter = {
    user_id: userId
  }
  if(from || to){
    filter.date = dateObj;
  }

  const exercises = await(Exercise.find(filter).limit(+limit ?? 500));

  const log = exercises.map(exercise => ({
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date.toDateString()
  }));
  res.status(200).json({
    username: user.username,
    count: exercises.length,
    _id: user._id,
    log
  })
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
