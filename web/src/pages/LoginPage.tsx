import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AppButton, AppInput } from "../ui/components";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(loginValue, password);
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
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="field-block">
            <label className="field-label">Login</label>
            <AppInput
              value={loginValue}
              onChange={(e) => setLoginValue(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="field-block">
            <label className="field-label">Senha</label>
            <AppInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && <span className="error-text">{error}</span>}
          <AppButton type="primary" htmlType="submit" loading={loading} block>
            {loading ? "Entrando..." : "Entrar"}
          </AppButton>
        </form>
      </div>
    </div>
  );
}
