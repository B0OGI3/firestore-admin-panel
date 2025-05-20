import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

export function useAppTitle() {
  const [title, setTitle] = useState("Firestore Admin Panel");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTitle = async () => {
      try {
        const docRef = doc(db, "app_config", "global");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().appTitle) {
          setTitle(docSnap.data().appTitle);
        }
      } catch (error) {
        console.error("Error loading app title:", error);
      } finally {
        setLoading(false);
      }
    };

    void loadTitle();
  }, []);

  const updateTitle = async (newTitle: string) => {
    try {
      await setDoc(doc(db, "app_config", "global"), {
        appTitle: newTitle
      }, { merge: true });
      setTitle(newTitle);
      return true;
    } catch (error) {
      console.error("Error updating app title:", error);
      return false;
    }
  };

  return { title, loading, updateTitle };
} 