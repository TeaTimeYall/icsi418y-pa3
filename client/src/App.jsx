
import { useEffect, useState } from "react";
import "./App.css";

function App() {
  // PA2: Signup state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  // PA2: Login state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");

  // PA3: Project state
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectStatus, setProjectStatus] = useState("Planning");
  const [projectLeadId, setProjectLeadId] = useState("");
  const [projectMessage, setProjectMessage] = useState("");

  // PA3: Membership state
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [members, setMembers] = useState([]);
  const [memberUserId, setMemberUserId] = useState("");
  const [membershipMessage, setMembershipMessage] = useState("");

  // Load registered users and projects when the page opens
  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      try {
        const [usersResponse, projectsResponse] = await Promise.all([
          fetch("http://127.0.0.1:3000/users"),
          fetch("http://127.0.0.1:3000/projects")
        ]);

        if (!usersResponse.ok || !projectsResponse.ok) {
          throw new Error("Could not load users or projects.");
        }

        const [usersData, projectsData] = await Promise.all([
          usersResponse.json(),
          projectsResponse.json()
        ]);

        if (active) {
          setUsers(usersData);
          setProjects(projectsData);
          setSelectedProjectId(projectsData[0]?._id || "");
        }
      } catch (error) {
        console.error("Failed to load project data:", error);

        if (active) {
          setProjectMessage(
            "Could not load users or projects. Check that the backend is running."
          );
        }
      }
    }

    loadInitialData();

    return () => {
      active = false;
    };
  }, []);

  // Load members whenever the selected project changes.
  // This is a separate, top-level hook.
  useEffect(() => {
    if (!selectedProjectId) {
      setMembers([]);
      return;
    }

    let active = true;

    async function loadMembers() {
      try {
        const response = await fetch(
          `http://127.0.0.1:3000/projects/${selectedProjectId}/members`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load members.");
        }

        if (active) {
          setMembers(data);
          setMembershipMessage("");
        }
      } catch (error) {
        console.error("Failed to load members:", error);

        if (active) {
          setMembers([]);
          setMembershipMessage("Could not load project members.");
        }
      }
    }

    loadMembers();

    return () => {
      active = false;
    };
  }, [selectedProjectId]);

  // PA2: Signup
  async function handleSignup(e) {
    e.preventDefault();

    try {
      const response = await fetch("http://127.0.0.1:3000/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          f_name: firstName,
          l_name: lastName,
          username: username,
          password: password
        })
      });

      const data = await response.json();
      setMessage(data.message || "Signup completed.");

      if (response.ok) {
        setFirstName("");
        setLastName("");
        setUsername("");
        setPassword("");

        // Refresh registered users for the project dropdowns.
        const usersResponse = await fetch("http://127.0.0.1:3000/users");

        if (usersResponse.ok) {
          setUsers(await usersResponse.json());
        }
      }
    } catch (error) {
      console.error("Signup failed:", error);
      setMessage("Could not connect to the server.");
    }
  }

  // PA2: Login
  async function handleLogin(e) {
    e.preventDefault();

    try {
      const response = await fetch("http://127.0.0.1:3000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword
        })
      });

      const data = await response.json();
      setLoginMessage(data.message || "Login completed.");
    } catch (error) {
      console.error("Login failed:", error);
      setLoginMessage("Could not connect to the server.");
    }
  }

  // Refresh the project list
  async function refreshProjects() {
    try {
      const response = await fetch("http://127.0.0.1:3000/projects");

      if (!response.ok) {
        throw new Error("Could not retrieve projects.");
      }

      const data = await response.json();
      setProjects(data);

      // Select the first project if none is currently selected.
      if (!selectedProjectId && data.length > 0) {
        setSelectedProjectId(data[0]._id);
      }

      setProjectMessage("");
    } catch (error) {
      console.error("Failed to retrieve projects:", error);
      setProjectMessage("Could not refresh the project list.");
    }
  }

  // PA3: Create a project
  async function handleCreateProject(e) {
    e.preventDefault();
    setProjectMessage("");

    try {
      const response = await fetch("http://127.0.0.1:3000/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: projectName,
          description: projectDescription,
          status: projectStatus,
          project_lead_id: projectLeadId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setProjectMessage(data.message || "Could not create project.");
        return;
      }

      setProjectMessage(data.message || "Project created successfully!");
      setProjectName("");
      setProjectDescription("");
      setProjectStatus("Planning");
      setProjectLeadId("");

      // The backend automatically adds the Project Lead as a member.
      await refreshProjects();

      // Select the new project in the membership panel.
      if (data.project?._id) {
        setSelectedProjectId(data.project._id);
      }
    } catch (error) {
      console.error("Project creation failed:", error);
      setProjectMessage("Could not connect to the server.");
    }
  }

  // Refresh the membership list for a project
  async function refreshMembers(projectId = selectedProjectId) {
    if (!projectId) {
      setMembers([]);
      return;
    }

    const response = await fetch(
      `http://127.0.0.1:3000/projects/${projectId}/members`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not refresh members.");
    }

    // Avoid displaying the refreshed list for a project that is no longer selected.
    if (projectId === selectedProjectId) {
      setMembers(data);
    }
  }

  // PA3: Add a member
  async function handleAddMember(e) {
    e.preventDefault();
    setMembershipMessage("");

    if (!selectedProjectId || !memberUserId) {
      setMembershipMessage("Select a project and a registered user.");
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:3000/projects/${selectedProjectId}/members`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            user_id: memberUserId
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMembershipMessage(data.message || "Could not add member.");
        return;
      }

      setMembershipMessage(data.message || "Member added successfully.");
      setMemberUserId("");

      await refreshMembers(selectedProjectId);
    } catch (error) {
      console.error("Failed to add member:", error);
      setMembershipMessage("Could not connect to the server.");
    }
  }

  // PA3: Remove a non-lead member
  async function handleRemoveMember(userId) {
    setMembershipMessage("");

    try {
      const response = await fetch(
        `http://127.0.0.1:3000/projects/${selectedProjectId}/members/${userId}`,
        {
          method: "DELETE"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMembershipMessage(data.message || "Could not remove member.");
        return;
      }

      setMembershipMessage(data.message || "Member removed successfully.");

      await refreshMembers(selectedProjectId);
    } catch (error) {
      console.error("Failed to remove member:", error);
      setMembershipMessage("Could not connect to the server.");
    }
  }

  return (
    <div className="app-container">
      <h1 className="title">⋆⊱༻༺⊰⋆ Welcome ⋆⊱༺༺⊰⋆</h1>

      {/* Existing PA2 signup and login interfaces */}
      <div className="forms-container">
        <div className="card">
          <h2>Sign Up</h2>

          <form onSubmit={handleSignup}>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />

            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />

            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button type="submit">Create Account</button>
          </form>

          <p className="message">{message}</p>
        </div>

        <div className="card">
          <h2>Login</h2>

          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Username"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
            />

            <button type="submit">Login</button>
          </form>

          <p className="message">{loginMessage}</p>
        </div>
      </div>

      {/* PA3: Project creation and project listing */}
      <h2>Project Management</h2>

      <div className="forms-container">
        <div className="card">
          <h2>Create Project</h2>

          <form onSubmit={handleCreateProject}>
            <input
              type="text"
              placeholder="Project Name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
            />

            <textarea
              placeholder="Project Description"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              required
            />

            <label htmlFor="project-status">Status</label>
            <select
              id="project-status"
              value={projectStatus}
              onChange={(e) => setProjectStatus(e.target.value)}
              required
            >
              <option value="Planning">Planning</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
            </select>

            <label htmlFor="project-lead">Project Lead</label>
            <select
              id="project-lead"
              value={projectLeadId}
              onChange={(e) => setProjectLeadId(e.target.value)}
              required
            >
              <option value="">Select a registered user</option>

              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.f_name} {user.l_name} (@{user.username})
                </option>
              ))}
            </select>

            <button type="submit" disabled={users.length === 0}>
              Create Project
            </button>
          </form>

          <p className="message">{projectMessage}</p>
        </div>

        <div className="card">
          <h2>View Projects</h2>

          <button type="button" onClick={refreshProjects}>
            Refresh Projects
          </button>

          {projects.length === 0 ? (
            <p>No projects found yet.</p>
          ) : (
            <div className="project-list">
              {projects.map((project) => (
                <div className="project-item" key={project._id}>
                  <h3>{project.name}</h3>
                  <p>{project.description}</p>
                  <p>
                    <strong>Status:</strong> {project.status}
                  </p>
                  <p>
                    <strong>Project Lead:</strong>{" "}
                    {project.project_lead
                      ? `${project.project_lead.f_name} ${project.project_lead.l_name} (@${project.project_lead.username})`
                      : "Unknown"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PA3: Manage project memberships */}
      <h2>Manage Project Memberships</h2>

      <div className="forms-container">
        <div className="card">
          <h2>Select Project</h2>

          <select
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
              setMembershipMessage("");
              setMemberUserId("");
            }}
            required
          >
            <option value="">Select a project</option>

            {projects.map((project) => (
              <option key={project._id} value={project._id}>
                {project.name}
              </option>
            ))}
          </select>

          <h3>Current Members</h3>

          {!selectedProjectId ? (
            <p>Select a project to view its members.</p>
          ) : members.length === 0 ? (
            <p>No members found for this project.</p>
          ) : (
            <div className="project-list">
              {members.map((member) => (
                <div className="project-item" key={member._id}>
                  <p>
                    <strong>
                      {member.f_name} {member.l_name}
                    </strong>
                  </p>

                  <p>@{member.username}</p>

                  {member.isProjectLead ? (
                    <p>
                      <strong>Project Lead</strong>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member._id)}
                    >
                      Remove Member
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2>Add Member</h2>

          <form onSubmit={handleAddMember}>
            <label htmlFor="member-user">Registered User</label>

            <select
              id="member-user"
              value={memberUserId}
              onChange={(e) => setMemberUserId(e.target.value)}
              required
            >
              <option value="">Select a registered user</option>

              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.f_name} {user.l_name} (@{user.username})
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={!selectedProjectId || !memberUserId}
            >
              Add Member
            </button>
          </form>

          <p className="message">{membershipMessage}</p>
        </div>
      </div>
    </div>
  );
}

export default App;
