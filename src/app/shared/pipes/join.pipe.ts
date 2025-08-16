import { Pipe, PipeTransform } from '@angular/core';
import { ArrayUtils } from '../utils/array.utils';

@Pipe({ name: 'join', standalone: true })
export class JoinPipe implements PipeTransform {
  transform(array: any[], property?: string, separator: string = ', '): string {
    if (!ArrayUtils.isEmpty(array)) {
      if (property) {
        return array.map(object => object[property]).join(separator);
      } else {
        return array.join(separator);
      }
    }

    return '';
  }
}