import { Pipe, PipeTransform } from '@angular/core';
@Pipe({name:'value',pure:true})
export class ValuePipe implements PipeTransform {
 transform(value: unknown, limit=70): string { const text=typeof value==='string' ? '"' + value + '"' : JSON.stringify(value) ?? 'undefined'; return text.length>limit ? text.slice(0,limit-1)+'…' : text; }
}

