const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGO_URI);

let usersCollection;

async function connectDatabase() {
    try {
        await client.connect();

        const database = client.db("pa2");
        usersCollection = database.collection("users");

        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("MongoDB connection failed:", error);
    }
}

connectDatabase();

app.get("/", (req, res) => {
    res.send("THIS IS MY PA2 SERVER");
});

const PORT = 3000;

app.post("/signup", async (req, res) => {
    try {
        const { f_name, l_name, username, password } = req.body;

        // Check that all fields were provided
        if (!f_name || !l_name || !username || !password) {
            return res.status(400).json({
                message: "All fields are required."
            });
        }

        // Check if username already exists
        const existingUser = await usersCollection.findOne({
            username: username
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Username already exists."
            });
        }

        // Create a new user object
        const newUser = {
            f_name: f_name,
            l_name: l_name,
            username: username,
            password: password
        };

        // Store user in MongoDB
        await usersCollection.insertOne(newUser);

        res.status(201).json({
            message: "User created successfully!"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error."
        });
    }
});

app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check that both fields were provided
        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required."
            });
        }

        // Look for the username in MongoDB
        const user = await usersCollection.findOne({
            username: username
        });

        // Username does not exist
        if (!user) {
            return res.status(404).json({
                message: "Username does not exist."
            });
        }

        // Password is incorrect
        if (user.password !== password) {
            return res.status(401).json({
                message: "Incorrect password."
            });
        }

        // Username and password are correct
        res.status(200).json({
            message: "Login successful!"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error."
        });
    }
});


app.post("/test", (req, res) => {
    res.json({ message: "POST test works" });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
