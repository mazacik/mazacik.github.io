import { Injectable } from "@angular/core";
import { Event } from "../models/event.interface";

@Injectable({
  providedIn: 'root',
})
export class EventManagerService {

  public event: Event;

}
