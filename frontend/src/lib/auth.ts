import type { NavigateFunction } from "react-router-dom";

export function getToken(navigate: NavigateFunction): string | null {
  const token = localStorage.getItem("token");
  if (!token) {
    localStorage.removeItem("user");
    navigate("/login");
  }
  return token;
}

export function handle401(
  status: number | undefined,
  navigate: NavigateFunction,
): boolean {
  if (status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
    return true;
  }
  return false;
}
