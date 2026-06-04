import StatsDashboard from "@/components/StatsDashboard";

export default function EstadisticasPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">
        📊 Estadísticas de la Barbería
      </h1>

      <StatsDashboard />
    </div>
  );
}
