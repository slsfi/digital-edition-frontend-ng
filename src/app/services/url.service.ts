import { Injectable } from '@angular/core';
import JsonURL from '@jsonurl/jsonurl';

import { PlainObject } from '@models/plain-object.model';


@Injectable({
  providedIn: 'root',
})
export class UrlService {
  constructor() { }

  parse(text: string, impliedArray: boolean = false): any {
    const JsonURLParsed = JsonURL.parse(text, {
      AQF: true,
      ...(impliedArray && { impliedArray: [] })
    });

    const custom = this.fromJsonUrl(text, impliedArray);

    console.log('Parse Json url: ', JsonURLParsed);
    console.log('Parse custom  : ', custom);

    return JsonURLParsed;
  }

  /**
   * Converts value to a string that can be used in URLs.
   * Value can be a simple array, a simple object or an array of simple objects.
   * Nested arrays and objects are not supported.
   * The syntax of the stringified value is the same as in 
   * https://github.com/jsonurl/jsonurl-js
   * @param value 
   * @param impliedArray 
   * @returns 
   */
  stringify(value: any, impliedArray: boolean = false): string | undefined {
    const JsonURLStringified = JsonURL.stringify(value, {
      AQF: true,
      ...(impliedArray && { impliedArray: true })
    });

    // Custom stringifier
    /*
    let stringified = undefined;
    const isArray = Array.isArray(value);
    const isObj = !isArray && typeof value === 'object' && value !== null;

    if (isArray) {

    } else if (isObj) {

    } else {
      stringified = String(value);
    }
    */

    const custom = this.toJsonUrl(value, impliedArray);

    console.log('Json url: ', JsonURLStringified);
    console.log('custom  : ', custom);

    return JsonURLStringified;
  }


  // Check if a value is a plain object (not an array or null)
  isPlainObject(obj: any): obj is PlainObject {
      return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
  }

  encodeString(value: string): string {
    // Manually encode characters as per specification
    let encodedValue = '';
    for (const char of value) {
        switch (char) {
            case '!': encodedValue += '!!'; break;
            case '&': encodedValue += '%26'; break;
            case '=': encodedValue += '%3D'; break;
            case ':': encodedValue += '!:'; break;
            case '+': encodedValue += '%2B'; break;
            case '/': encodedValue += '%2F'; break;
            case ' ': encodedValue += '+'; break; // Replace space with plus
            default: encodedValue += /^[0-9a-zA-Z\-_.~]$/.test(char) ? char : encodeURIComponent(char);
        }
    }

    // Special handling for strings that are exactly "false", "null", or "true"
    if (['false', 'null', 'true'].includes(encodedValue)) {
        encodedValue = '!' + encodedValue;
    }

    // Escape leading digit or dash
    if (/^[0-9\-]/.test(encodedValue)) {
        encodedValue = '!' + encodedValue;
    }

    // Represent empty string as !e
    if (encodedValue === '') {
        return '!e';
    }

    return encodedValue;
  }

  encodeValue(value: boolean | number | string | null): string {
    if (value === null) {
        return 'null';
    }
    if (typeof value === 'string') {
        return this.encodeString(value);
    }
    return encodeURIComponent(value.toString());
  }

  // Encode an array into a string
  encodeArray(arr: Array<any>): string {
      return arr.map(item => this.toJsonUrl(item)).join(','); // Recursively encode each item
  }

  // Encode an object into a string
  encodeObject(obj: PlainObject): string {
      let encoded = Object.entries(obj).map(([key, value]) => {
          // Encode each key-value pair
          return `${this.encodeValue(key)}:${this.toJsonUrl(value)}`;
      }).join(',');
      return `(${encoded})`; // Wrap the encoded object in parentheses
  }

  // Convert a value to a JSON URL string
  toJsonUrl(value: any, impliedArray: boolean = false): string {
      if (value === null) {
          return 'null'; // Handle null separately
      }
      if (Array.isArray(value)) {
          return impliedArray ? this.encodeArray(value) : `(${this.encodeArray(value)})`; // Encode arrays
      } else if (this.isPlainObject(value)) {
          return this.encodeObject(value); // Encode objects
      } else {
          return this.encodeValue(value); // Encode other primitives
      }
  }

