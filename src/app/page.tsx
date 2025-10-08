"use client";

import { useEffect, useState } from "react";
import { getPostalInfo } from "@/lib/getPostalInfo";
import { PostalData } from "@/types/postal";

export default function Home() {
  const [postalData, setPostalData] = useState<PostalData | null >(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const cp = "28043";
      const result: PostalData[] | null = await getPostalInfo(cp);

      if (result && result.length > 0) {
        setPostalData(result[0]);
      } else {
        setPostalData(null);
      }
      setIsLoading(false);
    }
    fetchData();
  }, []);
  return (
    <main>
      <h1>Prueba de consulta</h1>
      {isLoading && <p>Cargando info del CP</p>}
      {!isLoading && !postalData && <p>No se encuentran datos</p>}
      {!isLoading && postalData && (
        <div>
          <h2> Info encontrada</h2>
		  <p><strong>CP: </strong>
		  {postalData.codigo_postal}
		  </p>
        </div>
      )}
    </main>
  );
}
