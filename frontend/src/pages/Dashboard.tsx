import { useEffect, useState } from "react";
import apiClient from "../lib/api";

interface DashboardData {
  user: {
    name: string;
    email: string;
    phone: string;
  };
  emergencyContacts: Array<{ _id: string; name: string; phone: string; relation: string; priority: string }>;
  sosHistory: Array<{ _id: string; status: string; triggeredAt: string }>;
}

export default function Dashboard({ token }: { token: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await apiClient.get("/users/dashboard");
        setData(response.data);
      } catch (err) {
        setError("Unable to load dashboard");
      }
    };

    fetchDashboard();
  }, [token]);

  if (error) return <main className="app-shell"><p>{error}</p></main>;
  if (!data) return <main className="app-shell"><p>Loading dashboard…</p></main>;

  return (
    <main className="app-shell">
      <h1>Welcome back, {data.user.name}</h1>
      <section>
        <h2>Emergency contacts</h2>
        <ul>
          {data.emergencyContacts.map((contact) => (
            <li key={contact._id}>{contact.name} — {contact.phone}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Recent SOS history</h2>
        <ul>
          {data.sosHistory.map((item) => (
            <li key={item._id}>{item.status} — {new Date(item.triggeredAt).toLocaleString()}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
