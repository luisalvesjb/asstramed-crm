import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AppButton, AppInput } from "../ui/components";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("Nao foi possivel autenticar. Verifique API e credenciais.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Asstramed CRM</h1>
        <p>Acesso ao sistema</p>
        <form onSubmit={handleSubmit}>
          <AppInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            autoComplete="username"
          />
          <AppInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            autoComplete="current-password"
          />
          {error && <span className="error-text">{error}</span>}
          <AppButton type="primary" htmlType="submit" loading={loading} block>
            {loading ? "Entrando..." : "Entrar"}
          </AppButton>
        </form>
      </div>
    </div>
  );
}
