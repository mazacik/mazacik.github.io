import { Injectable } from "@angular/core";
import { DocumentData, Firestore, collection, deleteDoc, doc, getDocs, setDoc } from "@angular/fire/firestore";

@Injectable({
  providedIn: 'root',
})
export class FirestoreService {

  // TODO https://firebase.google.com/docs/firestore/query-data/listen

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

  // public write(path: string, data: any): Promise<DocumentReference<any, DocumentData>> {
  //   const docRef = addDoc(collection(this.firestore, path), data);
  //   docRef.then(() => this.cache[path]?.push(data));
  //   return docRef;
  // }

  public write(path: string, documentId: string, data: any): Promise<void> {
    const docRef = setDoc(doc(this.firestore, path, documentId), data);
    docRef.then(() => this.cache[path]?.push(data));
    return docRef;
  }

  public delete(path: string, documentId: string): Promise<void> {
    return deleteDoc(doc(this.firestore, path, documentId));
  }

}
