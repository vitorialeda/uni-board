import axios, { AxiosError } from "axios";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
        }

        const response = await axios.get("http://localhost:3000/dashboard", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setUser(response.data);
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError<{ message: string }>;
          alert(axiosError.response?.data?.message ?? "Erro inesperado");
        } else {
          alert("Erro ao conectar com o servidor");
        }
      }
    };

    fetchDashboard();
  }, [navigate]);

  if (!user) {
    return <div>Carregando...</div>;
  }

  return (
    <>
      <h1>dashboard</h1>
      <p>
        <strong>ID:</strong> {user.id}
      </p>
      <p>
        <strong>Nome:</strong> {user.name}
      </p>
      <p>
        <strong>Email:</strong> {user.email}
      </p>
      <p>
        <strong>Role:</strong> {user.role}
      </p>
    </>
  );
};

export default Dashboard;
