import type { FormEvent } from "react";
import { useState, useMemo } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import "./Register.css";

type RegisterResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

function getPasswordStrength(password: string) {
  if (!password) return { level: 0, label: "" };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 1, label: "Fraca" };
  if (score <= 2) return { level: 2, label: "Razoável" };
  if (score <= 3) return { level: 3, label: "Boa" };
  return { level: 4, label: "Forte" };
}

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordStrength = useMemo(
    () => getPasswordStrength(password),
    [password],
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage("Por favor, informe seu nome.");
      return;
    }
    if (!email.trim()) {
      setErrorMessage("Por favor, informe seu e-mail.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post<RegisterResponse>("/auth/register", {
        name: name.trim(),
        email: email.trim(),
        password,
      });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      navigate("/");
    } catch (error: unknown) {
      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Não foi possível criar a conta.",
        );
      } else {
        setErrorMessage("Erro ao conectar com o servidor.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const strengthBarClass = (index: number) => {
    if (index >= passwordStrength.level) return "register-strength-bar";
    if (passwordStrength.level <= 1)
      return "register-strength-bar register-strength-bar--weak";
    if (passwordStrength.level <= 2)
      return "register-strength-bar register-strength-bar--warn";
    return "register-strength-bar register-strength-bar--active";
  };

  return (
    <main className="register-root register-root--centered">
      {/* ── Form panel ── */}
      <section className="register-form-side">
        <div className="register-form-header">
          <p className="register-form-eyebrow">Criar conta</p>
          <h2 className="register-form-title">Cadastre-se gratuitamente</h2>
          <p className="register-form-subtitle">
            Preencha os campos abaixo para começar a organizar seu semestre.
          </p>
        </div>

        <form
          id="register-form"
          className="register-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="register-field">
            <label htmlFor="register-name" className="register-field-label">
              Nome completo
            </label>
            <input
              id="register-name"
              className="register-field-input"
              type="text"
              name="name"
              placeholder="Seu nome"
              value={name}
              required
              autoComplete="name"
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="register-field">
            <label htmlFor="register-email" className="register-field-label">
              E-mail
            </label>
            <input
              id="register-email"
              className="register-field-input"
              type="email"
              name="email"
              placeholder="seu@email.com"
              value={email}
              required
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="register-field">
            <label htmlFor="register-password" className="register-field-label">
              Senha
            </label>
            <input
              id="register-password"
              className="register-field-input"
              type="password"
              name="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              required
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
            />
            {password.length > 0 && (
              <>
                <div className="register-password-strength">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={strengthBarClass(i)} />
                  ))}
                </div>
                <span className="register-strength-text">
                  Força: {passwordStrength.label}
                </span>
              </>
            )}
          </div>

          {errorMessage && (
            <div className="register-error" role="alert">
              <span className="register-error-icon">⚠</span>
              {errorMessage}
            </div>
          )}

          <button
            id="register-submit"
            type="submit"
            className="register-btn"
            disabled={isSubmitting}
          >
            <span className="register-btn-content">
              {isSubmitting ? (
                <>
                  <span className="register-spinner" aria-hidden="true" />
                  Criando conta...
                </>
              ) : (
                "Criar minha conta"
              )}
            </span>
          </button>
        </form>

        <p className="register-footer">
          Já tem uma conta?
          <Link to="/login">Fazer login</Link>
        </p>
      </section>
    </main>
  );
};

export default Register;
