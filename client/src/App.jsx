import { useState } from "react";
import "./App.css";

function App() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");

  async function handleSignup(e) {
    e.preventDefault();

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
    setMessage(data.message);
  }

  async function handleLogin(e) {
    e.preventDefault();

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
    setLoginMessage(data.message);
  }

  return (
    <div className="app-container">
      <h1 className="title">⋆⊱༻༺⊰⋆ Welcome ⋆⊱༻༺⊰⋆</h1>

      <div className="forms-container">

        <div className="card">
          <h2>Sign Up</h2>

          <form onSubmit={handleSignup}>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />

            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />

            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            />

            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />

            <button type="submit">Login</button>
          </form>

          <p className="message">{loginMessage}</p>
        </div>

      </div>
    </div>
  );
}

export default App;