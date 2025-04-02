import { Injectable } from "@angular/core";
import { DocumentData, Firestore, collection, deleteDoc, doc, getDocs, setDoc } from "@angular/fire/firestore";

@Injectable({
  providedIn: 'root',
})
export class FirestoreService {

  // https://firebase.google.com/docs/firestore/query-data/listen

  private cache: { [key: string]: DocumentData[] } = {};

  constructor(
    private firestore: Firestore
  ) { }

  public async read(path: string, useCache?: boolean): Promise<DocumentData[]> {
    if (useCache && this.cache[path]) {
      return this.cache[path];
    }

    this.cache[path] = (await getDocs(collection(this.firestore, path))).docs.map(doc => doc.data());
    return this.cache[path];
  }

  public write(path: string, documentId: string, data: any): Promise<void> {
    return setDoc(doc(this.firestore, path, documentId), data);
  }

  public delete(path: string, documentId: string): Promise<void> {
    return deleteDoc(doc(this.firestore, path, documentId));
  }

}
