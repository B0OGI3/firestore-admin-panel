"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [collections, setCollections] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const ref = doc(db, "config", "collections");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setCollections(data.list || []);
        } else {
          console.warn("No collections document found.");
        }
      } catch (error) {
        console.error("Error fetching collections:", error);
      }
    };

    fetchCollections();
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h2>📂 Firestore Collections</h2>
      {collections.length === 0 ? (
        <p>Loading or no collections found.</p>
      ) : (
        <ul>
          {collections.map((name) => (
            <li key={name}>
              <button
                style={{
                  padding: "0.5rem 1rem",
                  margin: "0.25rem 0",
                  cursor: "pointer",
                  background: "#0000FF",
                  border: "1px solid #ccc",
                  borderRadius: "5px"
                }}
                onClick={() => router.push(`/dashboard/${name}`)}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
