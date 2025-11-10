"use client";

import { useState } from "react";

export default function CreateUserPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch("http://localhost:4000/create-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await res.json();

    if (result.error) {
      setMsg("Error: " + result.error.message);
    } else {
      setMsg("User created successfully.");
      setEmail("");
      setPassword("");
    }
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Create New User</h1>

      <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: 12, width: 300 }}>
        <input
          type="email"
          placeholder="user email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="user password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Create User</button>
      </form>

      <p>{msg}</p>
    </main>
  );
}