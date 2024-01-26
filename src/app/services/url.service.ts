import { Injectable } from '@angular/core';
import JsonURL from '@jsonurl/jsonurl';

import { PlainObject } from '@models/plain-object.model';


@Injectable({
  providedIn: 'root',
})
export class UrlService {
  constructor() { }

  parse(text: string, impliedArray: boolean = false): any {
    if (impliedArray) {
      console.log('string to parse: ', `(${text})`);
    } else {
      console.log('string to parse: ', text);
    }
    const JsonURLParsed = JsonURL.parse(text, {
      AQF: true,
      ...(impliedArray && { impliedArray: [] })
    });

    console.log('Parse Json url: ', JsonURLParsed);

    try {
      const custom = this.fromJsonUrl(text, impliedArray);
      console.log('Parse custom  : ', custom);
    } catch (e) {
      console.error(e);
    }

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

    const custom = this.toJsonUrl(value, impliedArray);

    console.log('Json url: ', JsonURLStringified);
    console.log('custom  : ', custom);

    return JsonURLStringified;
  }


  // Check if a value is a plain object (not an array or null)
  private isPlainObject(obj: any): obj is PlainObject {
      return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
  }

  private encodeString(value: string): string {
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
            case '(': encodedValue += '%28'; break; // Percent-encode left parenthesis
            case ')': encodedValue += '%29'; break; // Percent-encode right parenthesis
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


  private encodeValue(value: boolean | number | string | null): string {
    if (value === null) {
        return 'null';
    }
    if (typeof value === 'string') {
        return this.encodeString(value);
    }
    return encodeURIComponent(value.toString());
  }

  // Encode an array into a string
  private encodeArray(arr: Array<any>): string {
      return arr.map(item => this.toJsonUrl(item)).join(','); // Recursively encode each item
  }

  // Encode an object into a string
  private encodeObject(obj: PlainObject): string {
      let encoded = Object.entries(obj).map(([key, value]) => {
          // Encode each key-value pair
          return `${this.encodeValue(key)}:${this.toJsonUrl(value)}`;
      }).join(',');
      return `(${encoded})`; // Wrap the encoded object in parentheses
  }

  // Convert a value to a JSON URL string
  private toJsonUrl(value: any, impliedArray: boolean = false): string {
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

  private decodeString(value: string): any {
    // Handle the representation of an empty string
    if (value === '!e') {
        return ''; // Decode empty string
    }

    // Handle escaped patterns and percent-encoded characters
    let decodedValue = '';
    let i = 0;
    while (i < value.length) {
        if (value[i] === '!') {
            if (value[i + 1] === ':') {
                decodedValue += ':'; // Decode escaped colon
                i += 2; // Skip next character
            } else {
                decodedValue += value[i + 1]; // Unescape character
                i += 2; // Skip next character
            }
        } else if (value[i] === '+') {
            decodedValue += ' '; // Replace plus with space
            i++;
        } else if (value[i] === '%') {
            // Attempt to decode percent-encoded sequences
            let end = i;
            while (end < value.length && value[end] === '%') {
                end += 3; // Move to the end of the percent-encoded sequence
            }
            const percentEncoded = value.substring(i, end);
            try {
                decodedValue += decodeURIComponent(percentEncoded);
                i = end; // Update the index to the end of the percent-encoded sequence
            } catch (e) {
                console.log('decoding failed for', value);
                // If decoding fails, add the original sequence and continue
                decodedValue += percentEncoded;
                i = end; // Update the index to the end of the percent-encoded sequence
            }
        } else {
            decodedValue += value[i]; // Regular character
            i++;
        }
    }

    // Convert to number if it's a valid numeric string
    const numberValue = Number(decodedValue);
    return isNaN(numberValue) || decodedValue.includes(':') || decodedValue.includes('!') ? decodedValue : numberValue;
  }

  private splitByTopLevelComma(str: string): string[] {
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

  private isObjectContent(content: string): boolean {
    return content.includes(':') && !content.startsWith('(');
  }

  private fromJsonUrl(value: string, impliedArray: boolean = false): any {
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

        // Check if the content represents an array
        if (!this.isObjectContent(content)) {
            // Decode as an array
            return this.splitByTopLevelComma(content).map(item => this.fromJsonUrl(item));
        }

        // Decode as an object
        const obj: any = {};
        const pairs = this.splitByTopLevelComma(content);
        for (const pair of pairs) {
            const [key, val] = pair.split(/:(.+)/); // Split at the first colon only
            obj[this.decodeString(key)] = this.fromJsonUrl(val);
        }
        return obj;
    }

    // Decode other values
    return this.decodeString(value);
  }




  /*
  // Working for all cases except objects with nested objects
  private fromJsonUrlPREVWORKING(value: string, impliedArray: boolean = false): any {
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



  private decodeValue(value: string): any {
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
  private decodeArray(arrStr: string): Array<any> {
    return arrStr.slice(1, -1).split(',').map(item => this.fromJsonUrl(item)); // Recursively decode each item
  }

  // Decode an object from a string
  private decodeObject(objStr: string): PlainObject {
    let obj: PlainObject = {};
    objStr.slice(1, -1).split(',').forEach(pair => {
        let [key, value] = pair.split(':');
        // Decode each key-value pair
        obj[this.decodeValue(key)] = this.fromJsonUrl(value);
    });
    return obj; // Return the decoded object
  }

  private decodeStringOLD(value: string): string {
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

  // This works for arrays of objects in collection text, but not in media-collections
  private fromJsonUrlV4(value: string, impliedArray: boolean = false): any {
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


  // This doesn't work for arrays of objects in collection text, and almost works in media-collections
  private fromJsonUrlV3(value: string, impliedArray: boolean = false): any {
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



  // This works for arrays of objects in collection text, but not in media-collections
  private fromJsonUrlV2(value: string, impliedArray: boolean = false): any {
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
  private fromJsonUrlBASTI(value: string, impliedArray: boolean = false): any {
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
  */

}
