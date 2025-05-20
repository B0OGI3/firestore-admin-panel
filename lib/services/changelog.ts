import { db } from "@/lib/firebaseConfig";
import { collection, addDoc, query, orderBy, limit, getDocs, where } from "firebase/firestore";
import type { ChangelogEntry } from "@/types";

export const ChangelogService = {
  /**
   * Add a new changelog entry
   */
  async addEntry(entry: Omit<ChangelogEntry, "id" | "timestamp">): Promise<void> {
    const changelogRef = collection(db, "changelog");
    await addDoc(changelogRef, {
      ...entry,
      timestamp: Date.now(),
    });
  },

  /**
   * Get recent changelog entries
   */
  async getRecentEntries(limitCount = 50): Promise<ChangelogEntry[]> {
    const changelogRef = collection(db, "changelog");
    const q = query(
      changelogRef,
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ChangelogEntry));
  },

  /**
   * Get changelog entries for a specific document
   */
  async getDocumentHistory(collectionName: string, documentId: string): Promise<ChangelogEntry[]> {
    const changelogRef = collection(db, "changelog");
    const q = query(
      changelogRef,
      where("collection", "==", collectionName),
      where("documentId", "==", documentId),
      orderBy("timestamp", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ChangelogEntry));
  }
}; 