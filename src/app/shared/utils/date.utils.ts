import { TimeUnit } from '../enums/time-unit.enum';

export abstract class DateUtils {

  public static readonly FORMAT_DATE: string = 'dd.MM.yyyy';
  public static readonly FORMAT_TIME: string = 'HH:mm:ss';
  public static readonly FORMAT_DATETIME: string = DateUtils.FORMAT_DATE + ', ' + DateUtils.FORMAT_TIME;

  public static readonly FORMAT_DATE_PLACEHOLDER: any = { day: 'dd', month: 'mm', year: 'yyyy' };

  public static getAsTimer(seconds: number, delimiter: string = ':'): string {
    const years = seconds >= 31104000 ? Math.floor(seconds / 31104000) || 0 : 0;
    seconds -= years * 31104000;
    const months = seconds >= 2592000 ? Math.floor(seconds / 2592000) || 0 : 0;
    seconds -= months * 2592000;
    const days = seconds >= 86400 ? Math.floor(seconds / 86400) || 0 : 0;
    seconds -= days * 86400;
    const hours = seconds >= 3600 ? Math.floor(seconds / 3600) || 0 : 0;
    seconds -= hours * 3600;
    const minutes = seconds >= 60 ? Math.floor(seconds / 60) || 0 : 0;
    seconds -= minutes * 60;
    seconds = Math.floor(seconds);

    return this.prefix(years) + delimiter + this.prefix(months) + delimiter + this.prefix(days) + delimiter + this.prefix(hours) + delimiter + this.prefix(minutes) + delimiter + this.prefix(seconds);
  }

  public static getFull(date: Date = new Date(), delimDate: string = '.', delimSpace: string = ' ', delimTime: string = ':'): string {
    return DateUtils.getDate(date, delimDate) + delimSpace + DateUtils.getTime(date, delimTime);
  }

  public static getDate(date: Date = new Date(), delimiter: string = '.'): string {
    const day = this.get(date, TimeUnit.DAY);
    const month = this.get(date, TimeUnit.MONTH);
    const year = this.get(date, TimeUnit.YEAR);

    return day + delimiter + month + delimiter + year;
  }

  public static getDateReverse(date: Date = new Date(), delimiter: string = '.'): string {
    const day = this.get(date, TimeUnit.DAY);
    const month = this.get(date, TimeUnit.MONTH);
    const year = this.get(date, TimeUnit.YEAR);

    return year + delimiter + month + delimiter + day;
  }

  public static getTime(date: Date = new Date(), delimiter: string = ':'): string {
    const hour = this.get(date, TimeUnit.HOUR);
    const minute = this.get(date, TimeUnit.MINUTE);
    const second = this.get(date, TimeUnit.SECOND);

    return hour + delimiter + minute + delimiter + second;
  }

  public static isDate(date: Date): boolean {
    return date && date instanceof Date && !isNaN(date.getTime());
  }

  public static increase(date: Date, unit: TimeUnit, value: number): Date {
    switch (unit) {
      case TimeUnit.SECOND:
        date.setSeconds(date.getSeconds() + value);
        break;
      case TimeUnit.MINUTE:
        date.setMinutes(date.getMinutes() + value);
        break;
      case TimeUnit.HOUR:
        date.setHours(date.getHours() + value);
        break;
      case TimeUnit.DAY:
        date.setDate(date.getDate() + value);
        break;
      case TimeUnit.MONTH:
        date.setMonth(date.getMonth() + value);
        break;
      case TimeUnit.YEAR:
        date.setFullYear(date.getFullYear() + value);
        break;
    }

    return date;
  }

  public static decrease(date: Date, unit: TimeUnit, value: number): Date {
    switch (unit) {
      case TimeUnit.SECOND:
        date.setSeconds(date.getSeconds() - value);
        break;
      case TimeUnit.MINUTE:
        date.setMinutes(date.getMinutes() - value);
        break;
      case TimeUnit.HOUR:
        date.setHours(date.getHours() - value);
        break;
      case TimeUnit.DAY:
        date.setDate(date.getDate() - value);
        break;
      case TimeUnit.MONTH:
        date.setMonth(date.getMonth() - value);
        break;
      case TimeUnit.YEAR:
        date.setFullYear(date.getFullYear() - value);
        break;
    }

    return date;
  }

  public static getDifference(date1: Date, date2: Date): number {
    if (this.isDate(date1) && this.isDate(date2)) {
      return Math.abs(date1.getTime() - date2.getTime());
    }

    return 0;
  }

  public static get(date: Date, unit: TimeUnit): string {
    switch (unit) {
      case TimeUnit.SECOND:
        return this.prefix(date.getSeconds());
      case TimeUnit.MINUTE:
        return this.prefix(date.getMinutes());
      case TimeUnit.HOUR:
        return this.prefix(date.getHours());
      case TimeUnit.DAY:
        return this.prefix(date.getDate());
      case TimeUnit.MONTH:
        return this.prefix(date.getMonth() + 1);
      case TimeUnit.YEAR:
        return this.prefix(date.getFullYear());
    }
  }

  private static prefix(number: number = 0): string {
    return number <= 9 ? '0' + number : '' + number;
  }

}