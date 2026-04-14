import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Button } from "../components/Button";
import { Input } from "../components/Input";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login({ email, password });
      const to = location.state?.from?.pathname || "/";
      navigate(to, { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-surface grid place-items-center p-6">
      <div className="glass-card rounded-xl p-8 w-full max-w-md">
        <h1 className="font-headline font-black text-2xl tracking-tight uppercase">Login</h1>
        <p className="mt-2 text-sm text-on-surface-variant">Authenticate to access your command center.</p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? <div className="text-sm text-error">{error}</div> : null}
          <Button className="w-full neon-glow-primary" disabled={isLoading} type="submit">
            {isLoading ? "Connecting…" : "Connect"}
          </Button>
        </form>

        <div className="mt-6 text-xs text-on-surface-variant">
          No account?{" "}
          <Link to="/signup" className="text-primary hover:underline">
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