  decodeStringOLD(value: string): string {
    // Handle the representation of an empty string
    if (value === '!e') {
        return ''; // Decode empty string
    }

    // Handle escaped patterns
    value = value.replace(/!!/g, '!') // Unescape exclamation point
                 .replace(/!:/g, ':'); // Unescape colon

    // Replace plus with space after handling escaped patterns
    value = value.replace(/\+/g, ' ');

    // Decode percent-encoded characters
    return decodeURIComponent(value);
  }

  decodeString(value: string): string {
    // Handle the representation of an empty string
    if (value === '!e') {
        return ''; // Decode empty string
    }

    // Handle escaped patterns and percent-encoded characters
    let decodedValue = '';
    for (let i = 0; i < value.length; i++) {
        if (value[i] === '!') {
            if (value[i + 1] === ':') {
                decodedValue += ':'; // Decode escaped colon
                i++; // Skip next character
            } else {
                decodedValue += value[i + 1]; // Unescape character
                i++; // Skip next character
            }
        } else if (value[i] === '+') {
            decodedValue += ' '; // Replace plus with space
        } else if (value[i] === '%' && i + 2 < value.length) {
            // Decode percent-encoded sequences
            const percentEncoded = value.substr(i, 3);
            decodedValue += decodeURIComponent(percentEncoded);
            i += 2; // Skip next two characters
        } else {
            decodedValue += value[i]; // Regular character
        }
    }

    return decodedValue;
  }

  decodeValue(value: string): any {
    if (value === 'null') {
        return null;
    }
    if (value === 'true') {
        return true;
    }
    if (value === 'false') {
        return false;
    }
    if (value.startsWith('!')) {
        return this.decodeString(value);
    }
    let num = Number(decodeURIComponent(value));
    return isNaN(num) ? decodeURIComponent(value) : num;
  }

  // Decode an array from a string
  decodeArray(arrStr: string): Array<any> {
    return arrStr.slice(1, -1).split(',').map(item => this.fromJsonUrl(item)); // Recursively decode each item
  }

  // Decode an object from a string
  decodeObject(objStr: string): PlainObject {
    let obj: PlainObject = {};
    objStr.slice(1, -1).split(',').forEach(pair => {
        let [key, value] = pair.split(':');
        // Decode each key-value pair
        obj[this.decodeValue(key)] = this.fromJsonUrl(value);
    });
    return obj; // Return the decoded object
  }

