import type { FormEvent } from "react";
import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import "./Login.css";

type LoginResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await api.post<LoginResponse>("/auth/login", { email, password });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      navigate("/");
    } catch (error: unknown) {
      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Não foi possível fazer login.",
        );
      } else {
        setErrorMessage("Erro ao conectar com o servidor.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-root login-root--centered">

      <section className="login-form-side">
        <div className="login-form-header">
          <p className="login-form-eyebrow">Bem-vindo de volta</p>
          <h2 className="login-form-title">Acesse sua conta</h2>
          <p className="login-form-subtitle">
            Entre com seu e-mail e senha para continuar.
          </p>
        </div>

        <form
          id="login-form"
          className="login-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="login-field">
            <label htmlFor="login-email" className="login-field-label">
              E-mail
            </label>
            <input
              id="login-email"
              className="login-field-input"
              type="email"
              name="email"
              placeholder="seu@email.com"
              value={email}
              required
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password" className="login-field-label">
              Senha
            </label>
            <input
              id="login-password"
              className="login-field-input"
              type="password"
              name="password"
              placeholder="••••••••"
              value={password}
              required
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {errorMessage && (
            <div className="login-error" role="alert">
              <span className="login-error-icon">⚠</span>
              {errorMessage}
            </div>
          )}

          <button
            id="login-submit"
            type="submit"
            className="login-btn"
            disabled={isSubmitting}
          >
            <span className="login-btn-content">
              {isSubmitting ? (
                <>
                  <span className="login-spinner" aria-hidden="true" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </span>
          </button>
        </form>

        <p className="login-footer">
          Não tem uma conta?
          <Link to="/register">Cadastre-se</Link>
        </p>
      </section>
    </main>
  );
};

export default Login;
