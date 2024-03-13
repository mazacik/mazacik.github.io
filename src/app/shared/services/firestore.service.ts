import { Injectable } from "@angular/core";
import { DocumentData, DocumentReference, Firestore, addDoc, collection, getDocs } from "@angular/fire/firestore";

@Injectable({
  providedIn: 'root',
})
export class FirestoreService {

  constructor(
    private firestore: Firestore
  ) { }

  public async read(path: string): Promise<DocumentData[]> {
    return (await getDocs(collection(this.firestore, path))).docs.map(doc => doc.data());
  }

  public write(path: string, data: any): Promise<DocumentReference<any, DocumentData>> {
    return addDoc(collection(this.firestore, path), data);
  }

}
