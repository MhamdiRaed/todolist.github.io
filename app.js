const express = require("express");
const bodyParser = require("body-parser");
const date = require(__dirname + "/date.js");
const mongoose = require('mongoose'); 
const session = require('express-session');

const app = express();

// Use body-parser to retrieve data from the page (enables req.body.list)
app.use(bodyParser.urlencoded({ extended: true }));

// Link CSS files to EJS
app.use(express.static("public"));

// Set up express-session
app.use(session({
    secret: 'your_secret_key', // Use a strong secret key here
    resave: false,
    saveUninitialized: true,
}));

// Connect to the MongoDB database
mongoose.connect("mongodb://localhost:27017/todolistDB");

// Create a new schema for items
const itemsSchema = new mongoose.Schema({
    name: String,
    userId: { type: mongoose.Schema.Types.ObjectId, required: true } // Associate items with users
});

// Create a new model for items
const Item = mongoose.model('Item', itemsSchema);

// Create a new schema for users
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },  // Username is now required
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model("User", userSchema);

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Serve the landing page
app.get("/", function(req, res) {
    res.render("landing");
});

// Handle user registration
app.get("/register", function(req, res) {
    res.render("register");
});

app.post("/register", async function(req, res) {
    const { username, email, password } = req.body;

    const user = new User({
        username: username,
        email: email,
        password: password
    });

    try {
        await user.save();
        res.redirect("/landing");
    } catch (err) {
        console.log(err);
        res.render("register", { error: "An error occurred during registration." });
    }
});

app.get("/landing", function(req, res) {
    res.render("landing");
});

// Handle user login
app.post("/login", async function(req, res) {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email });

    if (user && user.password === password) {
        req.session.userId = user._id;  // Store user ID in session
        res.redirect("/todo");
    } else {
        res.render("landing", { error: "Invalid email or password." });
    }
});

// Handle GET requests to the todo list route
app.get("/todo", async function(req, res) {
    if (!req.session.userId) {
        return res.redirect("/landing"); // Redirect to landing if not logged in
    }

    const day = date();
    try {
        const foundItems = await Item.find({ userId: req.session.userId });

        // If no items exist, insert default items
        if (foundItems.length === 0) {
            const defaultItems = [
                { name: 'Welcome to your ToDoList!', userId: req.session.userId },
                { name: 'Hit the + button to add a new task.', userId: req.session.userId },
                { name: '<-- Hit this to delete an item.', userId: req.session.userId }
            ];

            await Item.insertMany(defaultItems);
            res.redirect("/todo"); // Redirect to display the new items
        } else {
            res.render('list', { title: day, newItems: foundItems });
        }
    } catch (err) {
        console.log(err);
    }
});

// Handle POST requests from the form to add a new item
app.post("/todo", async function(req, res) {
    const itemName = req.body.newItems;

    const item = new Item({ name: itemName, userId: req.session.userId }); // Associate item with user

    await item.save();
    res.redirect("/todo");
});

// Handle POST requests from the checkbox to delete an item
app.post("/delete", async function(req, res) {
    const checkedItemId = req.body.checkbox;
    try {
        await Item.findByIdAndDelete(checkedItemId);
        res.redirect("/todo");
    } catch (err) {
        console.log(err);
    }
});

// Listen on port 3000
app.listen(3000, function() {
    console.log("Server is running on port 3000.");
});
