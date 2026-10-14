const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGO_URI);

let usersCollection;
let projectCollection;
let projectMembershipCollection;

async function startServer() {
    try {
        await client.connect();

        const database = client.db("pa2");

        usersCollection = database.collection("users");
        projectCollection = database.collection("Projects");
        projectMembershipCollection = database.collection("ProjectMemberships");

        console.log("Connected to MongoDB");

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("MongoDB connection failed:", error);
        process.exit(1);
    }
}

app.get("/", (req, res) => {
    res.send("THIS IS MY PA2 SERVER");
});

// Get all registered users for project lead and member selection
app.get("/users", async (req, res) => {
    try {
        const users = await usersCollection
            .find(
                {},
                { projection: { password: 0 } }
            )
            .sort({ username: 1 })
            .toArray();

        res.status(200).json(users);
    } catch (error) {
        console.error("Failed to retrieve users:", error);

        res.status(500).json({
            message: "Could not retrieve users."
        });
    }
});

const PORT = 3000;


app.post("/projects", async (req, res) => {
    let createdProjectId;

    try {
        const { name, description, status, project_lead_id } = req.body;

        // Validate required fields
        if (
            typeof name !== "string" || !name.trim() ||
            typeof description !== "string" || !description.trim() ||
            !status ||
            !project_lead_id
        ) {
            return res.status(400).json({
                message: "All project fields are required."
            });
        }

        // Validate project status
        const allowedStatuses = ["Planning", "Active", "Completed"];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid project status."
            });
        }

        // Validate the Project Lead's MongoDB ID
        if (
            typeof project_lead_id !== "string" ||
            !/^[0-9a-fA-F]{24}$/.test(project_lead_id)
        ) {
            return res.status(400).json({
                message: "Invalid Project Lead ID."
            });
        }

        const leadId = new ObjectId(project_lead_id);

        // Verify that the Project Lead exists
        const lead = await usersCollection.findOne({
            _id: leadId
        });

        if (!lead) {
            return res.status(404).json({
                message: "Selected Project Lead does not exist."
            });
        }

        // Create the project document
        const newProject = {
            name: name.trim(),
            description: description.trim(),
            status: status,
            project_lead_id: lead._id
        };

        const result = await projectCollection.insertOne(newProject);
        createdProjectId = result.insertedId;

        // Automatically make the Project Lead a member
        await projectMembershipCollection.insertOne({
            project_id: createdProjectId,
            user_id: lead._id
        });

        res.status(201).json({
            message: "Project created successfully!",
            project: {
                _id: createdProjectId,
                ...newProject
            }
        });
    } catch (error) {
        console.error("Failed to create project:", error);

        // Avoid leaving a project behind if membership creation fails
        if (createdProjectId) {
            try {
                await projectMembershipCollection.deleteMany({
                    project_id: createdProjectId
                });

                await projectCollection.deleteOne({
                    _id: createdProjectId
                });
            } catch (cleanupError) {
                console.error("Project cleanup failed:", cleanupError);
            }
        }

        res.status(500).json({
            message: "Could not create project."
        });
    }
});


app.get("/projects", async (req, res) => {
    try {
        // Retrieve all projects
        const projects = await projectCollection.find({}).toArray();

        // Look up each project's lead
        const projectsWithLeads = await Promise.all(
            projects.map(async (project) => {
                const lead = await usersCollection.findOne(
                    { _id: project.project_lead_id },
                    {
                        projection: {
                            password: 0
                        }
                    }
                );

                return {
                    ...project,
                    project_lead: lead
                        ? {
                              _id: lead._id,
                              f_name: lead.f_name,
                              l_name: lead.l_name,
                              username: lead.username
                          }
                        : null
                };
            })
        );

        res.status(200).json(projectsWithLeads);
    } catch (error) {
        console.error("Failed to retrieve projects:", error);

        res.status(500).json({
            message: "Could not retrieve projects."
        });
    }
});


// View the members of a project
app.get("/projects/:projectId/members", async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!/^[0-9a-fA-F]{24}$/.test(projectId)) {
            return res.status(400).json({
                message: "Invalid project ID."
            });
        }

        const project = await projectCollection.findOne({
            _id: new ObjectId(projectId)
        });

        if (!project) {
            return res.status(404).json({
                message: "Project does not exist."
            });
        }

        const memberships = await projectMembershipCollection
            .find({ project_id: project._id })
            .toArray();

        const userIds = memberships.map((membership) => membership.user_id);

        const users = await usersCollection
            .find(
                { _id: { $in: userIds } },
                { projection: { password: 0 } }
            )
            .toArray();

        const members = users.map((user) => ({
            _id: user._id,
            f_name: user.f_name,
            l_name: user.l_name,
            username: user.username,
            isProjectLead: user._id.equals(project.project_lead_id)
        }));

        res.status(200).json(members);
    } catch (error) {
        console.error("Failed to retrieve project members:", error);

        res.status(500).json({
            message: "Could not retrieve project members."
        });
    }
});


// Add a registered user to a project
app.post("/projects/:projectId/members", async (req, res) => {
    try {
        const { projectId } = req.params;
        const { user_id } = req.body;

        if (
            !/^[0-9a-fA-F]{24}$/.test(projectId) ||
            typeof user_id !== "string" ||
            !/^[0-9a-fA-F]{24}$/.test(user_id)
        ) {
            return res.status(400).json({
                message: "Invalid project ID or user ID."
            });
        }

        const project = await projectCollection.findOne({
            _id: new ObjectId(projectId)
        });

        if (!project) {
            return res.status(404).json({
                message: "Project does not exist."
            });
        }

        const user = await usersCollection.findOne({
            _id: new ObjectId(user_id)
        });

        if (!user) {
            return res.status(404).json({
                message: "User does not exist."
            });
        }

        const existingMembership = await projectMembershipCollection.findOne({
            project_id: project._id,
            user_id: user._id
        });

        if (existingMembership) {
            return res.status(409).json({
                message: "This user is already a project member."
            });
        }

        await projectMembershipCollection.insertOne({
            project_id: project._id,
            user_id: user._id
        });

        res.status(201).json({
            message: "Member added successfully."
        });
    } catch (error) {
        console.error("Failed to add project member:", error);

        res.status(500).json({
            message: "Could not add project member."
        });
    }
});


// Remove a non-lead member from a project
app.delete(
    "/projects/:projectId/members/:userId",
    async (req, res) => {
        try {
            const { projectId, userId } = req.params;

            if (
                !/^[0-9a-fA-F]{24}$/.test(projectId) ||
                !/^[0-9a-fA-F]{24}$/.test(userId)
            ) {
                return res.status(400).json({
                    message: "Invalid project ID or user ID."
                });
            }

            const project = await projectCollection.findOne({
                _id: new ObjectId(projectId)
            });

            if (!project) {
                return res.status(404).json({
                    message: "Project does not exist."
                });
            }

            const memberId = new ObjectId(userId);

            if (memberId.equals(project.project_lead_id)) {
                return res.status(400).json({
                    message: "The Project Lead cannot be removed."
                });
            }

            const user = await usersCollection.findOne({
                _id: memberId
            });

            if (!user) {
                return res.status(404).json({
                    message: "User does not exist."
                });
            }

            const result = await projectMembershipCollection.deleteOne({
                project_id: project._id,
                user_id: memberId
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    message: "This user is not a member of the project."
                });
            }

            res.status(200).json({
                message: "Member removed successfully."
            });
        } catch (error) {
            console.error("Failed to remove project member:", error);

            res.status(500).json({
                message: "Could not remove project member."
            });
        }
    }
);


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

startServer();