  splitByTopLevelComma(str: string): string[] {
    const elements = [];
    let bracketCount = 0;
    let start = 0;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '(') bracketCount++;
        if (char === ')') bracketCount--;
        if (char === ',' && bracketCount === 0) {
            elements.push(str.substring(start, i));
            start = i + 1;
        }
    }
    elements.push(str.substring(start));
    return elements;
  }

  isObjectContent(content: string): boolean {
    return content.includes(':') && !content.startsWith('(');
  }

  fromJsonUrl(value: string, impliedArray: boolean = false): any {
    if (impliedArray) {
      value = `(${value})`;
      console.log(value);
    }
    
    // Handle the representation of an empty string
    if (value === '!e') {
        return '';
    }

    // Decode arrays and objects
    if (value.startsWith('(') && value.endsWith(')')) {
        const content = value.slice(1, -1);

        // Decode as an array or object based on the content
        if (this.isObjectContent(content)) {
            // Decode as an object
            const obj: any = {};
            const pairs = this.splitByTopLevelComma(content);
            for (const pair of pairs) {
                const [key, val] = pair.split(':');
                obj[this.decodeString(key)] = this.fromJsonUrl(val);
            }
            return obj;
        } else {
            // Decode as an array
            return this.splitByTopLevelComma(content).map(item => this.fromJsonUrl(item));
        }
    }

    // Decode other values
    return this.decodeString(value);
  }



  /* This works for arrays of objects in collection text, but not in media-collections */
  fromJsonUrlV4(value: string, impliedArray: boolean = false): any {
    if (impliedArray) {
      value = `(${value})`;
      console.log(value);
    }

    // Handle the representation of an empty string
    if (value === '!e') {
        return '';
    }

    // Decode arrays and objects
    if (value.startsWith('(') && value.endsWith(')')) {
        const content = value.slice(1, -1);

        // Check if the content represents an array of objects or a single object
        if (content.startsWith('(')) {
            // Decode as an array of objects or nested arrays
            return this.splitByTopLevelComma(content).map(item => this.fromJsonUrl(item));
        } else {
            // Decode as a single object
            const obj: any = {};
            const pairs = this.splitByTopLevelComma(content);
            for (const pair of pairs) {
                const [key, val] = pair.split(':');
                obj[this.decodeString(key)] = this.fromJsonUrl(val);
            }
            return obj;
        }
    }

    // Decode other values
    return this.decodeString(value);
}


  /* This doesn't work for arrays of objects in collection text, and almost works in media-collections*/
  fromJsonUrlV3(value: string, impliedArray: boolean = false): any {
    if (impliedArray) {
      value = `(${value})`;
      console.log(value);
    }

    // Handle the representation of an empty string
    if (value === '!e') {
        return '';
    }

    // Decode arrays and objects
    if (value.startsWith('(') && value.endsWith(')')) {
        const content = value.slice(1, -1);

        // Check if the content represents an object
        if (content.includes(':')) {
            const obj: any = {};
            const pairs = this.splitByTopLevelComma(content);
            for (const pair of pairs) {
                const [key, val] = pair.split(':');
                obj[this.decodeString(key)] = this.fromJsonUrl(val);
            }
            return obj;
        } else {
            // Decode as an array
            return this.splitByTopLevelComma(content).map(item => this.fromJsonUrl(item));
        }
    }

    // Decode other values
    return this.decodeString(value);
  }



  /* This works for arrays of objects in collection text, but not in media-collections */
  fromJsonUrlV2(value: string, impliedArray: boolean = false): any {
    if (impliedArray) {
      value = `(${value})`;
    }

    // Handle the representation of an empty string
    if (value === '!e') {
        return '';
    }

    // Decode arrays and objects
    if (value.startsWith('(') && value.endsWith(')')) {
        const content = value.slice(1, -1);

        // Check if the content represents an object
        if (content.includes(':') && !content.includes('(')) {
            const obj: any = {};
            const pairs = content.split(',');
            for (const pair of pairs) {
                const [key, val] = pair.split(':');
                obj[this.decodeString(key)] = this.fromJsonUrl(val);
            }
            return obj;
        } else {
            // Decode as an array or nested structure
            const elements = [];
            let bracketCount = 0;
            let start = 0;

            for (let i = 0; i < content.length; i++) {
                const char = content[i];
                if (char === '(') bracketCount++;
                if (char === ')') bracketCount--;
                if (char === ',' && bracketCount === 0) {
                    elements.push(this.fromJsonUrl(content.substring(start, i)));
                    start = i + 1;
                }
            }
            elements.push(this.fromJsonUrl(content.substring(start)));

            return elements;
        }
    }

    // Decode other values
    return this.decodeString(value);
  }


  // Convert a JSON URL string to a value
  fromJsonUrlBASTI(value: string, impliedArray: boolean = false): any {
    if (impliedArray) {
      value = `(${value})`;
    }

    // Handle the representation of an empty string
    if (value === '!e') {
      return '';
    }

    // Decode arrays and objects
    if (value.startsWith('(') && value.endsWith(')')) {
      const content = value.slice(1, -1);
      const contentParts = content.split(',');
      let isObjArray = true;

      contentParts.forEach((part: string) => {
        if (!(part.startsWith('(') && part.endsWith(')'))) {
          isObjArray = false;
        }
      });

      if (isObjArray) {

      } else {
        if (content.includes(':')) {
          // Decode as an object
          const obj: any = {};
          const pairs = content.split(',');
          for (const pair of pairs) {
              const [key, val] = pair.split(':');
              obj[this.decodeString(key)] = this.fromJsonUrl(val);
          }
          return obj;
        } else {
            // Decode as an array
            return content.split(',').map(item => this.fromJsonUrl(item));
        }
      }
    }

    // Decode other values
    return this.decodeString(value);
  }


}
