import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Button } from "../components/Button";
import { Input } from "../components/Input";

export function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await signup({ username, email, password });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-surface grid place-items-center p-6">
      <div className="glass-card rounded-xl p-8 w-full max-w-md">
        <h1 className="font-headline font-black text-2xl tracking-tight uppercase">Signup</h1>
        <p className="mt-2 text-sm text-on-surface-variant">Provision a new commander profile.</p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? <div className="text-sm text-error">{error}</div> : null}
          <Button className="w-full neon-glow-primary" disabled={isLoading} type="submit">
            {isLoading ? "Creating…" : "Create Account"}
          </Button>
        </form>

        <div className="mt-6 text-xs text-on-surface-variant">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
