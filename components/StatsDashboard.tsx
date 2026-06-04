"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function StatsDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500 text-lg">Cargando estadísticas...</div>
      </div>
    );
  }

  // Datos formateados
  const citasPorDia = stats?.citasPorDia || [];
  const serviciosPopulares = stats?.serviciosPopulares || [];

  return (
    <div className="space-y-6">
      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium">Total Citas</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            {stats?.metricas?.totalCitas || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium">Citas Hoy</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {stats?.metricas?.citasHoy || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium">
            Ingresos Totales
          </h3>
          <p className="text-3xl font-bold text-green-600 mt-2">
            ${stats?.metricas?.ingresosTotales?.toLocaleString() || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium">
            Clientes Activos
          </h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {stats?.metricas?.clientesActivos || 0}
          </p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de líneas */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            📈 Citas por Día (Últimos 7 días)
          </h3>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={citasPorDia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#0088FE"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de pastel */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            🥧 Servicios Más Populares
          </h3>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={serviciosPopulares}
                  dataKey="total"
                  nameKey="servicio"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {serviciosPopulares.map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de barras */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            📊 Popularidad de Servicios
          </h3>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={serviciosPopulares}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="servicio" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#00C49F" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
